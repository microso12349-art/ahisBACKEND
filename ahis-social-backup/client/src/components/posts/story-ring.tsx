import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface StoryRingProps {
  user?: {
    id: string;
    username: string;
    fullName: string;
    avatar?: string;
  };
  hasStory?: boolean;
  isOwn?: boolean;
  onClick?: () => void;
}

export function StoryRing({ user, hasStory = false, isOwn = false, onClick }: StoryRingProps) {
  if (isOwn) {
    return (
      <div className="flex flex-col items-center space-y-1 flex-shrink-0" data-testid="story-ring-own">
        <Button
          variant="ghost"
          className="relative p-0 h-16 w-16 rounded-full"
          onClick={onClick}
          data-testid="button-add-story"
        >
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-muted-foreground">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
        </Button>
        <p className="text-xs text-center">Your Story</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-1 flex-shrink-0" data-testid={`story-ring-${user?.id}`}>
      <Button
        variant="ghost"
        className="relative p-0 h-16 w-16 rounded-full"
        onClick={onClick}
        data-testid={`button-view-story-${user?.id}`}
      >
        <div className={`${hasStory ? 'story-gradient p-0.5' : ''} rounded-full`}>
          <Avatar className={`w-16 h-16 ${hasStory ? 'border-2 border-background' : ''}`}>
            <AvatarImage src={user?.avatar} alt={user?.fullName} />
            <AvatarFallback className="bg-secondary">
              {user?.fullName?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </Button>
      <p className="text-xs text-center truncate w-16" data-testid={`story-username-${user?.id}`}>
        {user?.username}
      </p>
    </div>
  );
}
