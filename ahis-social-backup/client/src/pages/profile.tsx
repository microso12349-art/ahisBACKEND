import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PostCard } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-context";
import { authenticatedRequest } from "@/lib/auth";
import { Settings, UserPlus, UserMinus, MessageCircle, Grid, Heart, Bookmark, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/profile/:id?");
  const profileUserId = params?.id || currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users", profileUserId],
    enabled: !!profileUserId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/users", profileUserId, "posts"],
    enabled: !!profileUserId,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["/api/users", profileUserId, "followers"],
    enabled: !!profileUserId,
  });

  const { data: following = [] } = useQuery({
    queryKey: ["/api/users", profileUserId, "following"],
    enabled: !!profileUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (user?.isFollowing) {
        await authenticatedRequest("DELETE", `/api/users/${profileUserId}/follow`);
      } else {
        await authenticatedRequest("POST", `/api/users/${profileUserId}/follow`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", profileUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", profileUserId, "followers"] });
      toast({
        title: user?.isFollowing ? "Unfollowed" : "Following",
        description: user?.isFollowing 
          ? `You unfollowed ${user.fullName}` 
          : `You are now following ${user.fullName}`,
      });
    },
  });

  const handleFollow = () => {
    followMutation.mutate();
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8 mb-8">
            <div className="w-32 h-32 rounded-full bg-secondary animate-pulse" />
            <div className="flex-1 space-y-4">
              <div className="h-6 bg-secondary rounded animate-pulse w-48" />
              <div className="h-4 bg-secondary rounded animate-pulse w-64" />
              <div className="h-4 bg-secondary rounded animate-pulse w-32" />
            </div>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto p-4 text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <p className="text-muted-foreground">The profile you're looking for doesn't exist or has been removed.</p>
        </div>
        <MobileNav />
      </div>
    );
  }

  const userPosts = posts.filter((post: any) => post.type !== 'story');
  const reels = posts.filter((post: any) => post.type === 'reel');

  return (
    <div className="min-h-screen bg-background" data-testid="profile-page">
      <Header />
      
      <main className="max-w-4xl mx-auto p-4 mb-16 lg:mb-0">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8 mb-8" data-testid="profile-header">
          <Avatar className="w-32 h-32">
            <AvatarImage src={user.avatar} alt={user.fullName} />
            <AvatarFallback className="text-4xl">
              {user.fullName?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center justify-center md:justify-start space-x-2" data-testid="profile-username">
                  <span>{user.username}</span>
                  {user.isVerified && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs text-primary-foreground">✓</span>
                    </div>
                  )}
                </h1>
                <p className="text-lg text-muted-foreground" data-testid="profile-fullname">{user.fullName}</p>
              </div>

              <div className="flex space-x-2">
                {isOwnProfile ? (
                  <Button variant="outline" data-testid="button-edit-profile">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleFollow}
                      disabled={followMutation.isPending}
                      variant={user.isFollowing ? "outline" : "default"}
                      data-testid="button-follow"
                    >
                      {user.isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button variant="outline" data-testid="button-message">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex justify-center md:justify-start space-x-8 mb-4" data-testid="profile-stats">
              <div className="text-center">
                <p className="font-semibold text-lg" data-testid="stats-posts">{userPosts.length}</p>
                <p className="text-sm text-muted-foreground">posts</p>
              </div>
              <button 
                onClick={() => setShowFollowers(true)}
                className="text-center hover:opacity-80"
                data-testid="button-show-followers"
              >
                <p className="font-semibold text-lg">{user.followersCount || followers.length}</p>
                <p className="text-sm text-muted-foreground">followers</p>
              </button>
              <button 
                onClick={() => setShowFollowing(true)}
                className="text-center hover:opacity-80"
                data-testid="button-show-following"
              >
                <p className="font-semibold text-lg">{user.followingCount || following.length}</p>
                <p className="text-sm text-muted-foreground">following</p>
              </button>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-sm mb-4" data-testid="profile-bio">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts" className="flex items-center space-x-2" data-testid="tab-posts">
              <Grid className="h-4 w-4" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="reels" className="flex items-center space-x-2" data-testid="tab-reels">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Reels</span>
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="saved" className="flex items-center space-x-2" data-testid="tab-saved">
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Saved</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="posts" className="mt-6" data-testid="posts-grid">
            {userPosts.length === 0 ? (
              <div className="text-center py-12" data-testid="no-posts">
                <Grid className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Posts Yet</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile ? "Share your first post!" : `${user.fullName} hasn't posted anything yet.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPosts.map((post: any) => (
                  <div key={post.id} className="aspect-square bg-secondary rounded-lg relative group cursor-pointer" data-testid={`post-thumbnail-${post.id}`}>
                    {post.mediaUrls.length > 0 ? (
                      <div className="w-full h-full bg-cover bg-center rounded-lg" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary rounded-lg">
                        <p className="text-sm text-center p-4 line-clamp-3">{post.content}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center space-x-4 text-white">
                        <div className="flex items-center space-x-1">
                          <Heart className="h-5 w-5" />
                          <span>{post.likesCount}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-5 w-5" />
                          <span>{post.commentsCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reels" className="mt-6" data-testid="reels-grid">
            {reels.length === 0 ? (
              <div className="text-center py-12" data-testid="no-reels">
                <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Reels Yet</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile ? "Create your first reel!" : `${user.fullName} hasn't shared any reels yet.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {reels.map((reel: any) => (
                  <div key={reel.id} className="aspect-[9/16] bg-secondary rounded-lg relative group cursor-pointer" data-testid={`reel-thumbnail-${reel.id}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white text-xl">▶</span>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs truncate">{reel.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="saved" className="mt-6" data-testid="saved-posts">
              <div className="text-center py-12">
                <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Saved Posts</h3>
                <p className="text-muted-foreground">Save posts you want to see again</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Followers Modal */}
      <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
        <DialogContent className="sm:max-w-md" data-testid="followers-dialog">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {followers.map((follower: any) => (
              <div key={follower.id} className="flex items-center space-x-3" data-testid={`follower-${follower.id}`}>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={follower.avatar} alt={follower.fullName} />
                  <AvatarFallback>
                    {follower.fullName?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{follower.fullName}</p>
                  <p className="text-sm text-muted-foreground">@{follower.username}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Modal */}
      <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
        <DialogContent className="sm:max-w-md" data-testid="following-dialog">
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {following.map((followedUser: any) => (
              <div key={followedUser.id} className="flex items-center space-x-3" data-testid={`following-${followedUser.id}`}>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={followedUser.avatar} alt={followedUser.fullName} />
                  <AvatarFallback>
                    {followedUser.fullName?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{followedUser.fullName}</p>
                  <p className="text-sm text-muted-foreground">@{followedUser.username}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
