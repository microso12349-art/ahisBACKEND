import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, PlusCircle, Heart, User } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";

export function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { href: "/", icon: Home, label: "Home", testId: "nav-home" },
    { href: "/search", icon: Search, label: "Search", testId: "nav-search" },
    { href: "/create", icon: PlusCircle, label: "Create", testId: "nav-create" },
    { href: "/notifications", icon: Heart, label: "Notifications", testId: "nav-notifications" },
    { href: `/profile/${user?.id}`, icon: User, label: "Profile", testId: "nav-profile" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || 
            (item.href.startsWith('/profile') && location.startsWith('/profile'));
          
          return (
            <Link key={item.href} href={item.href}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`p-3 ${isActive ? 'text-primary' : ''}`}
                data-testid={item.testId}
              >
                <Icon className="h-6 w-6" />
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
