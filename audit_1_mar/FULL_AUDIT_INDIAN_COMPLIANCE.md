# ElectionCaffe — Full Indian Compliance Audit

**Date:** 1 March 2026
**Scope:** Entire application — auth-service, super-admin-service, gateway, database schemas, frontend apps, environment config
**Focus:** Indian laws only — DPDPA 2023, IT Act 2000 (amended 2008), IT Rules 2011, CERT-In Directions 2022, RPA 1951, ECI Guidelines, RBI Data Localization

---

## SEVERITY LEVELS

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Active violation of law. Can result in prosecution, fines, or injunction. Must fix before production. |
| **HIGH** | Likely violation or major security gap that enables violation. Fix before production. |
| **MEDIUM** | Gap that becomes a violation at scale or under audit. Fix within 30 days of production. |
| **LOW** | Best practice gap. Fix when convenient. |
| **INFO** | Observation, no violation. |

---

## 1. DIGITAL PERSONAL DATA PROTECTION ACT, 2023 (DPDPA)

### 1.1 [CRITICAL] No Consent Mechanism — Section 6

**Law:** Section 6 requires "free, specific, informed, unambiguous consent" before processing personal data. A Data Principal must be presented a notice in clear language (English + any scheduled language if requested) describing what data is collected, why, and who processes it.

**Code reality:**
- `auth-service/controllers/auth.ts:166-248` — `register()` creates a user with `firstName`, `lastName`, `mobile`, `email`, `password` with zero consent capture.
- No consent form, no checkbox, no privacy notice, no consent record in DB.
- The `User` model (`tenant/schema.prisma:169-207`) has no `consentGivenAt`, `consentVersion`, or `consentWithdrawnAt` field.
- Registration API (`apps/web/src/services/api.ts:74-75`) sends data directly — no consent UI.

**Why this matters:** The application stores **voter data** (name, age, DOB, mobile, address, religion, caste, political leaning, influence level — `createVoterSchema` lines 100-137). This is **sensitive personal data** under DPDPA. Processing it without consent is a **direct violation of Section 6** punishable by up to **₹250 crore fine** (Section 33).

**Applies to:** Voter data, user registration, cadre management, family data, survey responses.

---

### 1.2 [CRITICAL] No Purpose Limitation — Section 5

**Law:** Section 5 says personal data shall be processed only for the purpose for which consent was given. The purpose must be specific and stated upfront.

**Code reality:**
- Voter data includes `politicalLeaning`, `influenceLevel`, `religion`, `caste`, `subCaste` — this is being processed for political campaign management.
- No purpose definition exists anywhere in the application.
- The same data is used for analytics (`ai-analytics`), surveys, reports, poll day operations, campaign targeting, and broadcast messaging.
- There is no mechanism to restrict data use to the originally stated purpose.

---

### 1.3 [CRITICAL] No Data Deletion / Right to Erasure — Section 12

**Law:** Section 12(3) — Data Principal can request erasure. Section 12(5) — Data Fiduciary must delete data when purpose is fulfilled or consent is withdrawn. Section 8(7) — Must delete data when no longer needed for the purpose.

**Code reality:**
- `DELETE /tenants/:id` at `tenants.ts:691-707` does a **soft delete** (`status: 'SUSPENDED'`) — all tenant data remains in the database forever.
- No user deletion endpoint exists. `users.ts:12` has `router.delete('/:id', ...)` but the controller just sets status, it doesn't actually erase personal data.
- No mechanism to delete voter records, survey responses, or family data.
- Admin identity cache in core DB (`adminMobile`, `adminEmail`, `adminUserId`) is never cleaned up on tenant deletion.
- OTP records in `otps` table have no cleanup — used OTPs with personal data (userId) persist forever.
- Refresh tokens have no batch cleanup job — expired tokens accumulate indefinitely.

---

### 1.4 [HIGH] Sensitive Personal Data Without Additional Safeguards — Section 9

**Law:** Section 9 treats data about health, finances, sexual orientation, **caste**, **religious belief**, **political affiliation** as "Sensitive Personal Data" requiring higher safeguards (explicit consent, Data Protection Officer, DPIA).

**Code reality:**
- `createVoterSchema` (validation/index.ts:100-137) collects: `religionId`, `casteCategoryId`, `casteId`, `subCasteId`, `politicalLeaning` (LOYAL/SWING/OPPOSITION), `influenceLevel`.
- These are **directly sensitive** under DPDPA.
- No Data Protection Impact Assessment (DPIA) has been done.
- No Data Protection Officer (DPO) is appointed — no reference anywhere in code or config.
- No additional consent layer for sensitive data.
- Data is stored in **plaintext** in database (no column-level encryption for caste, religion, political affiliation).

---

### 1.5 [HIGH] No Data Breach Notification Mechanism — Section 8(6)

**Law:** Section 8(6) — Data Fiduciary must notify the Data Protection Board **and** each affected Data Principal of any personal data breach.

**Code reality:**
- No breach notification system exists.
- No incident response plan in code.
- `PlatformAuditLog` (core schema:957-975) logs actions but has no breach flagging, no automated alerting, no notification queue.

---

### 1.6 [HIGH] Cross-Border Data Transfer Without Safeguards — Section 16

**Law:** Section 16 — Government may restrict transfer of personal data to certain countries. Until notified, transfers are allowed, but the data fiduciary remains responsible for protection.

**Code reality:**
- `.env` line 48-53: OpenAI API keys are present and active. AI analytics sends voter data (names, demographics, political leanings) to OpenAI's servers (US-based).
- `.env` line 56: Gemini API key present — Google Cloud (US-based).
- No data anonymization/pseudonymization before sending to external AI APIs.
- No Data Processing Agreement (DPA) reference with OpenAI or Google.
- If the Government notifies restrictions on US transfers, this becomes an immediate violation.

---

### 1.7 [MEDIUM] No Data Retention Policy — Section 8(7)

**Law:** Data should be erased when purpose is fulfilled or retention period expires.

**Code reality:**
- No retention periods defined anywhere in the schemas.
- `AuditLog`, `AIUsageLog`, `ECSyncLog`, `BillingHistory` — all grow indefinitely.
- Expired elections and completed campaigns retain all voter data permanently.
- No archival or anonymization pipeline.

---

### 1.8 [MEDIUM] No Grievance Redressal — Section 13

**Law:** Section 13 — Data Fiduciary must have a grievance redressal mechanism and respond within the prescribed period.

**Code reality:** No grievance endpoint, no contact mechanism, no DPO email in the application.

---

## 2. INFORMATION TECHNOLOGY ACT, 2000 & IT RULES, 2011

### 2.1 [CRITICAL] API Keys Committed to Source Code — IT Act Section 43A

**Law:** Section 43A requires "reasonable security practices" to protect sensitive personal data. IT Rules 2011 Rule 8 requires implementation of security practices per IS/ISO/IEC 27001 or equivalent.

**Code reality:**
- `.env` (root, line 48-53): **Live OpenAI API keys** committed in plaintext:
  ```
  OPENAI_API_KEY="sk-proj-Uye2o3lgmfV1dPZ5OY3wct-..."
  DC_OPENAI_API_KEY="sk-proj-Uye2o3lgmfV1dPZ5OY3wct-..."
  DC_OPENAI_API_KEY_DEV="sk-proj-Uye2o3lgmfV1dPZ5OY3wct-..."
  ```
- `.env` line 56: **Live Gemini API key** committed:
  ```
  GEMINI_API_KEY="AIzaSyCa8xx17UE-..."
  ```
- `.env` line 9-10: **JWT secrets** are placeholder text that clearly hasn't been changed:
  ```
  JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
  JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production-min-32-chars"
  ```
- `.env` line 4: Database password is `admin`:
  ```
  DATABASE_URL="postgresql://postgres:admin@localhost:5333/electioncaffe?schema=public"
  ```

**Note:** `.gitignore` does include `.env` — so these aren't in the git repo. But they exist on disk and if this machine is compromised, all API keys and database credentials are exposed in plaintext.

---

### 2.2 [CRITICAL] OTP Generated with Math.random() — NOT Cryptographically Secure

**Law:** IT Rules 2011 Rule 8 — "reasonable security practices."

**Code reality:**
- `packages/shared/src/utils/index.ts:58-65`:
  ```typescript
  export function generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }
  ```
- `Math.random()` is **not cryptographically secure**. OTPs generated this way are predictable if the attacker knows the seed state.
- This OTP is used for **password reset** (`auth.ts:616`).
- An attacker who can predict or enumerate OTPs can take over any tenant admin account.

---

### 2.3 [CRITICAL] OTP Leak in Development Mode — Section 72A

**Law:** Section 72A — Punishment for disclosure of personal information in breach of contract or without consent.

**Code reality:**
- `auth.ts:631-634`:
  ```typescript
  ...(process.env.NODE_ENV === 'development' && { otp }),
  ```
- OTP is returned in the HTTP response body in development mode.
- If `NODE_ENV` is not set in production (it defaults to undefined, not "production"), OTP would still NOT leak (the condition checks for `=== 'development'`). But this is fragile — if someone sets `NODE_ENV=development` on a staging/production server, OTPs leak to the client.

---

### 2.4 [HIGH] No Account Lockout After Failed Logins

**Law:** IT Rules 2011 Rule 8 — reasonable security practices (IS/ISO 27001 A.9.4.2 — secure login procedures).

**Code reality:**
- `auth.ts:31-163` — `login()` has no failed attempt counter.
- No account lockout after N failed attempts.
- The gateway has a rate limiter (`max: 10` per 15 min for auth routes — gateway index.ts:91-95), but this is IP-based only. An attacker using rotating IPs can brute-force indefinitely.
- No CAPTCHA integration.
- No notification to the account holder on failed login attempts.

---

### 2.5 [HIGH] Password Hashing Inconsistency — bcrypt Salt Rounds

**Code reality:**
- `auth.ts:220` — Registration: `bcrypt.hash(password, 10)` — 10 rounds
- `auth.ts:555` — Change password: `bcrypt.hash(newPassword, 10)` — 10 rounds
- `auth.ts:756` — Reset password: `bcrypt.hash(newPassword, 10)` — 10 rounds
- `auth.ts:889` — Internal temp password: `bcrypt.hash(tempPassword, 12)` — 12 rounds
- `super-admin-service/auth.ts:128` — Super admin register: `bcrypt.hash(data.password, 12)` — 12 rounds

Salt rounds are inconsistent. 10 rounds is acceptable but below modern recommendation (12+ minimum for 2026). The inconsistency itself is a code quality issue.

---

### 2.6 [HIGH] No OTP Rate Limiting / No OTP Attempt Limit

**Code reality:**
- `forgotPassword()` at `auth.ts:571-638` generates unlimited OTPs for the same user — no check for existing unused OTPs.
- `verifyOTP()` at `auth.ts:641-713` has no attempt counter — an attacker can try all 1,000,000 possible 6-digit codes.
- Combined with the `Math.random()` weakness (2.2), this is exploitable.

---

### 2.7 [HIGH] Database Credentials Stored in Plaintext in Core DB

**Code reality:**
- Core schema, Tenant model (lines 201-209):
  ```prisma
  databaseHost          String?
  databaseName          String?
  databaseUser          String?
  databasePassword      String?        @map("database_password")
  databaseConnectionUrl String?
  ```
- Tenant database passwords are stored as **plaintext strings** in the core database.
- Every inter-service call passes these credentials in HTTP POST bodies (e.g., `tenants.ts:1278-1288`).
- If the core database is breached, all tenant databases are immediately compromised.

---

### 2.8 [HIGH] Super Admin Token Expiry — 24 Hours, No Refresh

**Code reality:**
- `super-admin-service/auth.ts:79-87`:
  ```typescript
  const token = jwt.sign(
    { id: superAdmin.id, email: superAdmin.email, type: 'super_admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  ```
- Super admin sessions last 24 hours with a single long-lived token.
- No refresh token mechanism for super admin.
- If the token is stolen, the attacker has full platform access for up to 24 hours.
- Super admin API at `/api/super-admin` routes through the gateway with NO auth middleware — the service handles its own auth (`gateway/index.ts:214-217`). The gateway only strips `x-super-admin-id` header. This means the super admin service is directly reachable if port 3008 is exposed.

---

### 2.9 [MEDIUM] No HTTPS Enforcement

**Code reality:**
- All services listen on plain HTTP (`app.listen(PORT)`).
- No TLS certificate configuration anywhere.
- Gateway uses `helmet()` but doesn't enforce HSTS or redirect HTTP to HTTPS.
- Cookie flags (Secure, HttpOnly, SameSite) are not set — tokens are stored in localStorage, not cookies.

---

### 2.10 [MEDIUM] Logs May Contain PII

**Code reality:**
- `auth.ts:33`: `logger.debug({ body: req.body }, '[AUTH] Login attempt received')` — logs the entire request body including password.
- `auth.ts:43`: `logger.debug({ mobile, email, tenantSlug }, '[AUTH] Validation passed')` — logs mobile and email.
- `auth.ts:63`: Logs tenant info including slug and name.
- `auth.ts:904`: `logger.info({ tenantId, adminUserId }, 'Admin temp password generated')` — doesn't log the password, but logs who generated it.
- Log level is set to `info` in `.env` (not `debug`), so the password logging at line 33 won't fire in prod. But if someone changes log level to `debug`, passwords are logged.
- Pino logger outputs to stdout — if logs are shipped to a third-party service, PII is transferred.

---

## 3. CERT-In DIRECTIONS, 2022

### 3.1 [HIGH] No Log Retention for 180 Days

**Law:** CERT-In Direction 4(ii) — All service providers must maintain logs of ICT systems for 180 days within Indian jurisdiction.

**Code reality:**
- Logs go to stdout (Pino logger).
- `ENABLE_FILE_LOGGING="true"` is set in root .env, but the logs directory has a `.gitkeep` — no rotation, no retention policy.
- No log aggregation system configured.
- No guarantee logs are stored for 180 days.
- `PlatformAuditLog` in database has no retention enforcement.

---

### 3.2 [HIGH] No Incident Reporting Mechanism

**Law:** CERT-In Direction 4(i) — Incidents must be reported to CERT-In within 6 hours.

**Code reality:** No incident detection, no alerting pipeline, no CERT-In reporting workflow.

---

### 3.3 [MEDIUM] No NTP Synchronization Documentation

**Law:** CERT-In Direction 4(iii) — Systems must synchronize clocks with NTP server of NIC or IDRBT.

**Code reality:** No NTP configuration anywhere. `new Date()` is used throughout — relies on host OS time. No validation that clocks are synced to Indian NTP servers.

---

## 4. REPRESENTATION OF THE PEOPLE ACT, 1951 & ECI GUIDELINES

### 4.1 [HIGH] Voter Data Handling Without ECI Authorization

**Law:** Voter roll data is published by the Election Commission of India. It can be downloaded for election purposes but its use for commercial purposes or unauthorized profiling is restricted under various ECI orders.

**Code reality:**
- The application imports voter rolls (via bulk upload — `bulkPartUploadSchema`, voter CRUD endpoints).
- It enriches voter data with **political leaning, influence level, caste, religion, family relationships, survey responses**.
- This enriched profile is used for **campaign targeting** (`CampaignPage`, `ai-analytics`).
- AI analysis sends this data to OpenAI/Google for **voter sentiment analysis, swing voter identification, turnout prediction**.
- ECI has issued multiple orders restricting use of voter data for profiling. If the platform is used without proper authorization, it violates ECI guidelines.

**Note:** This is a tool sold to political parties — the responsibility may fall on the tenant (data fiduciary), but the platform (data processor) has shared liability under DPDPA Section 8.

---

### 4.2 [MEDIUM] No Model Code of Conduct Compliance

**Code reality:**
- Campaign management, messaging, and broadcast features have no temporal restrictions.
- During Model Code of Conduct period, certain campaign activities are restricted by ECI.
- No mechanism to disable features during MCC period.

---

## 5. RBI DATA LOCALIZATION (if applicable)

### 5.1 [INFO] Financial Data May Need Localization

**Code reality:**
- `FundManagement` feature handles political fund donations, expenses, and transactions.
- If any payment gateway integration is added, RBI's data localization circular (April 2018) requires payment data to be stored only in India.
- Currently no payment gateway — marked INFO for awareness.

---

## 6. APPLICATION SECURITY ISSUES (Supporting Compliance)

### 6.1 [CRITICAL] $executeRawUnsafe with Parameterized Query — Acceptable but Risky Pattern

**Code:** `tenants.ts:485-491`:
```typescript
await (tenantClient as any).$executeRawUnsafe(
  `INSERT INTO tenants (...) VALUES ($1, $2, $3, $4::"TenantType", ...)`,
  result.tenant.id, data.name, data.slug, data.tenantType, ...
);
```
- Uses parameterized placeholders (`$1`, `$2`, etc.) — so SQL injection is mitigated.
- But `$executeRawUnsafe` bypasses Prisma's type safety. If anyone modifies this to use string interpolation, it becomes injectable.
- The `$4::"TenantType"` cast could be problematic if `data.tenantType` contains unexpected values (mitigated by zod validation upstream).

**Verdict:** Currently safe but fragile. Should use `$executeRaw` (tagged template) instead.

---

### 6.2 [HIGH] No Role-Based Access Control (RBAC) Enforcement on Backend Routes

**Code reality:**
- Gateway `auth.ts:95-121` has `requireRole()` and `requirePermission()` functions defined.
- But **they are never used** in the gateway route definitions (gateway/index.ts:149-223 — all routes just use `authMiddleware`, no role checks).
- Auth service routes (`auth-service/routes/users.ts:1-16`) have **no role checks** — any authenticated user can list all users, create users, delete users, change roles.
- The `UserController.getUsers()` at `controllers/users.ts:16-67` queries ALL users for the tenant without checking if the requesting user has admin privileges.
- A VOLUNTEER role user can call `PUT /api/users/:id/role` and promote themselves to `CENTRAL_ADMIN`.

**This is a direct privilege escalation vulnerability.**

---

### 6.3 [HIGH] WebSocket Rooms Have No Tenant Isolation

**Code reality:**
- `socket.ts:45-48`: Any authenticated user can join ANY election room:
  ```typescript
  socket.on('join_election', (electionId: string) => {
    socket.join(`election:${electionId}`);
  });
  ```
- No validation that the user's tenant owns that election.
- A user from Tenant A could join Tenant B's election room and receive real-time vote tracking data.

---

### 6.4 [HIGH] CORS Allows Wildcard Subdomains in Production

**Code reality:**
- Gateway `index.ts:59-61`:
  ```typescript
  } else if (origin && /^https?:\/\/[a-z0-9-]+\.localhost(:\d+)?$/.test(origin)) {
    callback(null, true);
  }
  ```
- This allows **any** `*.localhost` subdomain — fine for development but must be removed in production.
- Root `.env` CORS_ORIGIN includes 12+ origins including `http://admin.localhost`, `http://nitish-scooby.localhost` — development-specific origins that should not be in production config.

---

### 6.5 [HIGH] Open Registration Endpoint — Anyone Can Register

**Code reality:**
- `auth.ts:166-248` — `register()` has no invitation check, no approval workflow. Anyone who knows the tenant slug can self-register as a VOLUNTEER.
- `super-admin-service/auth.ts:111-168` — Super admin registration is restricted (only first admin), but there's no IP whitelist or additional verification.
- The tenant register endpoint at gateway is rate-limited (`max: 10` per 15 min) but not blocked.

---

### 6.6 [HIGH] Refresh Token Stored as Plaintext in Database

**Code reality:**
- `tenant/schema.prisma:209-220` — `RefreshToken.token` is stored as a plain string.
- If tenant DB is breached, attacker gets valid refresh tokens and can generate new access tokens indefinitely until tokens expire.
- Refresh tokens should be hashed (like passwords).

---

### 6.7 [MEDIUM] JWT Contains Full User Payload — Data Minimization Issue

**Code reality:**
- `auth.ts:122-131`:
  ```typescript
  const userPayload: UserPayload = {
    id, tenantId, firstName, lastName, email, mobile, role, permissions,
  };
  const accessToken = jwt.sign(userPayload, JWT_SECRET, ...);
  ```
- JWT contains `firstName`, `lastName`, `email`, `mobile` — PII in every request header.
- JWTs are base64-encoded, not encrypted. Anyone who intercepts the token can read PII.
- Token is stored in `localStorage` (frontend) — accessible to any XSS attack.

---

### 6.8 [MEDIUM] No Request Body Size Limit on Auth Service

**Code reality:**
- Gateway has `express.json({ limit: '10mb' })` (gateway/index.ts:70).
- Auth service has `app.use(express.json())` with **no limit** (auth-service/index.ts:65).
- Super admin service has `app.use(express.json())` with **no limit** (super-admin-service/index.ts:35).
- Since gateway proxies with body rewriting, the 10mb gateway limit applies. But if auth service ports are directly exposed, unlimited request bodies enable DoS.

---

### 6.9 [MEDIUM] No CSRF Protection

**Code reality:**
- No CSRF tokens anywhere.
- Auth tokens in `localStorage` (not cookies) mitigate cookie-based CSRF, but the super admin app could still be vulnerable if using cookies in future.

---

### 6.10 [LOW] No Security Headers Beyond Helmet Defaults

**Code reality:**
- Gateway uses `app.use(helmet())` with defaults.
- No custom CSP policy.
- No `Referrer-Policy`, no `Permissions-Policy`.
- Auth service and super-admin service don't use Helmet at all.

---

### 6.11 [LOW] No Password History — Users Can Reuse Old Passwords

**Code reality:**
- `changePassword()` and `resetPassword()` don't check if the new password was previously used.
- `ForceResetPasswordPage.tsx:50` checks `currentPassword === newPassword` (can't reuse temp password) but doesn't check historical passwords.

---

## 7. TEMP PASSWORD / FORCED RESET FEATURE — SPECIFIC AUDIT

### 7.1 [INFO] Architecture — Compliant

The temp password feature correctly routes through Auth Service via inter-service HTTP calls. Super Admin Service never directly accesses tenant DB for password operations. This is the correct service boundary.

### 7.2 [MEDIUM] No MFA for Super Admin Before Password Reset

- A single super admin JWT token is sufficient to reset any tenant admin's password.
- No re-authentication, no MFA, no approval workflow.
- The frontend has a confirmation dialog with legal warning (IT Act 72A), but there's no server-side enforcement of step-up auth.

### 7.3 [LOW] Temp Password is Shown in Browser — Acceptable

- Temp password is shown once in a modal and cleared on close (`setTempPassword(null)`).
- `Cache-Control: no-store` header is set.
- Audit log records the reset action.
- This is an acceptable pattern with the caveat that the super admin could screenshot the password.

### 7.4 [INFO] Force Reset Flow — Correctly Implemented

- `mustChangePassword` persisted in zustand store prevents bypass.
- `ProtectedRoute` redirects to `/force-reset-password` — can't access dashboard.
- `isTempPassword` flag cleared on password change — backend enforced.
- All sessions invalidated on temp password generation.

---

## SUMMARY TABLE

| # | Finding | Severity | Law/Standard |
|---|---------|----------|--------------|
| 1.1 | No consent mechanism | CRITICAL | DPDPA Section 6 |
| 1.2 | No purpose limitation | CRITICAL | DPDPA Section 5 |
| 1.3 | No data deletion / right to erasure | CRITICAL | DPDPA Section 12 |
| 1.4 | Sensitive data without safeguards | HIGH | DPDPA Section 9 |
| 1.5 | No breach notification mechanism | HIGH | DPDPA Section 8(6) |
| 1.6 | Cross-border transfer to OpenAI/Google | HIGH | DPDPA Section 16 |
| 1.7 | No data retention policy | MEDIUM | DPDPA Section 8(7) |
| 1.8 | No grievance redressal | MEDIUM | DPDPA Section 13 |
| 2.1 | API keys in plaintext on disk | CRITICAL | IT Act 43A |
| 2.2 | OTP uses Math.random() | CRITICAL | IT Rules 2011 |
| 2.3 | OTP leaked in dev mode | CRITICAL | IT Act 72A |
| 2.4 | No account lockout | HIGH | IT Rules 2011 |
| 2.5 | Inconsistent bcrypt rounds | HIGH | IT Rules 2011 |
| 2.6 | No OTP rate/attempt limiting | HIGH | IT Rules 2011 |
| 2.7 | DB credentials in plaintext in core DB | HIGH | IT Act 43A |
| 2.8 | Super admin 24hr token, no refresh | HIGH | IT Rules 2011 |
| 2.9 | No HTTPS enforcement | MEDIUM | IT Rules 2011 |
| 2.10 | Logs may contain PII | MEDIUM | DPDPA Section 8 |
| 3.1 | No 180-day log retention | HIGH | CERT-In 2022 |
| 3.2 | No incident reporting mechanism | HIGH | CERT-In 2022 |
| 3.3 | No NTP sync documentation | MEDIUM | CERT-In 2022 |
| 4.1 | Voter data profiling without ECI authorization | HIGH | RPA 1951 |
| 4.2 | No MCC compliance controls | MEDIUM | ECI Guidelines |
| 6.1 | $executeRawUnsafe usage | CRITICAL | Security |
| 6.2 | No RBAC enforcement — privilege escalation | HIGH | Security / DPDPA |
| 6.3 | WebSocket no tenant isolation | HIGH | Security / DPDPA |
| 6.4 | CORS wildcard subdomains | HIGH | Security |
| 6.5 | Open registration endpoint | HIGH | Security |
| 6.6 | Refresh token stored plaintext | HIGH | Security |
| 6.7 | JWT contains PII | MEDIUM | DPDPA Section 8 |
| 6.8 | No body size limit on services | MEDIUM | Security |
| 6.9 | No CSRF protection | MEDIUM | Security |
| 6.10 | Minimal security headers | LOW | Security |
| 6.11 | No password history | LOW | Security |
| 7.2 | No MFA for super admin password reset | MEDIUM | IT Act 72A |

**Total: 6 CRITICAL, 17 HIGH, 10 MEDIUM, 3 LOW, 2 INFO**

---

## LEGAL EXPOSURE SUMMARY

| Law | Maximum Penalty | Current Risk |
|-----|----------------|--------------|
| DPDPA Section 33(a) — Processing children's data / breach of consent | ₹200 crore | HIGH — no consent at all |
| DPDPA Section 33(b) — Failure to prevent breach | ₹250 crore | HIGH — multiple security gaps |
| IT Act Section 43A — Negligent data handling | Compensation per affected person | HIGH — plaintext credentials, weak OTP |
| IT Act Section 72A — Unauthorized disclosure | 3 years imprisonment + ₹5 lakh fine | MEDIUM — OTP dev leak, log PII |
| CERT-In — Non-compliance with directions | Imprisonment up to 1 year + fine | HIGH — no 180-day logs |

---

*This audit was conducted against the codebase as of 1 March 2026. It covers code-level compliance only — organizational policies, physical security, and contractual arrangements are outside scope.*
