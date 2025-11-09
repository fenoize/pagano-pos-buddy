import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { formatRunas } from '@/lib/utils';
import { Coins } from 'lucide-react';
import { Footer } from '@/components/ui/footer';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';

interface CustomerLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
}

export function CustomerLayout({ children, title, showBackButton = true }: CustomerLayoutProps) {
  const navigate = useNavigate();
  const { user, customer, signOut } = useCustomerAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </div>

          <div className="flex items-center gap-4">
            {customer && (
              <Badge variant="secondary" className="text-sm hidden sm:flex">
                <Coins className="w-4 h-4 mr-1" />
                {formatRunas(customer.cantidad_runas || 0)} runas
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={customer?.avatar_url || undefined} />
                    <AvatarFallback>
                      {customer?.nombres?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={customer?.avatar_url || undefined} />
                    <AvatarFallback>
                      {customer?.nombres?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{customer?.name || user?.email}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/portal')}>
                  <User className="mr-2 h-4 w-4" />
                  Mi Portal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container py-6 px-4 flex-1">
        {children}
      </main>
      
      <CustomerBottomNav />
    </div>
  );
}
