import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-context";
import { authenticatedRequest } from "@/lib/auth";
import { Users, UserCheck, UserX, Shield, Settings, Search, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddAdmin, setShowAddAdmin] = useState(false);

  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/admin/applications"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/users/search", { q: searchQuery }],
    enabled: searchQuery.length > 2 && user?.role === 'owner',
  });

  const approveApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await authenticatedRequest("PUT", `/api/admin/applications/${applicationId}`, {
        status: "approved"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({
        title: "Application Approved",
        description: "User has been approved and can now access the platform",
      });
    },
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await authenticatedRequest("PUT", `/api/admin/applications/${applicationId}`, {
        status: "rejected"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({
        title: "Application Rejected",
        description: "User application has been rejected",
        variant: "destructive",
      });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await authenticatedRequest("POST", `/api/admin/users/${userId}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({
        title: "User Banned",
        description: "User has been banned from the platform",
        variant: "destructive",
      });
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      await authenticatedRequest("POST", "/api/admin/add-admin", { userId });
    },
    onSuccess: () => {
      setShowAddAdmin(false);
      setSearchQuery("");
      toast({
        title: "Admin Added",
        description: "User has been promoted to admin",
      });
    },
  });

  const handleApprove = (applicationId: string) => {
    approveApplicationMutation.mutate(applicationId);
  };

  const handleReject = (applicationId: string) => {
    rejectApplicationMutation.mutate(applicationId);
  };

  const handleBan = (userId: string) => {
    if (confirm("Are you sure you want to ban this user?")) {
      banUserMutation.mutate(userId);
    }
  };

  const handleAddAdmin = (userId: string) => {
    if (confirm("Are you sure you want to make this user an admin?")) {
      addAdminMutation.mutate(userId);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto p-4 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin dashboard.</p>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="admin-page">
      <Header />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-card border-r border-border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-primary" data-testid="admin-title">Admin Dashboard</h2>
          </div>
          
          <nav className="space-y-2">
            <div className="p-3 rounded-lg bg-primary text-primary-foreground">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Applications</span>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start" data-testid="nav-user-management">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </Button>
            <Button variant="ghost" className="w-full justify-start" data-testid="nav-reports">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reports
            </Button>
            {user.role === 'owner' && (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => setShowAddAdmin(true)}
                data-testid="nav-admin-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin Settings
              </Button>
            )}
          </nav>
        </aside>

        {/* Admin Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2" data-testid="page-title">Pending Applications</h1>
            <p className="text-muted-foreground">Review and approve student registrations for Austin Heights International School</p>
          </div>

          {/* Application Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-pending">
                  {applications.filter((app: any) => app.applicationStatus === 'pending').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Approved Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-approved">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total">
                  {applications.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          <div className="space-y-4" data-testid="applications-list">
            {applicationsLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-secondary rounded-lg animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-secondary rounded animate-pulse w-48" />
                        <div className="h-3 bg-secondary rounded animate-pulse w-32" />
                        <div className="h-3 bg-secondary rounded animate-pulse w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : applications.filter((app: any) => app.applicationStatus === 'pending').length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center" data-testid="no-applications">
                  <UserCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Applications</h3>
                  <p className="text-muted-foreground">All applications have been reviewed</p>
                </CardContent>
              </Card>
            ) : (
              applications
                .filter((app: any) => app.applicationStatus === 'pending')
                .map((application: any) => (
                  <Card key={application.id} className="hover:shadow-md transition-shadow" data-testid={`application-${application.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex space-x-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={application.avatar} alt={application.fullName} />
                            <AvatarFallback>
                              {application.fullName?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg" data-testid={`app-name-${application.id}`}>
                              {application.fullName}
                            </h3>
                            <p className="text-muted-foreground" data-testid={`app-username-${application.id}`}>
                              @{application.username}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`app-email-${application.id}`}>
                              {application.email}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`app-time-${application.id}`}>
                              Applied {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
                            </p>
                            <div className="mt-2">
                              <Badge variant="secondary" data-testid={`app-status-${application.id}`}>
                                Student ID Provided
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => setSelectedApplication(application)}
                            variant="outline"
                            size="sm"
                            data-testid={`button-view-${application.id}`}
                          >
                            View Details
                          </Button>
                          <Button
                            onClick={() => handleApprove(application.id)}
                            disabled={approveApplicationMutation.isPending}
                            size="sm"
                            data-testid={`button-approve-${application.id}`}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(application.id)}
                            disabled={rejectApplicationMutation.isPending}
                            variant="destructive"
                            size="sm"
                            data-testid={`button-reject-${application.id}`}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </main>
      </div>

      {/* Application Details Modal */}
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="sm:max-w-lg" data-testid="application-details-dialog">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedApplication.avatar} alt={selectedApplication.fullName} />
                  <AvatarFallback>
                    {selectedApplication.fullName?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedApplication.fullName}</h3>
                  <p className="text-muted-foreground">@{selectedApplication.username}</p>
                  <p className="text-sm text-muted-foreground">{selectedApplication.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium">Application Date:</label>
                  <p className="text-muted-foreground">
                    {new Date(selectedApplication.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="font-medium">Status:</label>
                  <p className="text-muted-foreground">Pending Review</p>
                </div>
              </div>

              {selectedApplication.studentIdImage && (
                <div>
                  <label className="font-medium block mb-2">Student ID Document:</label>
                  <div className="border border-border rounded-lg p-4 bg-secondary">
                    <p className="text-sm text-muted-foreground">Student ID image uploaded</p>
                    <p className="text-xs text-muted-foreground mt-1">Click to view full image</p>
                  </div>
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => {
                    handleApprove(selectedApplication.id);
                    setSelectedApplication(null);
                  }}
                  disabled={approveApplicationMutation.isPending}
                  className="flex-1"
                  data-testid="modal-button-approve"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve Application
                </Button>
                <Button
                  onClick={() => {
                    handleReject(selectedApplication.id);
                    setSelectedApplication(null);
                  }}
                  disabled={rejectApplicationMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                  data-testid="modal-button-reject"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Reject Application
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Admin Modal - Owner Only */}
      {user.role === 'owner' && (
        <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
          <DialogContent className="sm:max-w-md" data-testid="add-admin-dialog">
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-admin"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults
                  .filter((searchUser: any) => searchUser.role === 'user' && searchUser.applicationStatus === 'approved')
                  .map((searchUser: any) => (
                    <div
                      key={searchUser.id}
                      className="flex items-center justify-between p-3 hover:bg-secondary rounded-lg"
                      data-testid={`admin-candidate-${searchUser.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={searchUser.avatar} alt={searchUser.fullName} />
                          <AvatarFallback>
                            {searchUser.fullName?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{searchUser.fullName}</p>
                          <p className="text-xs text-muted-foreground">@{searchUser.username}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddAdmin(searchUser.id)}
                        disabled={addAdminMutation.isPending}
                        data-testid={`button-make-admin-${searchUser.id}`}
                      >
                        Make Admin
                      </Button>
                    </div>
                  ))}
              </div>

              {searchQuery.length > 2 && searchResults.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No users found</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <MobileNav />
    </div>
  );
}
