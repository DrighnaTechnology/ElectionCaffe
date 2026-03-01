# ElectionCaffe — Remediation Plan

**Date:** 1 March 2026
**Reference:** FULL_AUDIT_INDIAN_COMPLIANCE.md (same folder)

Each item references the audit finding number and provides exact file paths, line numbers, and what to do.

---

## PHASE 1 — MUST FIX BEFORE PRODUCTION (Week 1-2)

These are CRITICAL and HIGH items that can result in prosecution or fines.

---

### R-1: Fix OTP Generation (Audit 2.2)

**File:** `packages/shared/src/utils/index.ts:58-65`

**Current:**
```typescript
otp += digits[Math.floor(Math.random() * digits.length)];
```

**Fix:** Replace `Math.random()` with `crypto.randomInt()`:
```typescript
import crypto from 'crypto';

export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(digits.length)];
  }
  return otp;
}
```

**Why:** `crypto.randomInt()` uses the OS CSPRNG. Available in Node.js 14.10+. Zero breaking changes.

---

### R-2: Add OTP Attempt Limiting (Audit 2.6)

**File:** `services/auth-service/src/controllers/auth.ts`

**Changes needed:**

1. In `forgotPassword()` (~line 617), before creating OTP, check for existing unused OTPs:
   ```typescript
   // Delete any existing unused OTPs for this user (prevent OTP spam)
   await tenantDb.oTP.deleteMany({
     where: { userId: user.id, type: 'password_reset', usedAt: null }
   });
   ```

2. In `verifyOTP()` (~line 684), add attempt tracking:
   - Add `attempts` column to `OTP` model in `tenant/schema.prisma`
   - On wrong OTP: increment attempts, if >= 5, mark OTP as used (invalidated)
   - On correct OTP: proceed normally

3. Rate limit the `/api/auth/forgot-password` endpoint at gateway level to max 3 per hour per mobile number (not just per IP).

**Schema change** (`packages/database/prisma/tenant/schema.prisma`, OTP model):
```prisma
model OTP {
  ...existing fields...
  attempts  Int      @default(0)
}
```

---

### R-3: Add Account Lockout (Audit 2.4)

**File:** `services/auth-service/src/controllers/auth.ts`, `login()` method

**Changes needed:**

1. Add to `User` model in `tenant/schema.prisma`:
   ```prisma
   failedLoginAttempts  Int       @default(0) @map("failed_login_attempts")
   lockedUntil          DateTime? @map("locked_until")
   ```

2. In `login()` (~line 101, after finding user):
   ```typescript
   // Check if account is locked
   if (user.lockedUntil && new Date() < user.lockedUntil) {
     res.status(423).json(errorResponse('E1008', 'Account temporarily locked. Try again later.'));
     return;
   }
   ```

3. On failed password (~line 116-118):
   ```typescript
   const newAttempts = (user.failedLoginAttempts || 0) + 1;
   const lockData: any = { failedLoginAttempts: newAttempts };
   if (newAttempts >= 5) {
     lockData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
   }
   await tenantDb.user.update({ where: { id: user.id }, data: lockData });
   ```

4. On successful login (~line 146):
   ```typescript
   data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null }
   ```

---

### R-4: Standardize Bcrypt Rounds (Audit 2.5)

**Files to change:**
- `services/auth-service/src/controllers/auth.ts:220` — Change `bcrypt.hash(password, 10)` to `bcrypt.hash(password, 12)`
- `services/auth-service/src/controllers/auth.ts:555` — Change `bcrypt.hash(newPassword, 10)` to `bcrypt.hash(newPassword, 12)`
- `services/auth-service/src/controllers/auth.ts:756` — Change `bcrypt.hash(newPassword, 10)` to `bcrypt.hash(newPassword, 12)`

**Better:** Define a constant:
```typescript
const BCRYPT_ROUNDS = 12;
```
Use it everywhere. Already using 12 in `internalResetAdminPassword` and super admin register.

---

### R-5: Encrypt Database Credentials in Core DB (Audit 2.7)

**File:** `packages/database/prisma/core/schema.prisma` — Tenant model fields `databasePassword`, `databaseConnectionUrl`

**Approach:**
1. Create `packages/shared/src/crypto/fieldEncryption.ts`:
   ```typescript
   import crypto from 'crypto';
   const ALGORITHM = 'aes-256-gcm';
   const KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY || '', 'hex'); // 32 bytes

   export function encrypt(plaintext: string): string { ... }
   export function decrypt(ciphertext: string): string { ... }
   ```

2. Encrypt `databasePassword` before storing:
   - In `tenants.ts` tenant creation (~line 468-478)
   - In `tenants.ts` database update (~line 1005-1016)

3. Decrypt when reading:
   - In `getTenantDb()` at `auth-service/utils/tenantDb.ts:27-41`
   - In every `getTenantClientBySlug()` call that passes `databasePassword`

4. Add `FIELD_ENCRYPTION_KEY` to `.env` (generate with `openssl rand -hex 32`).

5. Write a one-time migration script to encrypt existing plaintext passwords in the core DB.

---

### R-6: Fix RBAC — Privilege Escalation (Audit 6.2)

**This is the most dangerous security bug in the application.**

**File:** `services/auth-service/src/routes/users.ts`

**Current:** All user management routes have zero role checks.

**Fix:**
```typescript
import { requireRole } from '../middleware/roleCheck.js';

// Only admins can manage users
router.get('/', requireRole('CENTRAL_ADMIN', 'TENANT_ADMIN', 'EMC_ADMIN', 'CANDIDATE_ADMIN'), userController.getUsers);
router.get('/:id', requireRole('CENTRAL_ADMIN', 'TENANT_ADMIN', 'EMC_ADMIN', 'CANDIDATE_ADMIN'), userController.getUserById);
router.post('/', requireRole('CENTRAL_ADMIN', 'TENANT_ADMIN'), userController.createUser);
router.put('/:id', requireRole('CENTRAL_ADMIN', 'TENANT_ADMIN'), userController.updateUser);
router.delete('/:id', requireRole('CENTRAL_ADMIN', 'TENANT_ADMIN'), userController.deleteUser);
router.put('/:id/status', requireRole('CENTRAL_ADMIN', 'TENANT_ADMIN'), userController.updateUserStatus);
router.put('/:id/role', requireRole('CENTRAL_ADMIN', 'TENANT_ADMIN'), userController.updateUserRole);
```

**Create middleware** `services/auth-service/src/middleware/roleCheck.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.headers['x-user-role'] as string;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: { code: 'E1005', message: 'Insufficient permissions' }
      });
    }
    next();
  };
}
```

**IMPORTANT:** Also add role checks to ALL other auth-service routes:
- `routes/organization.ts`
- `routes/fund-management.ts`
- `routes/event-management.ts`
- `routes/inventory-management.ts`
- `routes/tenant-news.ts`
- `routes/tenant-actions.ts`
- `routes/invitations.ts`
- `routes/messaging-settings.ts`
- `routes/internal-chat.ts`

---

### R-7: Fix WebSocket Tenant Isolation (Audit 6.3)

**File:** `services/gateway/src/config/socket.ts:45-48`

**Current:**
```typescript
socket.on('join_election', (electionId: string) => {
  socket.join(`election:${electionId}`);
});
```

**Fix:** Validate tenant ownership before joining:
```typescript
socket.on('join_election', async (electionId: string) => {
  // Validate that this election belongs to the user's tenant
  // The user's tenantId is in socket.user.tenantId (from JWT)
  const tenantId = socket.user?.tenantId;
  if (!tenantId) return;

  // Prefix room with tenantId for isolation
  socket.join(`tenant:${tenantId}:election:${electionId}`);
});
```

Also update `broadcastVoteMarked()` and `broadcastTurnoutUpdate()` to use tenant-prefixed rooms.

---

### R-8: Hash Refresh Tokens (Audit 6.6)

**File:** `services/auth-service/src/controllers/auth.ts`

**Changes:**
1. Before storing refresh token (~line 137-143):
   ```typescript
   const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
   await tenantDb.refreshToken.create({
     data: {
       userId: user.id,
       token: hashedRefreshToken,  // Store hash, not plaintext
       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
     },
   });
   ```

2. In `refreshToken()` method (~line 285-296), hash the incoming token before lookup:
   ```typescript
   const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
   const storedToken = await tenantDb.refreshToken.findFirst({
     where: { userId: decoded.id, token: hashedToken, expiresAt: { gt: new Date() } },
   });
   ```

3. In `logout()` (~line 369-376), hash before deleting:
   ```typescript
   const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
   await tenantDb.refreshToken.deleteMany({ where: { userId, token: hashedToken } });
   ```

---

### R-9: Restrict Open Registration (Audit 6.5)

**File:** `services/auth-service/src/controllers/auth.ts`, `register()` method

**Option A — Invitation-only registration:**
Check for a valid invitation token before allowing registration. The invitation system already exists (`routes/invitations.ts`).

**Option B — Admin-approved registration:**
Create user with `status: 'PENDING'` instead of `status: 'ACTIVE'` at line 232. Add an admin approval endpoint.

**Option C — Disable public registration entirely:**
Remove the register route from gateway public routes (`gateway/index.ts:150`).

**Recommended:** Option A for tenant users, Option C for super admin (already done — only first registration allowed).

---

### R-10: Remove Hardcoded API Keys (Audit 2.1)

**File:** `.env` (root)

**Steps:**
1. Rotate all API keys immediately:
   - OpenAI: Generate new key at platform.openai.com, revoke old one
   - Gemini: Generate new key at console.cloud.google.com, revoke old one

2. Move to environment-specific secret management:
   - Development: `.env.local` (gitignored, not committed)
   - Production: AWS Secrets Manager / Azure Key Vault / HashiCorp Vault
   - CI/CD: GitHub Secrets / GitLab CI Variables

3. Generate strong JWT secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. Add `.env.example` with placeholder values (no real secrets).

---

### R-11: Replace $executeRawUnsafe (Audit 6.1)

**File:** `services/super-admin-service/src/routes/tenants.ts:485-491`

**Current:**
```typescript
await (tenantClient as any).$executeRawUnsafe(
  `INSERT INTO tenants (...) VALUES ($1, $2, ...)`,
  result.tenant.id, data.name, ...
);
```

**Fix:** Use Prisma's tagged template literal:
```typescript
await (tenantClient as any).$executeRaw`
  INSERT INTO tenants (id, name, slug, ...)
  VALUES (${result.tenant.id}, ${data.name}, ${data.slug}, ...)
  ON CONFLICT (id) DO NOTHING
`;
```

Or better — use the Prisma client's `create()` method if the `Tenant` model exists in the tenant schema.

---

### R-12: Remove OTP from Dev Response (Audit 2.3)

**File:** `services/auth-service/src/controllers/auth.ts:631-634`

**Current:**
```typescript
...(process.env.NODE_ENV === 'development' && { otp }),
```

**Fix:** Remove entirely. OTP should never be in an HTTP response. Use a separate debug log or SMS testing tool (like MSG91 sandbox).

If absolutely needed for local development only:
```typescript
if (process.env.NODE_ENV === 'development') {
  logger.debug({ otp, userId: user.id }, 'DEV ONLY — OTP generated');
}
```

---

## PHASE 2 — FIX WITHIN 30 DAYS OF PRODUCTION (Week 3-6)

---

### R-13: DPDPA Consent System (Audit 1.1, 1.2)

**Schema changes:**

Add to `tenant/schema.prisma`:
```prisma
model ConsentRecord {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  userId          String?  @map("user_id")
  voterId         String?  @map("voter_id")
  consentVersion  String   @map("consent_version")
  purposeCode     String   @map("purpose_code")  // e.g., "VOTER_MGMT", "CAMPAIGN", "ANALYTICS"
  consentGivenAt  DateTime @default(now()) @map("consent_given_at")
  consentMethod   String   @map("consent_method")  // "APP_REGISTRATION", "SMS_OPT_IN", "FORM"
  withdrawnAt     DateTime? @map("withdrawn_at")
  ipAddress       String?  @map("ip_address")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@index([voterId])
  @@map("consent_records")
}
```

**Frontend:**
- Add consent page to registration flow
- Add privacy notice (in English + Hindi minimum)
- Add consent withdrawal option in user settings

**Backend:**
- Check consent exists before processing data
- Reject API calls for unconsented data operations

---

### R-14: Data Deletion / Right to Erasure (Audit 1.3)

**Create new endpoints:**

1. `DELETE /api/users/:id/data` — Anonymize user data:
   - Replace `firstName`, `lastName` with "REDACTED"
   - Clear `email`, `mobile`, `profilePhotoUrl`
   - Keep `id` and `tenantId` for referential integrity
   - Set `status` to `DELETED` (add enum value)
   - Delete all refresh tokens, OTPs
   - Log erasure in audit log

2. `DELETE /api/voters/:id/data` — Anonymize voter data:
   - Replace name, mobile, address with "REDACTED"
   - Clear religion, caste, political leaning, influence level
   - Remove from family
   - Delete survey responses
   - Keep anonymized statistical data (age group, gender) for analytics

3. Tenant deletion (`DELETE /tenants/:id`):
   - Change from soft-delete to scheduled hard-delete
   - Clear `adminMobile`, `adminEmail`, `adminUserId` from core DB
   - Drop tenant database after 30-day grace period (or immediately on request)
   - Send deletion confirmation

---

### R-15: Data Anonymization Before AI API Calls (Audit 1.6)

**Files:** Any code that sends data to OpenAI/Gemini (in `ai-analytics-service`)

**Approach:**
1. Before sending voter data to AI APIs, strip PII:
   - Remove: name, mobile, email, address, EPIC number
   - Keep: anonymized demographics (age bucket, gender, area code)
   - Replace names with synthetic identifiers

2. Implement a data anonymization utility:
   ```typescript
   function anonymizeForAI(voterData: VoterData): AnonymizedData {
     return {
       ageGroup: getAgeGroup(voterData.age),
       gender: voterData.gender,
       area: voterData.partNumber,
       politicalLeaning: voterData.politicalLeaning,
       // NO: name, mobile, email, address, EPIC
     };
   }
   ```

---

### R-16: CERT-In Log Retention (Audit 3.1)

1. Configure Pino to write to files with rotation:
   ```typescript
   import pino from 'pino';
   const logger = pino({
     transport: {
       targets: [
         { target: 'pino/file', options: { destination: '/var/log/electioncaffe/app.log' } },
         { target: 'pino-pretty', options: { destination: 1 } }
       ]
     }
   });
   ```

2. Set up log rotation (logrotate or built-in):
   - Daily rotation
   - 180-day retention (CERT-In requirement)
   - Compress after 7 days

3. Ship to log aggregation service (ELK/Grafana Loki) hosted within India.

---

### R-17: Breach Notification System (Audit 1.5, 3.2)

1. Create `IncidentReport` model in core DB
2. Create an incident detection pipeline:
   - Monitor for unusual patterns (mass data access, multiple failed logins across tenants)
   - Alert via email/SMS to DPO
3. Create an incident reporting dashboard in super admin
4. Include CERT-In reporting template with 6-hour SLA reminder

---

### R-18: Super Admin Security Hardening (Audit 2.8)

1. Reduce super admin token expiry to 1 hour
2. Add refresh token mechanism for super admin
3. Add MFA (TOTP) for super admin login:
   - Add `totpSecret` to `SuperAdmin` model
   - Use `speakeasy` or `otplib` library
   - Require TOTP for login and sensitive operations (password reset)
4. Add IP whitelist option for super admin access

---

### R-19: CORS Cleanup (Audit 6.4)

**File:** `services/gateway/src/index.ts:59-61`

**Remove** the wildcard localhost regex in production:
```typescript
// Only in development
if (process.env.NODE_ENV === 'development' && origin && /^https?:\/\/[a-z0-9-]+\.localhost(:\d+)?$/.test(origin)) {
  callback(null, true);
}
```

**Clean up** CORS_ORIGIN in `.env` to only include production domains.

---

### R-20: Minimize JWT Payload (Audit 6.7)

**File:** `services/auth-service/src/controllers/auth.ts:122-131`

**Change:**
```typescript
const userPayload: UserPayload = {
  id: user.id,
  tenantId: user.tenantId,
  role: user.role as UserPayload['role'],
  permissions: user.permissions as string[] || [],
  // REMOVED: firstName, lastName, email, mobile
};
```

Frontend can get user details from `/api/auth/me` endpoint (already exists).

Update `UserPayload` type in `packages/shared/src/types/index.ts` to make `firstName`, `lastName`, `email`, `mobile` optional or remove them.

---

### R-21: HTTPS Enforcement (Audit 2.9)

1. Deploy behind a reverse proxy (Nginx/Caddy) with TLS termination
2. Add HSTS header:
   ```typescript
   app.use(helmet({
     hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
   }));
   ```
3. Add HTTP to HTTPS redirect at proxy level
4. Set `Secure` flag on any cookies (if added later)

---

### R-22: Sensitive Data Encryption at Rest (Audit 1.4)

For voter sensitive data (`politicalLeaning`, `religion`, `caste`):

**Option A — Column-level encryption** (preferred for targeted access):
Encrypt these specific columns using the field encryption utility from R-5.

**Option B — Transparent Data Encryption (TDE):**
Enable PostgreSQL's `pgcrypto` extension for at-rest encryption at the database level.

**Option C — Full Disk Encryption:**
Use encrypted volumes for database storage (AWS EBS encryption, Azure disk encryption).

Minimum viable: Option C + access controls. Ideal: Option A for the most sensitive columns.

---

## PHASE 3 — FIX WITHIN 90 DAYS (Week 7-12)

---

### R-23: Data Retention Automation (Audit 1.7)

Create a scheduled job (cron):
1. Delete expired OTPs older than 24 hours
2. Delete expired refresh tokens
3. Archive audit logs older than 2 years (keep 180 days online for CERT-In)
4. Archive completed election data after configurable retention period
5. Anonymize voter data for tenants whose subscription expired > 90 days ago

---

### R-24: Grievance Redressal Mechanism (Audit 1.8)

1. Add DPO contact information to the app (Settings > Privacy)
2. Create a grievance submission form
3. Track grievances in a new `GrievanceTicket` model
4. Auto-acknowledge within 48 hours (DPDPA requirement)

---

### R-25: Model Code of Conduct Controls (Audit 4.2)

1. Add `isMCCActive` flag to `Election` model
2. When MCC is active:
   - Disable campaign creation
   - Disable broadcast messaging
   - Show warning banner
   - Log all activities during MCC period

---

### R-26: DPO Appointment (Audit 1.4 supporting)

1. Appoint a Data Protection Officer (required for significant data fiduciaries)
2. Register with Data Protection Board of India
3. Display DPO contact in the application

---

### R-27: Privacy Notice / Terms of Service

1. Create privacy notice per DPDPA Section 6(2):
   - Purpose of data collection
   - Categories of data processed
   - Rights of data principal
   - Retention period
   - Contact for grievance
   - Available in English and Hindi (minimum)

2. Display during registration and before voter data entry
3. Version the notice and record which version user consented to

---

### R-28: Password History (Audit 6.11)

1. Add `PasswordHistory` model:
   ```prisma
   model PasswordHistory {
     id           String   @id @default(uuid())
     userId       String   @map("user_id")
     passwordHash String   @map("password_hash")
     createdAt    DateTime @default(now()) @map("created_at")
     @@index([userId])
     @@map("password_history")
   }
   ```
2. On password change, save old hash to history
3. Check new password against last 5 hashes before accepting

---

## IMPLEMENTATION PRIORITY MATRIX

| Priority | Items | Estimated Effort |
|----------|-------|-----------------|
| **P0 — Blocking** | R-1 (OTP), R-6 (RBAC), R-10 (API keys), R-12 (OTP leak) | 1-2 days |
| **P1 — Week 1** | R-2 (OTP limits), R-3 (lockout), R-4 (bcrypt), R-7 (WebSocket), R-8 (refresh token hash), R-11 ($executeRaw) | 3-4 days |
| **P2 — Week 2** | R-5 (encrypt DB creds), R-9 (registration), R-19 (CORS), R-20 (JWT minimize) | 2-3 days |
| **P3 — Month 1** | R-13 (consent), R-14 (deletion), R-15 (AI anonymize), R-16 (logs), R-17 (breach), R-18 (super admin MFA), R-21 (HTTPS) | 2-3 weeks |
| **P4 — Month 2-3** | R-22 (encryption), R-23 (retention), R-24 (grievance), R-25 (MCC), R-26 (DPO), R-27 (privacy notice), R-28 (password history) | 3-4 weeks |

---

## NOTES

1. **Do NOT go to production** without completing at minimum P0 and P1 items.
2. The RBAC fix (R-6) is the single most dangerous issue — a volunteer can currently promote themselves to admin.
3. The consent mechanism (R-13) is legally required but can be MVP'd as a simple checkbox + privacy notice page.
4. Rotating the OpenAI/Gemini API keys (R-10) should be done **today** regardless of other timelines.
5. Several items in Phase 2 and 3 require organizational decisions (DPO appointment, vendor DPAs, incident response team). Start those conversations now even if code isn't ready.

---

*This remediation plan corresponds to the audit dated 1 March 2026. Track progress against each R-number.*
