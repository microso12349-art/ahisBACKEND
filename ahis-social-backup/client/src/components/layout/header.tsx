import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { Search, Home, MessageCircle, PlusCircle, Heart, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log("Search query:", searchQuery);
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-border bg-card sticky top-0 z-50">
        <div className="flex items-center space-x-8">
          <Link href="/">
            <h1 className="text-2xl font-bold text-primary cursor-pointer" data-testid="logo-desktop">
              AHIS Social
            </h1>
          </Link>
          
          <form onSubmit={handleSearch} className="relative w-80">
            <Input
              type="text"
              placeholder="Search users, posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2"
              data-testid="input-search-desktop"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </form>
        </div>
        
        <nav className="flex items-center space-x-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="nav-home-desktop">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/messages">
            <Button variant="ghost" size="sm" data-testid="nav-messages-desktop">
              <MessageCircle className="h-5 w-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" data-testid="nav-create-desktop">
            <PlusCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="nav-notifications-desktop">
            <Heart className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild data-testid="profile-dropdown-trigger">
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.fullName} />
                  <AvatarFallback>
                    {user?.fullName?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">@{user?.username}</p>
                </div>
              </DropdownMenuItem>
              <Link href={`/profile/${user?.id}`}>
                <DropdownMenuItem data-testid="menu-profile">
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link href="/settings">
                <DropdownMenuItem data-testid="menu-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </Link>
              {(user?.role === 'admin' || user?.role === 'owner') && (
                <Link href="/admin">
                  <DropdownMenuItem data-testid="menu-admin">
                    Admin Dashboard
                  </DropdownMenuItem>
                </Link>
              )}
              <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-50">
        <Link href="/">
          <h1 className="text-xl font-bold text-primary" data-testid="logo-mobile">
            AHIS Social
          </h1>
        </Link>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" data-testid="nav-create-mobile">
            <PlusCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="nav-notifications-mobile">
            <Heart className="h-5 w-5" />
          </Button>
          <Link href="/messages">
            <Button variant="ghost" size="sm" data-testid="nav-messages-mobile">
              <MessageCircle className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>
    </>
  );
}
