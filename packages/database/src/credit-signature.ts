/**
 * Credit Signature — HMAC-based tamper detection for tenant AI credits.
 *
 * When Super Admin assigns credits, we compute:
 *   HMAC-SHA256(secret, tenantId|totalCredits|bonusCredits|expiresAt)
 * and store it in the tenant DB alongside the credits.
 *
 * Before every AI call, the credit-gate verifies the signature.
 * If a tenant modifies their own credits via direct SQL, the signature
 * won't match and the AI call is rejected with 403.
 */

import { createHmac } from 'crypto';

// Secret key — loaded from env. Must be set in all services.
function getSecret(): string {
  const secret = process.env.CREDIT_SIGNATURE_SECRET;
  if (!secret) {
    throw new Error('CREDIT_SIGNATURE_SECRET env variable is not set. Cannot sign/verify credits.');
  }
  return secret;
}

/**
 * Build the payload string that gets signed.
 * Order matters — must be identical in sign and verify.
 */
function buildPayload(data: {
  tenantId: string;
  totalCredits: number;
  bonusCredits: number;
  expiresAt: string | null;
}): string {
  return `${data.tenantId}|${data.totalCredits}|${data.bonusCredits}|${data.expiresAt || 'null'}`;
}

/**
 * Sign credit data. Called by Super Admin when assigning/modifying credits.
 * Returns the HMAC hex string to store in tenant DB.
 */
export function signCredits(data: {
  tenantId: string;
  totalCredits: number;
  bonusCredits: number;
  expiresAt: string | null;
}): string {
  const payload = buildPayload(data);
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/**
 * Verify credit data. Called before every AI call.
 * Returns true if the signature matches (credits not tampered).
 */
export function verifyCredits(data: {
  tenantId: string;
  totalCredits: number;
  bonusCredits: number;
  expiresAt: string | null;
  creditSignature: string | null;
}): boolean {
  if (!data.creditSignature) {
    // No signature stored — legacy record, allow but log warning
    console.warn(`[credit-signature] No signature for tenant ${data.tenantId}, skipping verification`);
    return true;
  }

  const payload = buildPayload(data);
  const expected = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return expected === data.creditSignature;
}
