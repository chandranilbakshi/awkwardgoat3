# Athena Frontend

Next.js 14 frontend with App Router, providing passwordless authentication and friend management UI.

## Overview

Modern React application built with **Next.js 14** using the App Router pattern. Features magic link authentication, protected routes, and real-time friend management.

## Tech Stack

- **Next.js 14** (App Router)
- **React 18** with Server Components
- **Tailwind CSS** for styling
- **Supabase Client** for authentication
- **Context API** for state management

## Project Structure

```
frontend/src/
├── app/
│   ├── page.js                 # Home page
│   ├── layout.js               # Root layout with AuthProvider
│   ├── globals.css             # Global styles
│   ├── (auth)/
│   │   └── signup/
│   │       └── page.js         # Magic link signup page
│   └── auth/
│       └── callback/
│           └── page.js         # OAuth callback handler
├── components/
│   └── ProtectedRoute.js       # Route protection HOC
└── contexts/
    └── AuthContext.js          # Authentication state management
```

## Key Features

### Authentication
- **Passwordless login** - Magic link via email
- **Token management** - Access & refresh tokens in localStorage
- **Protected routes** - Automatic redirect for unauthenticated users
- **Auth context** - Global authentication state

### UI/UX
- **Responsive design** - Mobile-first with Tailwind CSS
- **Loading states** - User feedback during async operations
- **Error handling** - Clear error messages
- **Auto-updates** - Pages refresh on auth state changes

## Architecture Highlights

- **App Router** - Modern Next.js routing with layouts
- **Context Pattern** - Centralized auth state management
- **Protected Routes** - Reusable HOC for route protection
- **Server Components** - Optimized performance where possible

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Authentication Flow

1. User enters email on signup page
2. Backend sends magic link to email
3. User clicks magic link → redirected to `/auth/callback`
4. Tokens extracted from URL hash and stored
5. User redirected to home page as authenticated

## Security Notes

⚠️ **Production Checklist:**
- Move tokens from localStorage to httpOnly cookies
- Implement CSRF protection
- Add rate limiting on auth endpoints
- Use environment variables for all configs
- Enable HTTPS only in production
