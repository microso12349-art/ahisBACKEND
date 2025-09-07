import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";

interface MessageListProps {
  conversations: any[];
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
  currentUserId: string;
}

export function MessageList({ 
  conversations, 
  selectedConversation, 
  onSelectConversation, 
  currentUserId 
}: MessageListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center" data-testid="no-conversations">
        <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-muted-foreground">Start chatting with your classmates!</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto" data-testid="conversations-list">
      {conversations.map((conversation) => {
        // Get other participants (exclude current user)
        const otherParticipants = conversation.participants?.filter((id: string) => id !== currentUserId) || [];
        const isGroup = conversation.isGroup || otherParticipants.length > 1;
        
        // For display purposes, we'll show the conversation name or first participant
        const displayName = isGroup 
          ? (conversation.groupName || "Group Chat")
          : "Direct Message"; // In a real app, you'd fetch user details
        
        const isSelected = selectedConversation === conversation.id;
        const hasUnread = false; // TODO: Implement unread message tracking
        
        return (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`p-4 border-b border-border hover:bg-secondary cursor-pointer transition-colors ${
              isSelected ? 'bg-secondary' : ''
            }`}
            data-testid={`conversation-${conversation.id}`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                {isGroup ? (
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                ) : (
                  <Avatar className="w-12 h-12">
                    <AvatarImage src="" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                )}
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`font-medium truncate ${hasUnread ? 'font-semibold' : ''}`} data-testid={`conversation-name-${conversation.id}`}>
                    {displayName}
                  </p>
                  {conversation.lastMessageAt && (
                    <span className="text-xs text-muted-foreground" data-testid={`conversation-time-${conversation.id}`}>
                      {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true }).replace('about ', '')}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <p className={`text-sm text-muted-foreground truncate ${hasUnread ? 'font-medium text-foreground' : ''}`} data-testid={`conversation-preview-${conversation.id}`}>
                    {conversation.lastMessage || "No messages yet"}
                  </p>
                  {hasUnread && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" data-testid={`unread-indicator-${conversation.id}`}></div>
                  )}
                </div>
                
                {isGroup && (
                  <p className="text-xs text-muted-foreground" data-testid={`group-member-count-${conversation.id}`}>
                    {otherParticipants.length + 1} members
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
