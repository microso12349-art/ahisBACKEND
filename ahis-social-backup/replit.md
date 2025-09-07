# AHIS Social - Social Media Platform

## Overview

AHIS Social is a private social media platform designed for students of AHIS (presumably an educational institution). The application implements a controlled-access social network where user registration requires manual approval through student ID verification. It features typical social media functionality including posts, stories, messaging, follow/unfollow mechanics, and close friends features.

The platform follows a monorepo structure with a React frontend, Express.js backend, and PostgreSQL database using Drizzle ORM. The application emphasizes privacy and verification, requiring admin approval for new users based on uploaded student ID documentation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript in SPA mode
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state, React Context for authentication
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with custom configuration for monorepo structure

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with real-time WebSocket support
- **Authentication**: JWT-based with bcrypt password hashing
- **File Handling**: Multer for media uploads with file type validation
- **Session Management**: Connect-pg-simple for PostgreSQL session storage

### Database Layer
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Schema**: Comprehensive relational model supporting users, posts, messages, follows, and moderation
- **Validation**: Zod schemas for runtime type checking and API validation

### Key Features Architecture

**Authentication & Authorization**:
- Three-tier user system: pending → approved → active users
- Role-based access control (user, admin, owner)
- Student ID verification workflow for account approval
- JWT token-based authentication with middleware protection

**Content Management**:
- Multi-type posts: regular posts, stories (with expiration), and reels
- Media upload support for images and videos
- Close friends functionality for private content sharing
- Like and comment systems with real-time updates

**Social Features**:
- Follow/unfollow relationships with privacy controls
- Real-time messaging system with WebSocket integration
- Group messaging capabilities
- User search and discovery with suggestions

**Real-time Communication**:
- WebSocket server for live messaging
- Real-time notifications and updates
- Automatic reconnection handling

### External Dependencies

**Core Framework Dependencies**:
- React ecosystem: React 18, React DOM, React Hook Form
- Backend: Express.js, bcrypt, jsonwebtoken, multer, ws
- Database: @neondatabase/serverless, drizzle-orm, drizzle-kit

**UI and Styling**:
- Radix UI component primitives for accessibility
- Tailwind CSS for utility-first styling
- Lucide React for icons
- date-fns for date manipulation

**Development and Build Tools**:
- Vite for fast development and building
- TypeScript for type safety
- ESBuild for server-side bundling
- PostCSS with Autoprefixer

**Data Management**:
- TanStack Query for server state management
- Zod for schema validation and type inference
- Class Variance Authority for component variants

The architecture prioritizes type safety, real-time user experience, and controlled access through a modular, scalable design pattern suitable for educational institution social networking needs.