import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play } from "lucide-react";
import { authenticatedRequest } from "@/lib/auth";
import { useAuth } from "@/components/auth/auth-context";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: {
    id: string;
    content?: string;
    mediaUrls: string[];
    type: string;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    isLiked?: boolean;
    user: {
      id: string;
      username: string;
      fullName: string;
      avatar?: string;
      isVerified: boolean;
    };
  };
}

export function PostCard({ post }: PostCardProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (post.isLiked) {
        await authenticatedRequest("DELETE", `/api/posts/${post.id}/like`);
      } else {
        await authenticatedRequest("POST", `/api/posts/${post.id}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      await authenticatedRequest("POST", `/api/posts/${post.id}/comments`, { content });
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id, "comments"] });
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      commentMutation.mutate(comment);
    }
  };

  return (
    <Card className="border-0 border-b border-border rounded-none" data-testid={`post-${post.id}`}>
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3" data-testid={`post-header-${post.id}`}>
            <Avatar className="w-8 h-8">
              <AvatarImage src={post.user.avatar} alt={post.user.fullName} />
              <AvatarFallback>
                {post.user.fullName?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-1">
                <p className="font-semibold text-sm" data-testid={`post-username-${post.id}`}>
                  {post.user.username}
                </p>
                {post.user.isVerified && (
                  <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs text-primary-foreground">✓</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground" data-testid={`post-time-${post.id}`}>
                Austin Heights • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" data-testid={`post-menu-${post.id}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Post Media */}
        {post.mediaUrls.length > 0 && (
          <div className="aspect-square bg-secondary bg-cover bg-center relative" data-testid={`post-media-${post.id}`}>
            {post.type === 'reel' && (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                    <Play className="h-6 w-6 text-white ml-1" />
                  </div>
                </div>
                <span className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  REEL
                </span>
              </>
            )}
            {/* Image/video would be rendered here */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}

        {/* Post Actions */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLike}
                disabled={likeMutation.isPending}
                data-testid={`button-like-${post.id}`}
              >
                <Heart 
                  className={`h-6 w-6 ${post.isLiked ? 'fill-current text-red-500' : ''}`} 
                />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowComments(!showComments)}
                data-testid={`button-comment-${post.id}`}
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="sm" data-testid={`button-share-${post.id}`}>
                <Send className="h-6 w-6" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" data-testid={`button-bookmark-${post.id}`}>
              <Bookmark className="h-6 w-6" />
            </Button>
          </div>

          {/* Post Stats */}
          <p className="font-semibold text-sm mb-1" data-testid={`post-likes-${post.id}`}>
            {post.likesCount} likes
          </p>
          
          {/* Post Caption */}
          {post.content && (
            <div className="text-sm mb-2" data-testid={`post-content-${post.id}`}>
              <span className="font-semibold">{post.user.username}</span>{" "}
              <span>{post.content}</span>
            </div>
          )}

          {/* Comments */}
          {post.commentsCount > 0 && (
            <button 
              className="text-muted-foreground text-sm mb-2"
              onClick={() => setShowComments(!showComments)}
              data-testid={`button-view-comments-${post.id}`}
            >
              View all {post.commentsCount} comments
            </button>
          )}

          {/* Add Comment */}
          <form onSubmit={handleComment} className="flex items-center space-x-3 mt-3 pt-3 border-t border-border">
            <Avatar className="w-6 h-6">
              <AvatarImage src={currentUser?.avatar} alt={currentUser?.fullName} />
              <AvatarFallback>
                {currentUser?.fullName?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Input
              type="text"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 border-0 bg-transparent placeholder:text-muted-foreground focus:ring-0"
              data-testid={`input-comment-${post.id}`}
            />
            <Button 
              type="submit" 
              variant="ghost" 
              size="sm" 
              disabled={!comment.trim() || commentMutation.isPending}
              data-testid={`button-post-comment-${post.id}`}
            >
              Post
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
