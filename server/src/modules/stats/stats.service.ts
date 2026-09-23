import { prisma } from '../../lib/prisma.js';
import { toPlainProperty } from '../../utils/serializers.js';

/**
 * Statistiques du tableau de bord — uniquement des données réelles
 * (aucune donnée fictive) couvrant la Phase 1, 2 et 3.
 */
export async function getDashboardStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const notArchived = { isArchived: false };
  const activeReservation = { status: { in: ['ACTIVE', 'CONFIRMED'] } };

  const [
    totalProperties,
    availableProperties,
    reservedProperties,
    soldProperties,
    rentedProperties,
    forSaleCount,
    forRentCount,
    ownersCount,
    activeClientsCount,
    totalClientsCount,
    visitsScheduled,
    visitsToday,
    pendingRequests,
    salesInProgress,
    salesFinalized,
    activeContracts,
    rentsExpectedThisMonth,
    rentsCollectedThisMonth,
    overdueInvoices,
    recentProperties,
    upcomingVisits,
  ] = await Promise.all([
    prisma.property.count({ where: notArchived }),
    prisma.property.count({ where: { ...notArchived, status: 'AVAILABLE' } }),
    prisma.property.count({ where: { ...notArchived, status: 'RESERVED' } }),
    prisma.property.count({ where: { status: 'SOLD' } }),
    prisma.property.count({ where: { status: 'RENTED' } }),
    prisma.property.count({ where: { ...notArchived, transactionType: { in: ['SALE', 'SALE_AND_RENT'] } } }),
    prisma.property.count({ where: { ...notArchived, transactionType: { in: ['RENT', 'SALE_AND_RENT'] } } }),
    prisma.owner.count(),
    prisma.client.count({ where: { isActive: true } }),
    prisma.client.count(),
    prisma.visit.count({ where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] } } }),
    prisma.visit.count({ where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] }, scheduledAt: { gte: startOfToday, lt: endOfToday } } }),
    prisma.propertyRequest.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
    prisma.sale.count({ where: { status: { in: ['PREPARATION', 'IN_PROGRESS'] } } }),
    prisma.sale.count({ where: { status: 'FINALIZED' } }),
    prisma.rentalContract.count({ where: { status: 'ACTIVE' } }),
    prisma.rentInvoice.aggregate({
      where: { dueDate: { gte: startOfMonth, lt: endOfMonth } },
      _sum: { expectedAmount: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'CONFIRMED', paymentType: 'RENT', paymentDate: { gte: startOfMonth, lt: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.rentInvoice.aggregate({
      where: { status: 'OVERDUE' },
      _sum: { expectedAmount: true, paidAmount: true },
      _count: true,
    }),
    prisma.property.findMany({
      where: notArchived,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        media: { where: { kind: 'PHOTO', isPrimary: true }, take: 1, select: { url: true } },
      },
    }),
    prisma.visit.findMany({
      where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] }, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
      include: {
        property: { select: { id: true, reference: true, title: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  const overdueExpected = overdueInvoices._sum.expectedAmount === null ? 0 : Number(overdueInvoices._sum.expectedAmount);
  const overduePaid = overdueInvoices._sum.paidAmount === null ? 0 : Number(overdueInvoices._sum.paidAmount);

  return {
    // Phase 1
    totalProperties,
    availableProperties,
    reservedProperties,
    forSaleCount,
    forRentCount,
    ownersCount,
    activeClientsCount,
    totalClientsCount,
    recentProperties: recentProperties.map((p) => {
      const { media, ...rest } = p;
      return { ...toPlainProperty(rest), primaryPhotoUrl: media[0]?.url ?? null };
    }),
    // Phase 2
    visitsScheduled,
    visitsToday,
    pendingRequests,
    upcomingVisits: upcomingVisits.map((visit) => ({
      id: visit.id,
      scheduledAt: visit.scheduledAt,
      status: visit.status,
      property: visit.property,
      client: visit.client,
      agent: visit.agent,
    })),
    // Phase 3
    soldProperties,
    rentedProperties,
    salesInProgress,
    salesFinalized,
    activeContracts,
    rentsExpectedThisMonth: Number(rentsExpectedThisMonth._sum?.expectedAmount ?? 0),
    rentsCollectedThisMonth: Number(rentsCollectedThisMonth._sum?.amount ?? 0),
    overdueInvoicesCount: overdueInvoices._count,
    overdueAmount: overdueExpected - overduePaid,
  };
}
