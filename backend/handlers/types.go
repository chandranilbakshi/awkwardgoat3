package handlers

import "github.com/supabase-community/gotrue-go"

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
