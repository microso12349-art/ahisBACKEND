import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { authenticatedRequest } from "@/lib/auth";
import { useAuth } from "@/components/auth/auth-context";
import { Image, Video, Users } from "lucide-react";

interface CreatePostProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePost({ isOpen, onClose }: CreatePostProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [postType, setPostType] = useState<"post" | "story" | "reel">("post");
  const [isCloseFriends, setIsCloseFriends] = useState(false);

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("type", postType);
      formData.append("isCloseFriends", isCloseFriends.toString());
      
      selectedFiles.forEach((file) => {
        formData.append("media", file);
      });

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed"] });
      if (postType === "story") {
        queryClient.invalidateQueries({ queryKey: ["/api/posts/stories"] });
      }
      handleReset();
      onClose();
    },
  });

  const handleReset = () => {
    setContent("");
    setSelectedFiles([]);
    setPostType("post");
    setIsCloseFriends(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPostMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="create-post-dialog">
        <DialogHeader>
          <DialogTitle>Create New {postType === "post" ? "Post" : postType === "story" ? "Story" : "Reel"}</DialogTitle>
        </DialogHeader>

        <Tabs value={postType} onValueChange={(value) => setPostType(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="post" data-testid="tab-post">Post</TabsTrigger>
            <TabsTrigger value="story" data-testid="tab-story">Story</TabsTrigger>
            <TabsTrigger value="reel" data-testid="tab-reel">Reel</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <TabsContent value="post">
              <div className="space-y-4">
                <Textarea
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-post-content"
                />
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="close-friends"
                    checked={isCloseFriends}
                    onCheckedChange={setIsCloseFriends}
                    data-testid="switch-close-friends"
                  />
                  <Label htmlFor="close-friends" className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>Close friends only</span>
                  </Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="story">
              <div className="text-center text-muted-foreground">
                <p>Stories disappear after 24 hours</p>
              </div>
            </TabsContent>

            <TabsContent value="reel">
              <div className="text-center text-muted-foreground">
                <p>Share a short video that lasts forever</p>
              </div>
            </TabsContent>

            {/* File Upload */}
            <div className="space-y-2">
              <div className="flex space-x-2">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="image-upload"
                    multiple
                    data-testid="input-image-upload"
                  />
                  <Label 
                    htmlFor="image-upload" 
                    className="flex items-center space-x-2 p-2 border border-border rounded-lg cursor-pointer hover:bg-secondary"
                  >
                    <Image className="w-4 h-4" />
                    <span>Photos</span>
                  </Label>
                </div>
                
                <div className="relative">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="video-upload"
                    data-testid="input-video-upload"
                  />
                  <Label 
                    htmlFor="video-upload" 
                    className="flex items-center space-x-2 p-2 border border-border rounded-lg cursor-pointer hover:bg-secondary"
                  >
                    <Video className="w-4 h-4" />
                    <span>Videos</span>
                  </Label>
                </div>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2" data-testid="selected-files">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        data-testid={`button-remove-file-${index}`}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-post"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPostMutation.isPending || (!content.trim() && selectedFiles.length === 0)}
                data-testid="button-create-post"
              >
                {createPostMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
