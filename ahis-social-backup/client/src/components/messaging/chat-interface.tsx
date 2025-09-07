import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { authenticatedRequest } from "@/lib/auth";
import { Send, Phone, Video, Info, Plus, Mic, Image, Smile } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatInterfaceProps {
  conversationId: string;
  currentUserId: string;
  onSendMessage: (message: any) => void;
}

export function ChatInterface({ conversationId, currentUserId, onSendMessage }: ChatInterfaceProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation } = useQuery({
    queryKey: ["/api/conversations", conversationId],
    enabled: !!conversationId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      // Send via WebSocket for real-time delivery
      onSendMessage({
        type: 'new_message',
        conversationId,
        content: messageData.content,
        messageType: messageData.messageType || 'text'
      });

      // Also store in database via HTTP API
      await authenticatedRequest("POST", `/api/conversations/${conversationId}/messages`, messageData);
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      scrollToBottom();
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate({
        content: message.trim(),
        messageType: 'text'
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Implement file upload
      console.log("File selected:", file.name);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-conversation">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // Get other participants (exclude current user)
  const otherParticipants = conversation.participants?.filter((id: string) => id !== currentUserId) || [];
  const isGroup = conversation.isGroup || otherParticipants.length > 1;

  return (
    <div className="flex flex-col h-full" data-testid={`chat-interface-${conversationId}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card" data-testid="chat-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isGroup ? (
              <div className="relative w-10 h-10">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold">
                    {conversation.groupName?.charAt(0)?.toUpperCase() || "G"}
                  </span>
                </div>
              </div>
            ) : (
              <Avatar className="w-10 h-10">
                <AvatarImage src="" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
            <div>
              <h3 className="font-semibold" data-testid="chat-title">
                {isGroup ? (conversation.groupName || "Group Chat") : "Direct Message"}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid="chat-status">
                {isGroup ? `${otherParticipants.length + 1} members` : "Active now"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" data-testid="button-voice-call">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-video-call">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-conversation-info">
              <Info className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8" data-testid="no-messages">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isOwn = msg.sender.id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${msg.id}`}
              >
                <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwn && (
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={msg.sender.avatar} alt={msg.sender.fullName} />
                      <AvatarFallback className="text-xs">
                        {msg.sender.fullName?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary rounded-bl-sm'
                    }`}
                  >
                    {!isOwn && isGroup && (
                      <p className="text-xs font-medium mb-1" data-testid={`message-sender-${msg.id}`}>
                        {msg.sender.fullName}
                      </p>
                    )}
                    
                    {msg.messageType === 'text' && (
                      <p className="text-sm" data-testid={`message-content-${msg.id}`}>
                        {msg.content}
                      </p>
                    )}
                    
                    {msg.messageType === 'image' && (
                      <div className="space-y-2">
                        <div className="w-48 h-32 bg-muted rounded border" data-testid={`message-image-${msg.id}`}>
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Image className="h-8 w-8" />
                          </div>
                        </div>
                        {msg.content && (
                          <p className="text-sm">{msg.content}</p>
                        )}
                      </div>
                    )}
                    
                    {msg.messageType === 'voice' && (
                      <div className="flex items-center space-x-2 p-2" data-testid={`message-voice-${msg.id}`}>
                        <Mic className="h-4 w-4" />
                        <div className="flex-1 h-2 bg-muted rounded">
                          <div className="h-2 bg-current rounded w-1/3"></div>
                        </div>
                        <span className="text-xs">0:15</span>
                      </div>
                    )}
                    
                    <p className="text-xs opacity-70 mt-1" data-testid={`message-time-${msg.id}`}>
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card" data-testid="message-input-container">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              data-testid="input-file-upload"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
              data-testid="button-attach-file"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          <Input
            type="text"
            placeholder="Message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 border-0 bg-secondary focus:ring-0"
            data-testid="input-message"
          />
          
          <Button variant="ghost" size="sm" data-testid="button-emoji">
            <Smile className="h-5 w-5" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleRecording}
            className={isRecording ? 'text-red-500' : ''}
            data-testid="button-voice-record"
          >
            <Mic className="h-5 w-5" />
          </Button>
          
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || sendMessageMutation.isPending}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
