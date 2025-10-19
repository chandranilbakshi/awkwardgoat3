# Athena Backend - Passwordless Authentication with Supabase

This is a Go backend service that provides passwordless authentication using Supabase magic links (OTP).

## Prerequisites

- Go 1.21 or higher
- A Supabase account and project
- Node.js and npm/bun (for frontend)

## Setup

### 1. Install Go dependencies:
```bash
cd backend
go mod download
```

### 2. Configure Supabase:

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Project Settings > API
3. Copy your project URL and anon/public key
4. Update the `.env` file in the backend folder:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-anon-key-here
PORT=8080
FRONTEND_URL=http://localhost:3000
```

### 3. Configure Supabase Authentication:

1. In your Supabase dashboard, go to Authentication > Providers
2. Enable Email provider
3. Go to Authentication > URL Configuration
4. Add `http://localhost:3000/auth/callback` to Redirect URLs
5. (Optional) Customize email templates in Authentication > Email Templates

### 4. Run the backend:
```bash
go run main.go
```

The server will start on `http://localhost:8080`

### 5. Run the frontend:
```bash
cd frontend
npm install  # or: bun install
npm run dev  # or: bun dev
```

The frontend will start on `http://localhost:3000`

## How It Works

1. User enters their email on the signup page
2. Backend calls Supabase Auth OTP API
3. Supabase sends a magic link to the user's email
4. User clicks the magic link
5. User is redirected to `/auth/callback` with tokens in the URL hash
6. Tokens are stored in localStorage (consider using httpOnly cookies in production)
7. User is authenticated and redirected to the home page

## API Endpoints

### POST /api/auth/signup
Send a magic link to the user's email for passwordless authentication.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Magic link sent to your email. Please check your inbox.",
  "email": "user@example.com"
}
```

**Error Response:**
```json
{
  "error": "Failed to send magic link",
  "details": "error details here"
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Project Structure

```
athena/
├── backend/
│   ├── main.go           # Main server file with routes and handlers
│   ├── go.mod            # Go module dependencies
│   ├── .env              # Environment variables (do not commit)
│   └── README.md         # This file
└── frontend/
    └── src/
        └── app/
            ├── (auth)/
            │   └── signup/
            │       └── page.js      # Signup page with email input
            └── auth/
                └── callback/
                    └── page.js      # Magic link callback handler
```

## Security Notes

⚠️ **Important for Production:**
- Never commit your `.env` file to version control
- Use httpOnly cookies instead of localStorage for tokens
- Add rate limiting to prevent abuse
- Validate and sanitize all inputs
- Use HTTPS in production
- Set proper CORS headers
- Keep your Supabase service_role key secret (never expose to frontend)

## Development

To run in development mode with auto-reload, you can use tools like `air`:

```bash
go install github.com/cosmtrek/air@latest
air
```

## Future Enhancements

- Add WebSocket support for real-time chat
- Implement WebRTC signaling for video/voice calls
- Add user profile management
- Implement token refresh mechanism
- Add session management
- Create protected routes middleware
