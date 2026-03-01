import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'elections': 'Elections',
  'voters': 'Voters',
  'parts': 'Parts/Booths',
  'parts/add': 'Add Part',
  'parts/map': 'Part Map',
  'parts/vulnerability': 'Vulnerability',
  'parts/booth-committee': 'Booth Committee',
  'parts/bla2': 'BLA-2',
  'sections': 'Sections',
  'cadres': 'Cadres',
  'families': 'Families',
  'families/captains': 'Family Captains',
  'master-data': 'Master Data',
  'surveys': 'Surveys',
  'campaigns': 'Campaigns',
  'poll-day': 'Poll Day',
  'poll-day/voter-slips': 'Voter Slips',
  'analytics': 'Analytics',
  'ai-analytics': 'AI Analytics',
  'ai-tools': 'AI Tools',
  'reports': 'Reports',
  'datacaffe': 'DataCaffe',
  'ec-data': 'EC Data',
  'news': 'News & Info',
  'actions': 'Actions',
  'locality-analysis': 'Locality Analysis',
  'candidates': 'Candidates',
  'nominations': 'Nominations',
  'funds': 'Funds',
  'inventory': 'Inventory',
  'settings': 'Settings',
  'settings/banners': 'App Banners',
  'settings/organization': 'Organization Setup',
  'settings/database': 'Database Settings',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) return null;

  // Build breadcrumb items
  const breadcrumbs: { label: string; path: string; isLast: boolean }[] = [];

  for (let i = 0; i < pathSegments.length; i++) {
    const fullPath = pathSegments.slice(0, i + 1).join('/');
    const label = ROUTE_LABELS[fullPath];

    // Skip UUID-like segments (voter detail, etc.)
    if (!label && pathSegments[i].length > 20) continue;

    if (label) {
      breadcrumbs.push({
        label,
        path: '/' + fullPath,
        isLast: i === pathSegments.length - 1,
      });
    }
  }

  if (breadcrumbs.length === 0) return null;

  return (
    <nav className="hidden md:flex items-center gap-1.5 text-sm">
      <Link
        to="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <HomeIcon className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb) => (
        <div key={crumb.path} className="flex items-center gap-1.5">
          <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
