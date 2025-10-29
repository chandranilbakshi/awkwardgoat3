# WebSocket Messaging Implementation

## Overview
This implementation adds real-time messaging capabilities using WebSockets, with messages stored in Supabase.

## Architecture

### Backend (Go/Fiber)
- **WebSocket Handler**: `handlers/handlers_messages.go`
  - Manages WebSocket connections
  - Broadcasts messages to connected clients
  - Stores messages in Supabase database
  - Provides message history endpoint

### Frontend (Next.js/React)
- **useWebSocket Hook**: `hooks/useWebSocket.js`
  - Manages WebSocket connection lifecycle
  - Handles reconnection automatically
  - Provides message sending capability
  
- **useMessages Hook**: `hooks/useMessages.js`
  - Fetches message history from API
  - Manages message state
  - Provides methods to add/clear messages

- **OpenChat Component**: Updated to use WebSocket for real-time messaging

## Database Schema

Table: `messages`
```sql
- id: uuid (primary key)
- user_id_1: uuid (smaller UUID of the two participants)
- user_id_2: uuid (larger UUID of the two participants)
- sender_id: uuid (who sent the message)
- content: text (message content)
- created_at: timestamptz (when message was created)
```

## How It Works

### Sending a Message
1. User types message in `OpenChat` component
2. Message is sent via WebSocket with both user IDs (sorted)
3. Backend receives message, stores in Supabase
4. Backend broadcasts message to recipient if online
5. Both sender and recipient UI update in real-time

### Receiving Messages
1. WebSocket connection established on app load
2. Backend sends incoming messages to connected client
3. `useWebSocket` hook receives message
4. Message is added to conversation if it matches current chat
5. UI updates automatically

### Message History
1. When opening a chat, `useMessages` hook fetches history
2. GET request to `/api/messages/history?friend_id={id}`
3. Backend queries Supabase for messages between users
4. Messages are displayed in chronological order

## API Endpoints

### WebSocket
- **URL**: `ws://localhost:8080/ws?user_id={user_id}`
- **Purpose**: Real-time bidirectional messaging
- **Message Format**:
  ```json
  {
    "user_id_1": "uuid",
    "user_id_2": "uuid",
    "sender_id": "uuid",
    "content": "message text",
    "created_at": "2025-10-27T12:00:00Z"
  }
  ```

### Message History
- **URL**: `GET /api/messages/history`
- **Query Params**:
  - `friend_id`: UUID of the other user
  - `limit`: Number of messages (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Headers**: `Authorization: Bearer {access_token}`
- **Response**:
  ```json
  {
    "messages": [...],
    "current_user": "uuid"
  }
  ```

## Features

### Implemented ✅
- Real-time message sending/receiving
- Message persistence in Supabase
- Message history loading
- Automatic WebSocket reconnection
- Optimistic UI updates
- User authentication via JWT
- Consistent user ID ordering (user_id_1 < user_id_2)

### Planned 🔜
- Online/offline status indicators
- Read receipts
- Typing indicators
- Message delivery confirmations
- File attachments
- Voice messages

## Usage

### Backend Setup
1. Ensure Supabase is configured with the `messages` table
2. Install dependencies: `go get github.com/gofiber/websocket/v2`
3. Run backend: `go run main.go`

### Frontend Setup
1. Ensure `useAuth` context provides `user` and `accessToken`
2. WebSocket connection auto-establishes when user is authenticated
3. Open a chat to see real-time messaging in action

## Security
- WebSocket connections require user_id (should be enhanced with JWT)
- Message history requires JWT authentication
- User IDs are sorted to prevent duplicate conversations
- CORS configured for frontend origin

## Troubleshooting

### WebSocket not connecting
- Check if backend is running on port 8080
- Verify user is authenticated
- Check browser console for connection errors

### Messages not persisting
- Verify Supabase credentials in `.env`
- Check backend logs for insert errors
- Ensure `messages` table exists with correct schema

### Messages not appearing in real-time
- Check if both users are connected to WebSocket
- Verify message has correct user_id_1 and user_id_2
- Check browser console for errors

## Environment Variables

Backend `.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
PORT=8080
FRONTEND_URL=http://localhost:3000
```

## Testing
1. Open app in two different browsers (or incognito)
2. Login as different users
3. Add each other as friends
4. Send messages - should appear in real-time
5. Refresh page - message history should load
