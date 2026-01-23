import * as crypto from 'crypto';

export interface CmiHashParams {
  clientid?: string;
  oid?: string;
  amount?: string;
  okUrl?: string;
  failUrl?: string;
  rnd?: string;
  storetype?: string;
  trantype?: string;
  currency?: string;
  [key: string]: string | undefined;
}

/**
 * Génère un hash CMI strictement conforme.
 *
 * @param params - Paramètres CMI (doivent contenir TOUS les champs requis par hashOrder)
 * @param storeKey - Clé secrète du store CMI
 * @param hashOrder - Ordre des champs pour le hash (depuis CMI_HASH_ORDER)
 * @param algorithm - Algorithme de hash (depuis CMI_HASH_ALGO)
 * @param outputFormat - Format de sortie (depuis CMI_HASH_OUTPUT)
 * @returns Le hash généré
 * @throws Error si un champ requis est manquant ou undefined
 */
export function generateCmiHash(
  params: CmiHashParams,
  storeKey: string,
  hashOrder: string,
  algorithm: string = 'sha512',
  outputFormat: 'base64' | 'hex' = 'base64',
): string {
  // Parse l'ordre des champs
  const fields = hashOrder.split(',').map((f) => f.trim());

  // Valide que TOUS les champs requis sont présents et non-undefined
  for (const field of fields) {
    if (params[field] === undefined || params[field] === null) {
      throw new Error(
        `CMI Hash Error: Le champ requis "${field}" est manquant ou undefined. ` +
          `Champs reçus: ${JSON.stringify(params)}`,
      );
    }
  }

  // Concatène les valeurs dans l'ordre strict + storeKey
  const values = fields.map((field) => params[field]);
  const concatenated = values.join('') + storeKey;

  // Génère le hash
  const hash = crypto.createHash(algorithm).update(concatenated).digest(outputFormat);

  return hash;
}

/**
 * Vérifie le hash reçu du callback CMI.
 *
 * @param receivedHash - Hash reçu dans le callback
 * @param params - Paramètres du callback
 * @param storeKey - Clé secrète du store CMI
 * @param hashOrder - Ordre des champs pour le hash
 * @param algorithm - Algorithme de hash
 * @param outputFormat - Format de sortie
 * @returns true si le hash est valide, false sinon
 */
export function verifyCmiHash(
  receivedHash: string,
  params: CmiHashParams,
  storeKey: string,
  hashOrder: string,
  algorithm: string = 'sha512',
  outputFormat: 'base64' | 'hex' = 'base64',
): boolean {
  try {
    const computedHash = generateCmiHash(params, storeKey, hashOrder, algorithm, outputFormat);
    return receivedHash === computedHash;
  } catch (error) {
    console.error('CMI Hash verification error:', error);
    return false;
  }
}
