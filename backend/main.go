package main

import (
	"athena-backend/config"
	"athena-backend/handlers"
	"athena-backend/server"
	"athena-backend/utils"
	"github.com/supabase-community/gotrue-go"
	"log"
)

var authClient gotrue.Client

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	// Initialize GoTrue Auth client directly
	authClient = gotrue.New(cfg.SupabaseURL, cfg.SupabaseKey)
	authClient = authClient.WithCustomGoTrueURL(cfg.SupabaseURL + "/auth/v1")

	// Set the auth client for handlers and utils
	handlers.SetAuthClient(authClient)
	utils.SetAuthClient(authClient)
	server.SetAuthClient(authClient)

	log.Println("GoTrue Auth client initialized successfully")

	// Initialize server and get Fiber app
	srv := server.New(cfg)
	app := srv.App()

	// Setup all routes
	server.SetupRoutes(app)

	// Start server
	log.Fatal(srv.Start())
}
