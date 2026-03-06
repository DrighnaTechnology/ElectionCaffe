# BUG: Tenant Database Encoding - WIN1252 vs UTF-8

## Problem

When a super admin creates a new tenant, the database is created using `CREATE DATABASE "EC_<name>"` without specifying encoding. PostgreSQL defaults to the server's locale encoding, which on Windows is often `WIN1252` (Latin1).

WIN1252 **cannot store** Unicode characters like Tamil, Hindi, Malayalam, etc. This causes errors like:

```
character with byte sequence 0xe0 0xae 0xa8 in encoding "UTF8" has no equivalent in encoding "WIN1252"
```

## Affected Databases

Run this to check:
```sql
SELECT datname, pg_encoding_to_char(encoding) FROM pg_database WHERE datname LIKE 'EC_%';
```

Current state (as of March 2026):
| Database | Encoding |
|---|---|
| ec_demo | UTF8 |
| EC_nitish | WIN1252 |
| EC_Demo_Platform_Party | WIN1252 |
| EC_Demo_External_Party | WIN1252 |

## Root Cause

File: `packages/database/src/clients/db-manager.ts`, line 113:

```typescript
await client.query(`CREATE DATABASE "${dbName}"`);
```

No `ENCODING`, `LC_COLLATE`, or `LC_CTYPE` specified. On Windows with default locale, PostgreSQL uses WIN1252.

## Fix

Change line 113 in `db-manager.ts` to:

```typescript
await client.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8' TEMPLATE template0`);
```

`TEMPLATE template0` is required because the default `template1` may have a different encoding, and PostgreSQL won't allow a different encoding without it.

**Note:** On Windows, if `en_US.UTF-8` locale is not available, use `'C'` or `'English_United States.1252'` with UTF8 encoding:

```typescript
await client.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`);
```

Using `'C'` locale with UTF8 encoding works universally across all platforms.

## Fix for Existing WIN1252 Databases

Existing databases must be recreated. Encoding cannot be changed on a live database.

### Steps:
```bash
# 1. Dump the data
pg_dump -h localhost -p 5333 -U postgres EC_nitish > ec_nitish_backup.sql

# 2. Drop the old database
psql -h localhost -p 5333 -U postgres -c "DROP DATABASE \"EC_nitish\";"

# 3. Recreate with UTF-8
psql -h localhost -p 5333 -U postgres -c "CREATE DATABASE \"EC_nitish\" ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0;"

# 4. Restore the data
psql -h localhost -p 5333 -U postgres -d EC_nitish < ec_nitish_backup.sql
```

Repeat for `EC_Demo_Platform_Party` and `EC_Demo_External_Party`.

## Affected Features

Any feature storing local language text will fail on WIN1252 databases:
- Surveys (question titles in local languages)
- Voter names in local script (`nameLocal`)
- News broadcast content
- Campaign messages
- Any AI-generated content with Unicode characters
