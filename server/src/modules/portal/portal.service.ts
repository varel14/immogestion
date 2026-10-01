import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound, unauthorized } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { money } from '../../utils/serializers.js';
import { authenticateClient, type ClientRequest } from './portal.middleware.js';
import type {
  ListListingsQuery, PortalLoginInput, PortalProfileInput, PortalRegisterInput, VisitRequestInput,
} from './portal.validators.js';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours

/** Types de biens proposés à la location sur le portail public. */
const RENTAL_TRANSACTION_TYPES: Prisma.EnumTransactionTypeFilter['in'] = ['RENT', 'SALE_AND_RENT'];

const photosSelect = {
  where: { kind: 'PHOTO' as const },
  orderBy: [
    { isPrimary: 'desc' },
    { createdAt: 'asc' },
  ] as Prisma.PropertyMediaOrderByWithRelationInput[],
  select: { id: true, url: true, isPrimary: true },
};

/** Annonce publique : uniquement les champs utiles au grand visiteur. */
function toListing<T extends {
  id: string; reference: string; title: string; description: string | null;
  propertyType: string; rentPrice: Prisma.Decimal | null; address: string | null;
  city: string | null; district: string | null; surfaceArea: number | null;
  bedrooms: number | null; bathrooms: number | null; createdAt: Date;
  media: { id: string; url: string; isPrimary: boolean }[];
}>(property: T) {
  return {
    id: property.id,
    reference: property.reference,
    title: property.title,
    description: property.description,
    propertyType: property.propertyType,
    rentPrice: money(property.rentPrice),
    address: property.address,
    city: property.city,
    district: property.district,
    surfaceArea: property.surfaceArea,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    createdAt: property.createdAt,
    photos: property.media,
  };
}

// ─── Annonces publiques ──────────────────────────────────────────────────────

function listingsWhere(query: ListListingsQuery): Prisma.PropertyWhereInput {
  return {
    transactionType: { in: RENTAL_TRANSACTION_TYPES },
    status: 'AVAILABLE',
    isArchived: false,
    rentPrice: { not: null },
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { description: { contains: query.q, mode: 'insensitive' } },
            { city: { contains: query.q, mode: 'insensitive' } },
            { district: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
    ...(query.type ? { propertyType: query.type } : {}),
    ...(query.minBedrooms !== undefined ? { bedrooms: { gte: query.minBedrooms } } : {}),
    ...(query.maxRent !== undefined ? { rentPrice: { lte: query.maxRent } } : {}),
  };
}

/** GET /api/portal/listings — annonces de location disponibles, paginées. */
export async function listListings(query: ListListingsQuery) {
  const pagination = parsePagination(query);
  const where = listingsWhere(query);

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true, reference: true, title: true, description: true, propertyType: true,
        rentPrice: true, address: true, city: true, district: true, surfaceArea: true,
        bedrooms: true, bathrooms: true, createdAt: true,
        media: photosSelect,
      },
    }),
  ]);

  return { data: properties.map(toListing), pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize) };
}

/** GET /api/portal/listings/:id — fiche détaillée d'une annonce disponible. */
export async function getListing(id: string) {
  const property = await prisma.property.findFirst({
    where: {
      id,
      transactionType: { in: RENTAL_TRANSACTION_TYPES },
      status: 'AVAILABLE',
      isArchived: false,
    },
    select: {
      id: true, reference: true, title: true, description: true, propertyType: true,
      rentPrice: true, address: true, city: true, district: true, surfaceArea: true,
      bedrooms: true, bathrooms: true, createdAt: true,
      media: photosSelect,
    },
  });
  if (!property) {
    throw notFound("Cette annonce n'est pas disponible.");
  }
  return toListing(property);
}

async function assertRentableProperty(propertyId: string) {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      transactionType: { in: RENTAL_TRANSACTION_TYPES },
      status: 'AVAILABLE',
      isArchived: false,
    },
    select: { id: true },
  });
  if (!property) {
    throw badRequest("Ce bien n'est pas disponible à la location.");
  }
}

/** Recherche la fiche client par email, ou la crée pour un visiteur inconnu. */
async function findOrCreateClient(input: Pick<VisitRequestInput, 'firstName' | 'lastName' | 'email' | 'phone'>) {
  const existing = await prisma.client.findFirst({ where: { email: input.email } });
  if (existing) return existing;
  return prisma.client.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
    },
  });
}

// ─── Demandes de visite publiques ────────────────────────────────────────────

/** POST /api/portal/visit-requests — demande de visite depuis une annonce. */
export async function createVisitRequest(input: VisitRequestInput) {
  await assertRentableProperty(input.propertyId);

  const scheduledAt = new Date(`${input.preferredDate}T${input.preferredTime}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw badRequest('Date ou heure de visite invalide.');
  }
  if (scheduledAt.getTime() < Date.now()) {
    throw badRequest('La date de visite doit être dans le futur.');
  }

  const client = await findOrCreateClient(input);

  // L'intérêt location alimente directement le pipeline commercial de l'agence.
  const interest = await prisma.clientInterest.upsert({
    where: {
      clientId_propertyId_transactionType: {
        clientId: client.id,
        propertyId: input.propertyId,
        transactionType: 'RENT',
      },
    },
    update: {},
    create: {
      clientId: client.id,
      propertyId: input.propertyId,
      transactionType: 'RENT',
      status: 'NEW',
      notes: 'Demande créée depuis le portail en ligne.',
    },
  });

  const visit = await prisma.visit.create({
    data: {
      propertyId: input.propertyId,
      clientId: client.id,
      agentId: null,
      interestId: interest.id,
      scheduledAt,
      status: 'SCHEDULED',
      notes: input.message ?? 'Demande de visite effectuée depuis le portail en ligne.',
    },
    include: {
      property: { select: { id: true, reference: true, title: true, city: true } },
    },
  });

  return {
    visit: {
      id: visit.id,
      scheduledAt: visit.scheduledAt,
      status: visit.status,
      property: visit.property,
    },
    client: { firstName: client.firstName, lastName: client.lastName, email: client.email },
  };
}

// ─── Comptes du portail ──────────────────────────────────────────────────────

function signClientToken(clientId: string): string {
  return jwt.sign({ sub: clientId, scope: 'client' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

function toPublicClient(client: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null }) {
  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
  };
}

/** POST /api/portal/auth/register — création de compte ou adoption d'une fiche existante. */
export async function registerClient(input: PortalRegisterInput) {
  const existing = await prisma.client.findFirst({ where: { email: input.email } });

  if (existing?.passwordHash) {
    throw conflict('Un compte existe déjà avec cette adresse email. Connectez-vous.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  // Fiche déjà connue de l'agence (créée via une visite ou un dossier) :
  // on l'active pour le portail sans écraser les informations de l'agence.
  const client = existing
    ? await prisma.client.update({
        where: { id: existing.id },
        data: { passwordHash, phone: existing.phone ?? input.phone },
      })
    : await prisma.client.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          passwordHash,
        },
      });

  return {
    token: signClientToken(client.id),
    expiresIn: TOKEN_TTL_SECONDS,
    client: toPublicClient(client),
  };
}

/** POST /api/portal/auth/login — connexion d'un client au portail. */
export async function loginClient(input: PortalLoginInput) {
  const client = await prisma.client.findFirst({ where: { email: input.email } });

  // Message volontairement générique pour ne pas révéler si l'email existe.
  if (!client || !client.passwordHash || !(await bcrypt.compare(input.password, client.passwordHash))) {
    throw unauthorized('Email ou mot de passe incorrect.');
  }
  if (!client.isActive) {
    throw unauthorized('Votre compte est désactivé. Contactez l\'agence.');
  }

  return {
    token: signClientToken(client.id),
    expiresIn: TOKEN_TTL_SECONDS,
    client: toPublicClient(client),
  };
}

/** GET /api/portal/me — profil du client connecté. */
export function getPortalProfile(req: ClientRequest) {
  return toPublicClient(req.client as { id: string; firstName: string; lastName: string; email: string; phone: string | null });
}

/** PUT /api/portal/me — mise à jour du profil par le client. */
export async function updatePortalProfile(req: ClientRequest, input: PortalProfileInput) {
  const client = await prisma.client.update({
    where: { id: req.client.id },
    data: { firstName: input.firstName, lastName: input.lastName, phone: input.phone },
  });
  return toPublicClient(client);
}

// ─── Espace client : visites ─────────────────────────────────────────────────

const myVisitInclude = {
  property: {
    select: {
      id: true, reference: true, title: true, city: true, district: true, propertyType: true,
      media: photosSelect,
    },
  },
  agent: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.VisitInclude;

/** GET /api/portal/my/visits — toutes les visites du client connecté. */
export async function getMyVisits(req: ClientRequest) {
  const visits = await prisma.visit.findMany({
    where: { clientId: req.client.id },
    orderBy: [{ scheduledAt: 'desc' }],
    include: myVisitInclude,
  });
  return visits.map((visit) => ({
    id: visit.id,
    scheduledAt: visit.scheduledAt,
    status: visit.status,
    notes: visit.notes,
    agent: visit.agent ? { firstName: visit.agent.firstName, lastName: visit.agent.lastName } : null,
    property: {
      id: visit.property.id,
      title: visit.property.title,
      city: visit.property.city,
      district: visit.property.district,
      propertyType: visit.property.propertyType,
      photoUrl: visit.property.media[0]?.url ?? null,
    },
  }));
}

/** PATCH /api/portal/my/visits/:id/cancel — annulation d'une visite à venir. */
export async function cancelMyVisit(req: ClientRequest, visitId: string) {
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.clientId !== req.client.id) {
    throw notFound('Visite introuvable.');
  }
  if (!['SCHEDULED', 'RESCHEDULED'].includes(visit.status)) {
    throw badRequest('Seule une visite à venir peut être annulée.');
  }

  const updated = await prisma.visit.update({
    where: { id: visit.id },
    data: { status: 'CANCELLED' },
  });

  await prisma.auditLog.create({
    data: {
      userId: null,
      userName: `Portail — ${req.client.firstName} ${req.client.lastName}`,
      action: 'CANCEL',
      entityType: 'Visit',
      entityId: visit.id,
      details: 'Visite annulée par le client depuis le portail en ligne',
    },
  });

  return { id: updated.id, status: updated.status };
}

// ─── Espace client : logement loué ───────────────────────────────────────────

/** GET /api/portal/my/lease — bail du client (actif en priorité, sinon le plus récent). */
export async function getMyLease(req: ClientRequest) {
  const contract = await prisma.rentalContract.findFirst({
    where: { tenantId: req.client.id },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    include: {
      property: {
        select: {
          id: true, reference: true, title: true, description: true, propertyType: true,
          address: true, city: true, district: true, surfaceArea: true, bedrooms: true,
          bathrooms: true, status: true,
          media: photosSelect,
        },
      },
      owner: { select: { firstName: true, lastName: true, phone: true, email: true } },
      invoices: {
        orderBy: [{ dueDate: 'desc' }],
        take: 12,
        select: {
          id: true, dueDate: true, expectedAmount: true, paidAmount: true, status: true,
          receipt: { select: { reference: true, issuedAt: true } },
        },
      },
    },
  });

  if (!contract) {
    return null;
  }

  return {
    id: contract.id,
    reference: contract.reference,
    status: contract.status,
    startDate: contract.startDate,
    endDate: contract.endDate,
    monthlyRent: money(contract.monthlyRent),
    depositAmount: money(contract.depositAmount),
    paymentDay: contract.paymentDay,
    signedAt: contract.signedAt,
    owner: contract.owner,
    property: {
      id: contract.property.id,
      reference: contract.property.reference,
      title: contract.property.title,
      description: contract.property.description,
      propertyType: contract.property.propertyType,
      address: contract.property.address,
      city: contract.property.city,
      district: contract.property.district,
      surfaceArea: contract.property.surfaceArea,
      bedrooms: contract.property.bedrooms,
      bathrooms: contract.property.bathrooms,
      status: contract.property.status,
      photos: contract.property.media,
    },
    invoices: contract.invoices.map((invoice) => ({
      id: invoice.id,
      dueDate: invoice.dueDate,
      expectedAmount: money(invoice.expectedAmount),
      paidAmount: money(invoice.paidAmount),
      status: invoice.status,
      receipt: invoice.receipt,
    })),
  };
}

export { authenticateClient };
