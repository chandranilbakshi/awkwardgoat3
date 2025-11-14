package handlers

import (
	"encoding/json"
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

// Message type constants
const (
	MessageTypeChat         = "chat"
	MessageTypeCallOffer    = "call-offer"
	MessageTypeCallAnswer   = "call-answer"
	MessageTypeIceCandidate = "ice-candidate"
	MessageTypeCallError    = "call-error"
)

// WebSocketMessage wraps all WebSocket message types
type WebSocketMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
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

type CallType int
type SDPType int

// CallType assigned using iota for automatic incrementing constants. (alternate to Enums)
const (
	AudioType CallType = iota
	VideoType
)

const (
	SDPTypeOffer SDPType = iota
	SDPTypeAnswer
)

type CallSDP struct {
	CallType  CallType  `json:"call_type"`
	SDPType   SDPType   `json:"sdp_type"` // offer or answer
	Sender    string    `json:"sender_id"`
	Receiver  string    `json:"receiver_id"`
	SdpString string    `json:"sdp_string"`
	Timestamp time.Time `json:"time"`
}

/*
candidate - the actual connection path
sdpMid - which media section this belongs to
sdpIndex - exact index in SDP so browser can place it correctly
*/
// As SdpMid and SdpIndex are optional fields in WEBRTC, we use pointers to understand " " vs null.
type IceCandidate struct {
	Sender    string  `json:"sender_id"`
	Receiver  string  `json:"receiver_id"`
	Candidate string  `json:"candidate"`
	SdpMid    *string `json:"sdpMid,omitempty"`
	SdpIndex  *uint16 `json:"sdpIndex,omitempty"`
}
