package handlers

import (
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/supabase-community/gotrue-go"
)

// Shared authClient variable
var authClient gotrue.Client

// SetAuthClient sets the auth client for use in handlers
func SetAuthClient(client gotrue.Client) {
	authClient = client
}

// Auth related types
type SignupRequest struct {
	Email string `json:"email"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// Profile related types
type CreateProfileRequest struct {
	Name string `json:"name"`
}

// Friend related types
type SendRequestBody struct {
	ReceiverID string `json:"receiver_id"`
}

type ManageRequestBody struct {
	RequestID string `json:"request_id"`
	Status    string `json:"status"` // "accepted" or "rejected"
}

// WebSocket client structure
type Client struct {
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	clients    map[string]*Client
	broadcast  chan *Message
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// Message structure for WebSocket communication
type Message struct {
	ID        string    `json:"id,omitempty"`
	UserID1   string    `json:"user_id_1"`
	UserID2   string    `json:"user_id_2"`
	SenderID  string    `json:"sender_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// Message history request
type MessageHistoryRequest struct {
	FriendID string `json:"friend_id"`
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
}
