import { prisma } from '../../lib/prisma.js';
import { toPlainProperty } from '../../utils/serializers.js';

/** Statistiques du tableau de bord — uniquement des données existantes en
 *  Phase 1 : aucune donnée de vente ou de revenus n'est simulée. */
export async function getDashboardStats() {
  const notArchived = { isArchived: false };

  const [
    totalProperties,
    availableProperties,
    reservedProperties,
    forSaleCount,
    forRentCount,
    ownersCount,
    activeClientsCount,
    totalClientsCount,
    recentProperties,
  ] = await Promise.all([
    prisma.property.count({ where: notArchived }),
    prisma.property.count({ where: { ...notArchived, status: 'AVAILABLE' } }),
    prisma.property.count({ where: { ...notArchived, status: 'RESERVED' } }),
    prisma.property.count({ where: { ...notArchived, transactionType: { in: ['SALE', 'SALE_AND_RENT'] } } }),
    prisma.property.count({ where: { ...notArchived, transactionType: { in: ['RENT', 'SALE_AND_RENT'] } } }),
    prisma.owner.count(),
    prisma.client.count({ where: { isActive: true } }),
    prisma.client.count(),
    prisma.property.findMany({
      where: notArchived,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        media: { where: { kind: 'PHOTO', isPrimary: true }, take: 1, select: { url: true } },
      },
    }),
  ]);

  return {
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
  };
}
