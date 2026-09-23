import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { logAudit } from '../../utils/audit.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import type { CreateVisitInput, ListVisitsQuery, UpdateVisitInput } from './visits.validators.js';

const visitInclude = {
  property: { select: { id: true, reference: true, title: true, city: true } },
  client: { select: { id: true, firstName: true, lastName: true, phone: true } },
  agent: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.VisitInclude;

/** Visites à venir : programmées ou reportées. */
export const UPCOMING_VISIT_STATUSES = ['SCHEDULED', 'RESCHEDULED'] as const;

export async function listVisits(query: ListVisitsQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.VisitWhereInput = {
    ...(query.agentId ? { agentId: query.agentId } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? { scheduledAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { property: { title: { contains: query.search, mode: 'insensitive' } } },
            { property: { reference: { contains: query.search, mode: 'insensitive' } } },
            { client: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { client: { lastName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, visits] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      orderBy: [{ scheduledAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: visitInclude,
    }),
  ]);

  return { data: visits, pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize) };
}

export async function getVisitById(id: string) {
  const visit = await prisma.visit.findUnique({ where: { id }, include: visitInclude });
  if (!visit) {
    throw notFound('Visite introuvable.');
  }
  return visit;
}

async function assertParticipants(propertyId: string, clientId: string, agentId: string) {
  const [property, client, agent] = await Promise.all([
    prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } }),
    prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }),
    prisma.user.findFirst({ where: { id: agentId, isActive: true }, select: { id: true } }),
  ]);
  if (!property) throw badRequest('Le bien sélectionné est introuvable.');
  if (!client) throw badRequest('Le client sélectionné est introuvable.');
  if (!agent) throw badRequest("L'agent sélectionné est introuvable ou désactivé.");
}

export async function createVisit(input: Omit<CreateVisitInput, 'scheduledAt'> & { scheduledAt: Date }) {
  await assertParticipants(input.propertyId, input.clientId, input.agentId);

  if (input.interestId) {
    const interest = await prisma.clientInterest.findUnique({ where: { id: input.interestId }, select: { id: true, clientId: true, propertyId: true } });
    if (!interest) throw badRequest("L'intérêt associé est introuvable.");
    if (interest.clientId !== input.clientId || interest.propertyId !== input.propertyId) {
      throw badRequest("L'intérêt associé ne correspond pas au client et au bien de la visite.");
    }
  }

  const visit = await prisma.visit.create({ data: { ...input }, include: visitInclude });

  // L'intérêt lié passe automatiquement en « visite planifiée ».
  if (input.interestId) {
    await prisma.clientInterest.update({ where: { id: input.interestId }, data: { status: 'VISIT_PLANNED' } });
  }

  return visit;
}

export async function updateVisit(id: string, input: Omit<UpdateVisitInput, 'scheduledAt'> & { scheduledAt?: Date }) {
  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit) throw notFound('Visite introuvable.');
  if (visit.status === 'COMPLETED') {
    throw badRequest('Une visite effectuée ne peut plus être modifiée.');
  }

  const propertyId = input.propertyId ?? visit.propertyId;
  const clientId = input.clientId ?? visit.clientId;
  const agentId = input.agentId ?? visit.agentId;
  await assertParticipants(propertyId, clientId, agentId);

  return prisma.visit.update({ where: { id }, data: input, include: visitInclude });
}

/** Report d'une visite : nouvelle date, statut RESCHEDULED. */
export async function rescheduleVisit(req: AuthenticatedRequest, id: string, scheduledAt: Date, notes?: string | null) {
  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit) throw notFound('Visite introuvable.');
  if (visit.status === 'COMPLETED') {
    throw badRequest('Une visite effectuée ne peut pas être reportée.');
  }
  if (visit.status === 'CANCELLED') {
    throw badRequest('Une visite annulée ne peut pas être reportée. Créez une nouvelle visite.');
  }

  const updated = await prisma.visit.update({
    where: { id },
    data: { scheduledAt, status: 'RESCHEDULED', ...(notes !== undefined ? { notes } : {}) },
    include: visitInclude,
  });

  await logAudit(prisma, req, {
    action: 'RESCHEDULE',
    entityType: 'Visit',
    entityId: id,
    details: `Visite reportée au ${scheduledAt.toISOString()}`,
  });
  return updated;
}

/** Changement de statut : effectuée, annulée ou absence du client. */
export async function updateVisitStatus(
  req: AuthenticatedRequest,
  id: string,
  status: 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
  feedback?: string | null,
) {
  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit) throw notFound('Visite introuvable.');
  if (visit.status === 'COMPLETED') {
    throw badRequest('Cette visite est déjà marquée comme effectuée.');
  }
  if (visit.status === 'CANCELLED') {
    throw badRequest('Cette visite est déjà annulée.');
  }

  const updated = await prisma.visit.update({
    where: { id },
    data: { status, ...(feedback !== undefined ? { feedback } : {}) },
    include: visitInclude,
  });

  await logAudit(prisma, req, {
    action: status,
    entityType: 'Visit',
    entityId: id,
    details: `Visite : ${status}${feedback ? ` — ${feedback}` : ''}`,
  });
  return updated;
}

/** Ajout du compte rendu d'agent et des observations du client. */
export async function addVisitFeedback(req: AuthenticatedRequest, id: string, feedback: string, notes?: string | null) {
  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit) throw notFound('Visite introuvable.');

  const updated = await prisma.visit.update({
    where: { id },
    data: { feedback, ...(notes !== undefined ? { notes } : {}) },
    include: visitInclude,
  });

  await logAudit(prisma, req, {
    action: 'FEEDBACK',
    entityType: 'Visit',
    entityId: id,
    details: 'Compte rendu ajouté',
  });
  return updated;
}
