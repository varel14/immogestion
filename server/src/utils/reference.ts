import { prisma } from '../lib/prisma.js';

/**
 * Génère une référence unique pour un bien, au format BIEN-<année>-<numéro>.
 * Le numéro est le compteur de biens de l'année en cours + 1 ; en cas de
 * collision, un suffixe aléatoire est ajouté (jamais censé arriver en pratique).
 */
export async function generatePropertyReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BIEN-${year}-`;

  const count = await prisma.property.count({
    where: { reference: { startsWith: prefix } },
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${prefix}${String(count + 1 + attempt).padStart(4, '0')}`;
    const exists = await prisma.property.findUnique({ where: { reference: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }

  return `${prefix}${Date.now()}`;
}
