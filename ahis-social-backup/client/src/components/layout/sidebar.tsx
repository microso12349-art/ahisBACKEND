import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedRequest } from "@/lib/auth";

export function Sidebar() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["/api/users", user?.id, "stats"],
    enabled: !!user,
  });

  const { data: suggestedUsers = [] } = useQuery({
    queryKey: ["/api/users/suggested"],
    enabled: !!user,
  });

  const { data: closeFriends = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "close-friends"],
    enabled: !!user,
  });

  const handleFollow = async (userId: string) => {
    try {
      await authenticatedRequest("POST", `/api/users/${userId}/follow`);
      // Invalidate relevant queries
    } catch (error) {
      console.error("Failed to follow user:", error);
    }
  };

  return (
    <aside className="hidden lg:block w-72 p-6 border-r border-border bg-card min-h-screen">
      <div className="space-y-6">
        {/* Profile Summary */}
        <div className="flex items-center space-x-3" data-testid="sidebar-profile">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user?.avatar} alt={user?.fullName} />
            <AvatarFallback>
              {user?.fullName?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold" data-testid="sidebar-fullname">{user?.fullName}</h3>
            <p className="text-sm text-muted-foreground" data-testid="sidebar-username">@{user?.username}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center" data-testid="sidebar-stats">
          <div>
            <p className="font-semibold" data-testid="stats-posts">{stats?.postsCount || 0}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div>
            <p className="font-semibold" data-testid="stats-following">{stats?.followingCount || 0}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
          <div>
            <p className="font-semibold" data-testid="stats-followers">{stats?.followersCount || 0}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
        </div>

        {/* Suggested Follows */}
        {suggestedUsers.length > 0 && (
          <div data-testid="suggested-users-section">
            <h4 className="font-semibold mb-3">Suggested for you</h4>
            <div className="space-y-3">
              {suggestedUsers.slice(0, 5).map((suggestedUser: any) => (
                <div key={suggestedUser.id} className="flex items-center justify-between" data-testid={`suggested-user-${suggestedUser.id}`}>
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={suggestedUser.avatar} alt={suggestedUser.fullName} />
                      <AvatarFallback>
                        {suggestedUser.fullName?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{suggestedUser.fullName}</p>
                      <p className="text-xs text-muted-foreground">@{suggestedUser.username}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFollow(suggestedUser.id)}
                    className="text-primary text-sm font-medium"
                    data-testid={`button-follow-${suggestedUser.id}`}
                  >
                    Follow
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Friends */}
        {closeFriends.length > 0 && (
          <div data-testid="close-friends-section">
            <h4 className="font-semibold mb-3">Close Friends</h4>
            <div className="space-y-3">
              {closeFriends.slice(0, 3).map((friend: any) => (
                <div key={friend.id} className="flex items-center space-x-3" data-testid={`close-friend-${friend.id}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={friend.avatar} alt={friend.fullName} />
                    <AvatarFallback>
                      {friend.fullName?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{friend.fullName}</p>
                    <p className="text-xs text-muted-foreground">Active now</p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* School Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Austin Heights International School</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Connect with your classmates and share your school experiences!
            </p>
            <Button size="sm" variant="ghost" className="text-primary text-sm font-medium">
              Learn More
            </Button>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
