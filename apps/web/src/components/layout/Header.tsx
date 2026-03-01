import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSidebarStore } from '../../store/sidebar';
import { MenuIcon, SparklesIcon } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';
import { aiAPI } from '../../services/api';

export function Header() {
  const { setMobileOpen } = useSidebarStore();
  const navigate = useNavigate();

  const { data: creditsResponse } = useQuery({
    queryKey: ['ai-credits-header'],
    queryFn: () => aiAPI.getCredits(),
    refetchInterval: 60000,
  });
  const creditBalance = creditsResponse?.data?.data?.balance ?? 0;

  return (
    <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-md border-b shadow-sm flex items-center justify-between px-4 gap-4">
      {/* Left: Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <Breadcrumbs />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate('/ai-tools')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer mr-1"
          title="CaffeAI Credits"
        >
          <SparklesIcon className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-700">{creditBalance.toLocaleString()}</span>
        </button>
        <ThemeToggle />
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
