import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ChatInterface } from "@/components/messaging/chat-interface";
import { MessageList } from "@/components/messaging/message-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/auth-context";
import { useWebSocket } from "@/hooks/use-websocket";
import { authenticatedRequest } from "@/lib/auth";
import { Search, MessageCircle, Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendMessage, addMessageHandler, removeMessageHandler } = useWebSocket();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/users/search", { q: searchQuery }],
    enabled: searchQuery.length > 2,
  });

  const createConversationMutation = useMutation({
    mutationFn: async ({ participants, isGroup, groupName }: { participants: string[], isGroup: boolean, groupName?: string }) => {
      const response = await authenticatedRequest("POST", "/api/conversations", {
        participants,
        isGroup,
        groupName
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(data.id);
      setShowNewChat(false);
      setSelectedUsers([]);
      setGroupName("");
      toast({
        title: "Chat created",
        description: "New conversation started successfully",
      });
    },
  });

  // WebSocket message handlers
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", data.conversationId, "messages"] });
    };

    addMessageHandler("message_received", handleNewMessage);

    return () => {
      removeMessageHandler("message_received");
    };
  }, [addMessageHandler, removeMessageHandler, queryClient]);

  const handleCreateChat = () => {
    if (selectedUsers.length === 0) return;

    const isGroup = selectedUsers.length > 1;
    createConversationMutation.mutate({
      participants: selectedUsers,
      isGroup,
      groupName: isGroup ? groupName : undefined
    });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (conversationsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex h-[calc(100vh-64px)]">
          <div className="w-80 border-r border-border bg-card p-4">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-secondary animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-secondary rounded animate-pulse" />
                    <div className="h-3 bg-secondary rounded w-3/4 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4" />
              <p>Loading conversations...</p>
            </div>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="messages-page">
      <Header />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Conversations List */}
        <aside className="w-80 bg-card border-r border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" data-testid="messages-title">Messages</h2>
              <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="button-new-chat">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" data-testid="new-chat-dialog">
                  <DialogHeader>
                    <DialogTitle>New Chat</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-users"
                    />

                    {selectedUsers.length > 1 && (
                      <Input
                        placeholder="Group name (optional)"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        data-testid="input-group-name"
                      />
                    )}

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {searchResults.map((searchUser: any) => (
                        <div
                          key={searchUser.id}
                          className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-secondary ${
                            selectedUsers.includes(searchUser.id) ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => toggleUserSelection(searchUser.id)}
                          data-testid={`user-option-${searchUser.id}`}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={searchUser.avatar} alt={searchUser.fullName} />
                            <AvatarFallback>
                              {searchUser.fullName?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{searchUser.fullName}</p>
                            <p className="text-xs text-muted-foreground">@{searchUser.username}</p>
                          </div>
                          {selectedUsers.includes(searchUser.id) && (
                            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground">✓</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleCreateChat}
                      disabled={selectedUsers.length === 0 || createConversationMutation.isPending}
                      className="w-full"
                      data-testid="button-create-chat"
                    >
                      {createConversationMutation.isPending ? "Creating..." : "Start Chat"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="relative">
              <Input
                type="text"
                placeholder="Search messages..."
                className="pl-10"
                data-testid="input-search-messages"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <MessageList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
            currentUserId={user?.id || ""}
          />
        </aside>

        {/* Chat Interface */}
        <main className="flex-1">
          {selectedConversation ? (
            <ChatInterface
              conversationId={selectedConversation}
              currentUserId={user?.id || ""}
              onSendMessage={sendMessage}
            />
          ) : (
            <div className="flex items-center justify-center h-full" data-testid="no-conversation-selected">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Your Messages</h3>
                <p className="mb-4">Send private messages to classmates and friends</p>
                <Button onClick={() => setShowNewChat(true)} data-testid="button-start-chat">
                  <Plus className="h-4 w-4 mr-2" />
                  Start a Chat
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
