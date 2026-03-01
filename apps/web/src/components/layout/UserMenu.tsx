import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useTenantStore } from '../../store/tenant';
import { getInitials } from '../../lib/utils';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { LogOutIcon, ChevronDownIcon } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const { clearBranding } = useTenantStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    clearBranding();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-9">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-brand/10 text-brand text-xs font-medium">
              {user ? getInitials(`${user.firstName} ${user.lastName || ''}`) : 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline-block text-sm">
            {user?.firstName}
          </span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground font-normal">{user?.mobile}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
          <LogOutIcon className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
