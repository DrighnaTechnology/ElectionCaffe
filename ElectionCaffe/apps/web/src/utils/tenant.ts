// Tenant detection utility
// Detects tenant from URL subdomain or path

export interface TenantConfig {
  slug: string;
  name: string;
  port?: number;
}

// Tenant configurations for local development
// Note: Ports 5174 (Super Admin uses this) and 5176 (Super Admin backup) are reserved
const TENANT_CONFIGS: Record<string, TenantConfig> = {
  'demo': { slug: 'demo', name: 'Demo Organization', port: 5180 },
  'bjp-tn': { slug: 'bjp-tn', name: 'BJP Tamil Nadu', port: 5181 },
  'bjp-up': { slug: 'bjp-up', name: 'BJP Uttar Pradesh', port: 5182 },
  'aidmk-tn': { slug: 'aidmk-tn', name: 'AIDMK Tamil Nadu', port: 5183 },
};

// Port to tenant mapping for local development
const PORT_TO_TENANT: Record<number, string> = {
  5180: 'demo',
  5181: 'bjp-tn',
  5182: 'bjp-up',
  5183: 'aidmk-tn',
  5177: 'demo', // Default tenant app currently running on 5177
};

/**
 * Detects the current tenant from the URL
 * Priority:
 * 1. Subdomain (e.g., bjp-tn.electioncaffe.com)
 * 2. Port-based mapping for local development
 * 3. Path-based (e.g., /tenant/bjp-tn/...)
 */
export function detectTenant(): TenantConfig | null {
  const hostname = window.location.hostname;
  const port = parseInt(window.location.port, 10);
  const pathname = window.location.pathname;

  // 1. Check subdomain (production)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (TENANT_CONFIGS[subdomain]) {
      return TENANT_CONFIGS[subdomain];
    }
  }

  // 2. Check port mapping (local development)
  if (PORT_TO_TENANT[port]) {
    const slug = PORT_TO_TENANT[port];
    return TENANT_CONFIGS[slug];
  }

  // 3. Check path-based tenant (e.g., /tenant/bjp-tn)
  const pathMatch = pathname.match(/^\/tenant\/([^\/]+)/);
  if (pathMatch && TENANT_CONFIGS[pathMatch[1]]) {
    return TENANT_CONFIGS[pathMatch[1]];
  }

  return null;
}

/**
 * Gets the current tenant slug
 */
export function getTenantSlug(): string | undefined {
  const tenant = detectTenant();
  return tenant?.slug;
}

/**
 * Gets the current tenant name
 */
export function getTenantName(): string | undefined {
  const tenant = detectTenant();
  return tenant?.name;
}

/**
 * Checks if we're in a tenant context
 */
export function isTenantContext(): boolean {
  return detectTenant() !== null;
}

/**
 * Gets all available tenant configurations
 */
export function getAllTenants(): TenantConfig[] {
  return Object.values(TENANT_CONFIGS);
}

/**
 * Gets the URL for a specific tenant (for local development)
 */
export function getTenantUrl(slug: string): string {
  const tenant = TENANT_CONFIGS[slug];
  if (tenant?.port) {
    return `http://localhost:${tenant.port}`;
  }
  // Production subdomain URL
  return `https://${slug}.electioncaffe.com`;
}
