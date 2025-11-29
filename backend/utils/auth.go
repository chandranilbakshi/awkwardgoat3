package utils

import (
	"strings"

	"github.com/supabase-community/gotrue-go"
)

// Shared authClient variable
var authClient gotrue.Client

// SetAuthClient sets the auth client for use in utils
func SetAuthClient(client gotrue.Client) {
	authClient = client
}

// ExtractBearerToken extracts the token from an Authorization header
// Handles both "Bearer <token>" format and raw token strings
func ExtractBearerToken(authHeader string) string {
	if authHeader == "" {
		return ""
	}
	// Check for "Bearer " prefix (case-insensitive would be more robust but we follow existing behavior)
	if len(authHeader) > 7 && strings.HasPrefix(authHeader, "Bearer ") {
		return authHeader[7:]
	}
	return authHeader
}
