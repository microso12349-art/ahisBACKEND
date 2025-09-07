import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-context";
import { authenticatedRequest } from "@/lib/auth";
import { 
  Settings as SettingsIcon, 
  User, 
  Lock, 
  Shield, 
  Moon, 
  Sun, 
  UserX, 
  Users, 
  ChevronRight,
  LogOut,
  Camera
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [darkMode, setDarkMode] = useState(false);
  const [privateAccount, setPrivateAccount] = useState(user?.isPrivate || false);
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Initialize dark mode from localStorage
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await authenticatedRequest("PUT", `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      await authenticatedRequest("PUT", `/api/users/${user?.id}/password`, data);
    },
    onSuccess: () => {
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully",
      });
    },
  });

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handlePrivacyToggle = (isPrivate: boolean) => {
    setPrivateAccount(isPrivate);
    updateUserMutation.mutate({ isPrivate });
  };

  const handleUsernameChange = () => {
    if (newUsername.trim() && newUsername !== user?.username) {
      updateUserMutation.mutate({ username: newUsername.trim() });
      setShowChangeUsername(false);
    }
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto p-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <p className="text-muted-foreground">You need to be logged in to access settings.</p>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="settings-page">
      <Header />
      
      <main className="max-w-2xl mx-auto p-4 mb-16 lg:mb-0">
        <div className="flex items-center space-x-2 mb-6">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold" data-testid="settings-title">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user.avatar} alt={user.fullName} />
                    <AvatarFallback>
                      {user.fullName?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    data-testid="button-change-avatar"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <h3 className="font-semibold text-lg" data-testid="profile-name">{user.fullName}</h3>
                  <p className="text-muted-foreground" data-testid="profile-username">@{user.username}</p>
                  <p className="text-sm text-muted-foreground" data-testid="profile-email">{user.email}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Dialog open={showChangeUsername} onOpenChange={setShowChangeUsername}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-auto py-3"
                      data-testid="button-change-username"
                    >
                      <span>Change Username</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="change-username-dialog">
                    <DialogHeader>
                      <DialogTitle>Change Username</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new-username">New Username</Label>
                        <Input
                          id="new-username"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="Enter new username"
                          data-testid="input-new-username"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleUsernameChange}
                          disabled={updateUserMutation.isPending || !newUsername.trim()}
                          className="flex-1"
                          data-testid="button-save-username"
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowChangeUsername(false)}
                          className="flex-1"
                          data-testid="button-cancel-username"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Separator />

                <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-auto py-3"
                      data-testid="button-change-password"
                    >
                      <span>Change Password</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="change-password-dialog">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          data-testid="input-current-password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          data-testid="input-new-password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          data-testid="input-confirm-password"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handlePasswordChange}
                          disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                          className="flex-1"
                          data-testid="button-save-password"
                        >
                          Change Password
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowChangePassword(false)}
                          className="flex-1"
                          data-testid="button-cancel-password"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="private-account" className="text-base">Private Account</Label>
                  <p className="text-sm text-muted-foreground">
                    When your account is private, only people you approve can see your posts
                  </p>
                </div>
                <Switch
                  id="private-account"
                  checked={privateAccount}
                  onCheckedChange={handlePrivacyToggle}
                  disabled={updateUserMutation.isPending}
                  data-testid="switch-private-account"
                />
              </div>

              <Separator />

              <Dialog open={showBlockedUsers} onOpenChange={setShowBlockedUsers}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto py-3"
                    data-testid="button-blocked-users"
                  >
                    <div className="flex items-center space-x-2">
                      <UserX className="h-4 w-4" />
                      <span>Blocked Users</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="blocked-users-dialog">
                  <DialogHeader>
                    <DialogTitle>Blocked Users</DialogTitle>
                  </DialogHeader>
                  <div className="text-center py-8" data-testid="no-blocked-users">
                    <UserX className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Blocked Users</h3>
                    <p className="text-muted-foreground">You haven't blocked anyone yet</p>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-3"
                data-testid="button-close-friends"
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Close Friends</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode" className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={toggleDarkMode}
                  data-testid="switch-dark-mode"
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Account</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
