# Athena Backend

Go backend service providing passwordless authentication and friend management using Supabase.

## Overview

This backend uses **Fiber** (Go web framework) with **Supabase** for authentication and database operations. It implements magic link authentication, user profiles, and friend request management.

## Tech Stack

- **Go 1.25** with Fiber v2
- **Supabase** (PostgreSQL + GoTrue Auth)
- **Modular architecture** with clean separation of concerns

## Project Structure

```
backend/
├── main.go                  # Application entry point
├── config/
│   └── config.go           # Environment configuration
├── server/
│   ├── fiberServer.go      # Server initialization
│   └── routes.go           # Route definitions
├── cors/
│   └── cors.go            # CORS middleware configuration
├── handlers/
│   ├── types.go           # Request/response types
│   ├── handlers_auth.go   # Authentication handlers
│   ├── handlers_profile.go # Profile handlers
│   └── handlers_friends.go # Friend management handlers
└── utils/
    ├── auth.go            # Auth client utilities
    └── HandleSearchByUID.go # User search handler
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Send magic link email
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user info

### Profile
- `POST /api/user/create-profile` - Create user profile with unique UID
- `GET /api/user/check-profile` - Check if profile exists

### Friends
- `GET /api/user/search-by-uid/:uid` - Search user by UID
- `POST /api/friends/send-request` - Send friend request
- `GET /api/friends/requests` - View friend requests (received/sent)
- `PUT /api/friends/manage-request` - Accept/reject friend request
- `GET /api/friends/list` - Get friends list

### System
- `GET /api/health` - Health check

## Environment Variables

Create a `.env` file in the backend directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
PORT=8080
FRONTEND_URL=http://localhost:3000
```

## Architecture Highlights

- **Modular design** - Separated concerns (config, server, handlers, middleware)
- **Clean code** - Each package has a single responsibility
- **Reusable components** - Shared auth client, CORS config, error handling
- **Scalable structure** - Easy to add new routes and handlers

## Security Notes

⚠️ **Production Checklist:**
- Never commit `.env` to version control
- Use HTTPS in production
- Implement rate limiting
- Add input validation and sanitization
- Use httpOnly cookies for tokens
- Keep service_role key secret
- Add user profile management
- Implement token refresh mechanism
- Add session management
- Create protected routes middleware
