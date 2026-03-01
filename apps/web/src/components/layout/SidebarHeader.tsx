import { NavLink } from 'react-router-dom';
import { useTenantStore } from '../../store/tenant';
import { useSidebarStore } from '../../store/sidebar';
import { cn } from '../../lib/utils';

export function SidebarHeader() {
  const { branding } = useTenantStore();
  const { collapsed } = useSidebarStore();

  const tenantDisplayName = branding?.displayName || branding?.name || '';

  return (
    <div
      className={cn('flex items-center h-16 px-3 border-b', collapsed ? 'justify-center' : 'justify-start')}
      style={{ borderColor: 'hsl(var(--sidebar-border))' }}
    >
      <NavLink
        to="/dashboard"
        className={cn(
          'flex items-center gap-3 min-w-0 cursor-pointer',
          collapsed && 'justify-center'
        )}
      >
        {/* Logo */}
        {(branding?.logoUrl && branding?.logoPosition !== 'after') ? (
          <img
            src={branding.logoUrl}
            alt={tenantDisplayName}
            className="rounded-lg object-cover flex-shrink-0 h-[4.25rem] w-[4.25rem]"
          />
        ) : (
          <img
            src="/logo-light.png"
            alt="ElectionCaffe"
            className="object-contain flex-shrink-0 rounded-lg h-12 w-12 bg-white p-1"
          />
        )}

        {/* Text — hidden when collapsed */}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold truncate uppercase" style={{ color: 'hsl(var(--sidebar-foreground-active))' }}>
              {tenantDisplayName || 'ElectionCaffe'}
            </div>
          </div>
        )}

        {/* Logo after name */}
        {branding?.logoUrl && branding?.logoPosition === 'after' && !collapsed && (
          <img
            src={branding.logoUrl}
            alt={tenantDisplayName}
            className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
          />
        )}
      </NavLink>
    </div>
  );
}
