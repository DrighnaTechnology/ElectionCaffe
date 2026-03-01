// Tenant detection utility
// Dynamically detects tenant from URL subdomain — no hardcoded tenant list.
// Production: demo-shared.electioncaffe.com → slug = "demo-shared"
// Local dev:  demo-shared.localhost:5173    → slug = "demo-shared"

export interface TenantConfig {
  slug: string;
  name: string;
}

// Subdomains that are NOT tenant slugs
const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'api', 'super-admin', 'app']);

/**
 * Extracts the tenant slug from the current URL subdomain.
 *
 * Production: {slug}.electioncaffe.com  → slug
 * Local dev:  {slug}.localhost:5173     → slug
 *
 * Returns null when there is no subdomain (bare domain / localhost).
 */
export function detectTenant(): TenantConfig | null {
  const hostname = window.location.hostname;

  // localhost without subdomain  →  no tenant
  if (hostname === 'localhost') return null;

  const parts = hostname.split('.');

  // {slug}.localhost  →  parts = ['slug', 'localhost']
  if (parts.length === 2 && parts[1] === 'localhost') {
    const slug = parts[0];
    if (RESERVED_SUBDOMAINS.has(slug)) return null;
    return { slug, name: slug };
  }

  // {slug}.domain.tld  →  parts.length >= 3
  if (parts.length >= 3) {
    const slug = parts[0];
    if (RESERVED_SUBDOMAINS.has(slug)) return null;
    return { slug, name: slug };
  }

  return null;
}

/**
 * Gets the current tenant slug from the subdomain.
 */
export function getTenantSlug(): string | undefined {
  return detectTenant()?.slug;
}

/**
 * Checks if we're in a tenant context (i.e. a subdomain is present).
 */
export function isTenantContext(): boolean {
  return detectTenant() !== null;
}
