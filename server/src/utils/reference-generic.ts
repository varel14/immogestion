/**
 * Génère une référence unique au format PREFIX-<année>-NNNN.
 * Le prédicat `exists` permet de vérifier l'unicité sur le modèle concerné
 * (vente, contrat, paiement, quittance...). Le premier créneau libre est
 * retenu ; en cas de course concurrente, la contrainte unique de la base
 * reste le garant final.
 */
export async function generateUniqueReference(
  prefix: string,
  exists: (reference: string) => Promise<boolean>,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefixed = `${prefix}-${year}-`;

  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = `${prefixed}${String(attempt + 1).padStart(4, '0')}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  return `${prefixed}${Date.now()}`;
}
