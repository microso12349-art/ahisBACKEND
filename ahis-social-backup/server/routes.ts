import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { loginSchema, registerSchema, insertPostSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "ahis-social-secret-key";

// Multer config for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

interface AuthRequest extends Request {
  user?: any;
}

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user || user.applicationStatus !== 'approved') {
      return res.status(403).json({ message: 'User not approved' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Owner middleware
const requireOwner = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Owner access required' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const activeConnections = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Token required');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.userId;
      activeConnections.set(userId, ws);

      ws.on('close', () => {
        activeConnections.delete(userId);
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'new_message') {
            // Handle new message
            const newMessage = await storage.createMessage({
              conversationId: message.conversationId,
              senderId: userId,
              content: message.content,
              messageType: message.messageType || 'text'
            });

            await storage.updateConversationLastMessage(message.conversationId, message.content);

            // Send to all participants
            const conversation = await storage.getConversation(message.conversationId);
            if (conversation) {
              conversation.participants.forEach(participantId => {
                const participantWs = activeConnections.get(participantId);
                if (participantWs && participantWs.readyState === WebSocket.OPEN) {
                  participantWs.send(JSON.stringify({
                    type: 'message_received',
                    message: newMessage,
                    conversationId: message.conversationId
                  }));
                }
              });
            }
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
    } catch (error) {
      ws.close(1008, 'Invalid token');
    }
  });

  // Auth routes
  app.post('/api/auth/register', upload.single('studentIdImage'), async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username) || 
                           await storage.getUserByEmail(validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const userData = {
        username: validatedData.username,
        email: validatedData.email,
        fullName: validatedData.fullName,
        password: hashedPassword,
        studentIdImage: req.file?.path || null,
        applicationStatus: 'pending'
      };

      await storage.createUser(userData);
      res.status(201).json({ message: 'Application submitted for review' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      // Check for owner login
      if (username === 'owner' && password === 'Jqkjqk39') {
        let owner = await storage.getUserByUsername('owner');
        if (!owner) {
          // Create owner account if it doesn't exist
          const hashedPassword = await bcrypt.hash('Jqkjqk39', 10);
          owner = await storage.createUser({
            username: 'owner',
            email: 'owner@ahis.edu',
            fullName: 'System Owner',
            password: hashedPassword,
            role: 'owner',
            applicationStatus: 'approved',
            isVerified: true
          });
        }

        const token = jwt.sign({ userId: owner.id }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user: owner });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (user.applicationStatus !== 'approved') {
        return res.status(403).json({ message: 'Account pending approval' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
      
      // Don't send password in response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // User routes
  app.get('/api/users/search', authenticateToken, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      const users = await storage.searchUsers(query, req.user.id);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Search failed' });
    }
  });

  app.get('/api/users/:id', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      const isFollowing = await storage.isFollowing(req.user.id, user.id);
      const followersCount = (await storage.getFollowers(user.id)).length;
      const followingCount = (await storage.getFollowing(user.id)).length;
      
      res.json({
        ...userWithoutPassword,
        isFollowing,
        followersCount,
        followingCount
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  app.post('/api/users/:id/follow', authenticateToken, async (req: any, res) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(400).json({ message: 'Cannot follow yourself' });
      }

      const isBlocked = await storage.isBlocked(req.params.id, req.user.id);
      if (isBlocked) {
        return res.status(403).json({ message: 'You are blocked by this user' });
      }

      await storage.followUser(req.user.id, req.params.id);
      res.json({ message: 'User followed' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to follow user' });
    }
  });

  app.delete('/api/users/:id/follow', authenticateToken, async (req: any, res) => {
    try {
      await storage.unfollowUser(req.user.id, req.params.id);
      res.json({ message: 'User unfollowed' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to unfollow user' });
    }
  });

  app.get('/api/users/suggested', authenticateToken, async (req: any, res) => {
    try {
      const users = await storage.getSuggestedUsers(req.user.id);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get suggested users' });
    }
  });

  // Post routes
  app.post('/api/posts', authenticateToken, upload.array('media', 5), async (req: any, res) => {
    try {
      const { content, type, isCloseFriends } = req.body;
      const mediaUrls = req.files?.map((file: any) => file.path) || [];
      
      let expiresAt = null;
      if (type === 'story') {
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      }

      const post = await storage.createPost({
        userId: req.user.id,
        content: content || '',
        mediaUrls,
        type: type || 'post',
        isCloseFriends: isCloseFriends === 'true',
        expiresAt
      });

      res.status(201).json(post);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create post' });
    }
  });

  app.get('/api/posts/feed', authenticateToken, async (req: any, res) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const posts = await storage.getFeedPosts(req.user.id, offset, limit);
      
      // Add user info and interaction status for each post
      const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId);
        const isLiked = await storage.isPostLiked(req.user.id, post.id);
        
        return {
          ...post,
          user: user ? {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar,
            isVerified: user.isVerified
          } : null,
          isLiked
        };
      }));

      res.json(enrichedPosts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get feed' });
    }
  });

  app.get('/api/posts/stories', authenticateToken, async (req: any, res) => {
    try {
      const stories = await storage.getStoriesFeed(req.user.id);
      
      const enrichedStories = await Promise.all(stories.map(async (story) => {
        const user = await storage.getUser(story.userId);
        return {
          ...story,
          user: user ? {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar,
            isVerified: user.isVerified
          } : null
        };
      }));

      res.json(enrichedStories);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get stories' });
    }
  });

  app.post('/api/posts/:id/like', authenticateToken, async (req: any, res) => {
    try {
      await storage.likePost(req.user.id, req.params.id);
      res.json({ message: 'Post liked' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to like post' });
    }
  });

  app.delete('/api/posts/:id/like', authenticateToken, async (req: any, res) => {
    try {
      await storage.unlikePost(req.user.id, req.params.id);
      res.json({ message: 'Post unliked' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to unlike post' });
    }
  });

  app.post('/api/posts/:id/comments', authenticateToken, async (req: any, res) => {
    try {
      const { content } = req.body;
      await storage.createComment(req.user.id, req.params.id, content);
      res.json({ message: 'Comment added' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to add comment' });
    }
  });

  app.get('/api/posts/:id/comments', authenticateToken, async (req: any, res) => {
    try {
      const comments = await storage.getPostComments(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get comments' });
    }
  });

  // Messaging routes
  app.get('/api/conversations', authenticateToken, async (req: any, res) => {
    try {
      const conversations = await storage.getUserConversations(req.user.id);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get conversations' });
    }
  });

  app.post('/api/conversations', authenticateToken, async (req: any, res) => {
    try {
      const { participants, isGroup, groupName } = req.body;
      
      if (!participants.includes(req.user.id)) {
        participants.push(req.user.id);
      }

      const conversation = await storage.createConversation(participants, isGroup, groupName);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create conversation' });
    }
  });

  app.get('/api/conversations/:id/messages', authenticateToken, async (req: any, res) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getConversationMessages(req.params.id, offset, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get messages' });
    }
  });

  // Admin routes
  app.get('/api/admin/applications', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const applications = await storage.getUsersAwaitingApproval();
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get applications' });
    }
  });

  app.put('/api/admin/applications/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      await storage.updateUserApplicationStatus(req.params.id, status);
      res.json({ message: 'Application updated' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update application' });
    }
  });

  app.post('/api/admin/users/:id/ban', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent banning owner or admins banning other admins
      if (targetUser.role === 'owner') {
        return res.status(403).json({ message: 'Cannot ban owner' });
      }
      
      if (targetUser.role === 'admin' && req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Cannot ban admin' });
      }

      await storage.updateUser(req.params.id, { applicationStatus: 'banned' });
      res.json({ message: 'User banned' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to ban user' });
    }
  });

  app.post('/api/admin/add-admin', authenticateToken, requireOwner, async (req: any, res) => {
    try {
      const { userId } = req.body;
      await storage.updateUser(userId, { role: 'admin' });
      res.json({ message: 'Admin added' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to add admin' });
    }
  });

  // Cleanup expired stories periodically
  setInterval(async () => {
    try {
      await storage.deleteExpiredStories();
    } catch (error) {
      console.error('Failed to cleanup expired stories:', error);
    }
  }, 60 * 60 * 1000); // Every hour

  return httpServer;
}
