import { 
  users, posts, likes, comments, follows, closeFriends, conversations, messages, blockedUsers,
  type User, type InsertUser, type Post, type InsertPost, type Message, type InsertMessage, type Conversation 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, inArray, not } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getUsersAwaitingApproval(): Promise<User[]>;
  updateUserApplicationStatus(id: string, status: string): Promise<void>;
  searchUsers(query: string, currentUserId: string): Promise<User[]>;

  // Posts
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: string): Promise<Post | undefined>;
  getUserPosts(userId: string, viewerId?: string): Promise<Post[]>;
  getFeedPosts(userId: string, offset: number, limit: number): Promise<Post[]>;
  getStoriesFeed(userId: string): Promise<Post[]>;
  deleteExpiredStories(): Promise<void>;
  likePost(userId: string, postId: string): Promise<void>;
  unlikePost(userId: string, postId: string): Promise<void>;
  isPostLiked(userId: string, postId: string): Promise<boolean>;

  // Comments
  createComment(userId: string, postId: string, content: string): Promise<void>;
  getPostComments(postId: string): Promise<any[]>;

  // Follows
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  getSuggestedUsers(userId: string): Promise<User[]>;

  // Close Friends
  addCloseFriend(userId: string, friendId: string): Promise<void>;
  removeCloseFriend(userId: string, friendId: string): Promise<void>;
  getCloseFriends(userId: string): Promise<User[]>;

  // Conversations & Messages
  createConversation(participants: string[], isGroup?: boolean, groupName?: string): Promise<Conversation>;
  getUserConversations(userId: string): Promise<any[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string, offset: number, limit: number): Promise<any[]>;
  updateConversationLastMessage(conversationId: string, message: string): Promise<void>;

  // Blocking
  blockUser(blockerId: string, blockedId: string): Promise<void>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  getBlockedUsers(userId: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getUsersAwaitingApproval(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.applicationStatus, "pending")).orderBy(desc(users.createdAt));
  }

  async updateUserApplicationStatus(id: string, status: string): Promise<void> {
    await db.update(users).set({ applicationStatus: status, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    return await db.select().from(users)
      .where(
        and(
          or(
            sql`${users.username} ILIKE ${`%${query}%`}`,
            sql`${users.fullName} ILIKE ${`%${query}%`}`
          ),
          not(eq(users.id, currentUserId)),
          eq(users.applicationStatus, "approved")
        )
      )
      .limit(20);
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getUserPosts(userId: string, viewerId?: string): Promise<Post[]> {
    // If viewer is not following the user and account is private, return empty
    const user = await this.getUser(userId);
    if (user?.isPrivate && viewerId && viewerId !== userId) {
      const isFollowing = await this.isFollowing(viewerId, userId);
      if (!isFollowing) return [];
    }

    return await db.select().from(posts)
      .where(and(
        eq(posts.userId, userId),
        not(eq(posts.type, "story"))
      ))
      .orderBy(desc(posts.createdAt));
  }

  async getFeedPosts(userId: string, offset: number, limit: number): Promise<Post[]> {
    // Get posts from users the current user follows
    const followingUsers = await db.select({ id: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const followingIds = followingUsers.map(f => f.id);
    followingIds.push(userId); // Include own posts

    return await db.select().from(posts)
      .where(and(
        inArray(posts.userId, followingIds),
        not(eq(posts.type, "story")),
        or(
          eq(posts.isCloseFriends, false),
          sql`${posts.userId} = ${userId}` // Own posts
        )
      ))
      .orderBy(desc(posts.createdAt))
      .offset(offset)
      .limit(limit);
  }

  async getStoriesFeed(userId: string): Promise<Post[]> {
    const followingUsers = await db.select({ id: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const followingIds = followingUsers.map(f => f.id);
    followingIds.push(userId);

    return await db.select().from(posts)
      .where(and(
        eq(posts.type, "story"),
        inArray(posts.userId, followingIds),
        sql`${posts.expiresAt} > NOW()`
      ))
      .orderBy(desc(posts.createdAt));
  }

  async deleteExpiredStories(): Promise<void> {
    await db.delete(posts)
      .where(and(
        eq(posts.type, "story"),
        sql`${posts.expiresAt} < NOW()`
      ));
  }

  async likePost(userId: string, postId: string): Promise<void> {
    await db.insert(likes).values({ userId, postId }).onConflictDoNothing();
    await db.update(posts)
      .set({ likesCount: sql`${posts.likesCount} + 1` })
      .where(eq(posts.id, postId));
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    await db.update(posts)
      .set({ likesCount: sql`${posts.likesCount} - 1` })
      .where(eq(posts.id, postId));
  }

  async isPostLiked(userId: string, postId: string): Promise<boolean> {
    const [like] = await db.select().from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return !!like;
  }

  async createComment(userId: string, postId: string, content: string): Promise<void> {
    await db.insert(comments).values({ userId, postId, content });
    await db.update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, postId));
  }

  async getPostComments(postId: string): Promise<any[]> {
    return await db.select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      user: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        avatar: users.avatar
      }
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    await db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db.delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [follow] = await db.select().from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return !!follow;
  }

  async getFollowers(userId: string): Promise<User[]> {
    return await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      avatar: users.avatar,
      isVerified: users.isVerified
    })
    .from(follows)
    .innerJoin(users, eq(follows.followerId, users.id))
    .where(eq(follows.followingId, userId));
  }

  async getFollowing(userId: string): Promise<User[]> {
    return await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      avatar: users.avatar,
      isVerified: users.isVerified
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(eq(follows.followerId, userId));
  }

  async getSuggestedUsers(userId: string): Promise<User[]> {
    // Get users not followed by current user, excluding blocked users
    return await db.select().from(users)
      .where(and(
        not(eq(users.id, userId)),
        eq(users.applicationStatus, "approved"),
        not(sql`${users.id} IN (
          SELECT ${follows.followingId} FROM ${follows} WHERE ${follows.followerId} = ${userId}
        )`),
        not(sql`${users.id} IN (
          SELECT ${blockedUsers.blockedId} FROM ${blockedUsers} WHERE ${blockedUsers.blockerId} = ${userId}
        )`)
      ))
      .limit(10);
  }

  async addCloseFriend(userId: string, friendId: string): Promise<void> {
    await db.insert(closeFriends).values({ userId, friendId }).onConflictDoNothing();
  }

  async removeCloseFriend(userId: string, friendId: string): Promise<void> {
    await db.delete(closeFriends)
      .where(and(eq(closeFriends.userId, userId), eq(closeFriends.friendId, friendId)));
  }

  async getCloseFriends(userId: string): Promise<User[]> {
    return await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      avatar: users.avatar,
      isVerified: users.isVerified
    })
    .from(closeFriends)
    .innerJoin(users, eq(closeFriends.friendId, users.id))
    .where(eq(closeFriends.userId, userId));
  }

  async createConversation(participants: string[], isGroup = false, groupName?: string): Promise<Conversation> {
    const [conversation] = await db.insert(conversations)
      .values({ participants, isGroup, groupName })
      .returning();
    return conversation;
  }

  async getUserConversations(userId: string): Promise<any[]> {
    return await db.select()
      .from(conversations)
      .where(sql`${userId} = ANY(${conversations.participants})`)
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getConversationMessages(conversationId: string, offset: number, limit: number): Promise<any[]> {
    return await db.select({
      id: messages.id,
      content: messages.content,
      mediaUrl: messages.mediaUrl,
      messageType: messages.messageType,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        avatar: users.avatar
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .offset(offset)
    .limit(limit);
  }

  async updateConversationLastMessage(conversationId: string, message: string): Promise<void> {
    await db.update(conversations)
      .set({ lastMessage: message, lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await db.insert(blockedUsers).values({ blockerId, blockedId }).onConflictDoNothing();
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await db.delete(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)));
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const [blocked] = await db.select().from(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)));
    return !!blocked;
  }

  async getBlockedUsers(userId: string): Promise<User[]> {
    return await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      avatar: users.avatar
    })
    .from(blockedUsers)
    .innerJoin(users, eq(blockedUsers.blockedId, users.id))
    .where(eq(blockedUsers.blockerId, userId));
  }
}

export const storage = new DatabaseStorage();
