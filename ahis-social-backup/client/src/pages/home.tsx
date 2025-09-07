import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { StoryRing } from "@/components/posts/story-ring";
import { PostCard } from "@/components/posts/post-card";
import { CreatePost } from "@/components/posts/create-post";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-context";

export default function Home() {
  const { user } = useAuth();
  const [showCreatePost, setShowCreatePost] = useState(false);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/posts/feed"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["/api/posts/stories"],
  });

  if (postsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex lg:max-w-6xl lg:mx-auto">
          <Sidebar />
          <main className="flex-1 lg:max-w-lg lg:mx-auto">
            <div className="p-4">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border-0 border-b border-border rounded-none">
                    <CardContent className="p-4">
                      <div className="post-shimmer h-4 w-3/4 rounded mb-4" />
                      <div className="post-shimmer aspect-square rounded mb-4" />
                      <div className="post-shimmer h-4 w-1/2 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }

  // Group stories by user
  const groupedStories = stories.reduce((acc: any, story: any) => {
    if (!acc[story.user.id]) {
      acc[story.user.id] = story;
    }
    return acc;
  }, {});

  const uniqueStoryUsers = Object.values(groupedStories);

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <Header />
      
      <div className="flex lg:max-w-6xl lg:mx-auto">
        <Sidebar />
        
        <main className="flex-1 lg:max-w-lg lg:mx-auto mb-16 lg:mb-0">
          {/* Stories Section */}
          <section className="p-4 border-b border-border bg-card" data-testid="stories-section">
            <div className="flex space-x-4 overflow-x-auto hide-scrollbar">
              {/* Your Story */}
              <StoryRing
                isOwn
                onClick={() => setShowCreatePost(true)}
              />

              {/* Other Users' Stories */}
              {uniqueStoryUsers.map((story: any) => (
                <StoryRing
                  key={story.user.id}
                  user={story.user}
                  hasStory
                  onClick={() => {
                    // TODO: Open story viewer
                    console.log("View story:", story.user.username);
                  }}
                />
              ))}
            </div>
          </section>

          {/* Posts Feed */}
          <section className="divide-y divide-border" data-testid="posts-feed">
            {posts.length === 0 ? (
              <div className="p-8 text-center" data-testid="empty-feed">
                <h3 className="text-lg font-semibold mb-2">Welcome to AHIS Social!</h3>
                <p className="text-muted-foreground mb-4">
                  Follow other students to see their posts in your feed
                </p>
                <button 
                  onClick={() => setShowCreatePost(true)}
                  className="text-primary font-medium hover:underline"
                  data-testid="button-create-first-post"
                >
                  Create your first post
                </button>
              </div>
            ) : (
              posts.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </section>

          {/* Load More */}
          {posts.length > 0 && (
            <div className="p-8 text-center" data-testid="load-more-section">
              <div className="post-shimmer h-4 w-32 mx-auto rounded"></div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Desktop Only */}
        <aside className="hidden xl:block w-80 p-6 bg-card" data-testid="right-sidebar">
          <div className="space-y-6">
            {/* Recent Activity */}
            <div>
              <h4 className="font-semibold mb-3">Activity</h4>
              <div className="space-y-3 text-sm">
                <p><span className="font-medium">Loading...</span></p>
              </div>
            </div>

            {/* School Info */}
            <div className="bg-secondary p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Austin Heights International School</h4>
              <p className="text-sm text-muted-foreground">
                Connect with your classmates and share your school experiences!
              </p>
              <button className="mt-3 text-primary text-sm font-medium">Learn More</button>
            </div>
          </div>
        </aside>
      </div>

      <MobileNav />

      <CreatePost 
        isOpen={showCreatePost} 
        onClose={() => setShowCreatePost(false)} 
      />
    </div>
  );
}
