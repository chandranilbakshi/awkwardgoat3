package main

import (
	"AthenaSphere-backend/config"
	"AthenaSphere-backend/handlers"
	"AthenaSphere-backend/server"
	"AthenaSphere-backend/utils"
	"log"

	"github.com/supabase-community/gotrue-go"
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

	log.Println("GoTrue Auth client initialized successfully")

	// Initialize server and get Fiber app
	srv := server.New(cfg)
	app := srv.App()

	// Setup all routes
	server.SetupRoutes(app)

	// Start server
	log.Fatal(srv.Start())
}
