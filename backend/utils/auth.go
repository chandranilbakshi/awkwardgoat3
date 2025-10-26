package utils

import "github.com/supabase-community/gotrue-go"

// Shared authClient variable
var authClient gotrue.Client

// SetAuthClient sets the auth client for use in utils
func SetAuthClient(client gotrue.Client) {
	authClient = client
}
