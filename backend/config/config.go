package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	SupabaseURL string
	SupabaseKey string
	Port        string
	FrontendURL string
}

func Load() (*Config, error) {
	// Try to load .env file (optional - for local development)
	// In production (ECS), environment variables are provided by the task definition
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found - using environment variables from system")
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")
	port := os.Getenv("PORT")
	frontendURL := os.Getenv("FRONTEND_URL")

	if supabaseURL == "" || supabaseKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_KEY must be set")
	}

	if port == "" {
		port = "8080"
	}

	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	log.Println("Configuration loaded successfully")

	return &Config{
		SupabaseURL: supabaseURL,
		SupabaseKey: supabaseKey,
		Port:        port,
		FrontendURL: frontendURL,
	}, nil
}
