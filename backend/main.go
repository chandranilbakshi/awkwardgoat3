package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
	"github.com/supabase-community/gotrue-go"
	"github.com/supabase-community/gotrue-go/types"
)

var authClient gotrue.Client

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
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

	// Initialize GoTrue Auth client directly
	authClient = gotrue.New(supabaseURL, supabaseKey)
	authClient = authClient.WithCustomGoTrueURL(supabaseURL + "/auth/v1")

	log.Println("GoTrue Auth client initialized successfully")

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// CORS middleware - Allow requests from frontend
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000,http://127.0.0.1:3000",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Routes
	app.Post("/api/auth/signup", handleSignup)
	app.Post("/api/auth/refresh", handleRefreshToken)
	app.Get("/api/auth/me", handleGetUser)
	app.Post("/api/user/create-profile", handleCreateProfile)
	app.Get("/api/user/check-profile", handleCheckProfile)
	app.Get("/api/health", handleHealth)

	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}

func handleHealth(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Server is running",
	})
}

func handleSignup(c *fiber.Ctx) error {
	type SignupRequest struct {
		Email string `json:"email"`
	}

	var req SignupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email is required",
		})
	}

	err := authClient.OTP(types.OTPRequest{
		Email:      req.Email,
		CreateUser: true,
		Data: map[string]interface{}{
			"emailRedirectTo": os.Getenv("FRONTEND_URL") + "/auth/callback",
		},
	})

	if err != nil {
		log.Printf("Error sending magic link: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to send magic link",
			"details": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Check your inbox.",
		"email":   req.Email,
	})
}

func handleRefreshToken(c *fiber.Ctx) error {
	type RefreshRequest struct {
		RefreshToken string `json:"refresh_token"`
	}

	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Refresh token is required",
		})
	}

	// Refresh the token using GoTrue
	response, err := authClient.Token(types.TokenRequest{
		GrantType:    "refresh_token",
		RefreshToken: req.RefreshToken,
	})

	if err != nil {
		log.Printf("Error refreshing token: %v", err)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid or expired refresh token",
			"details": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token":  response.AccessToken,
		"refresh_token": response.RefreshToken,
		"user":          response.User,
		"expires_in":    response.ExpiresIn,
	})
}

func handleGetUser(c *fiber.Ctx) error {
	// Get the authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header is required",
		})
	}

	// Extract the token (format: "Bearer <token>")
	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	// Get user info using the token
	client := authClient.WithToken(token)
	user, err := client.GetUser()

	if err != nil {
		log.Printf("Error getting user: %v", err)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid or expired token",
			"details": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"user": user,
	})
}

func handleCheckProfile(c *fiber.Ctx) error {
	// Get the authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header is required",
		})
	}

	// Extract the token
	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	// Get user info
	client := authClient.WithToken(token)
	user, err := client.GetUser()

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired token",
		})
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	// Check if profile exists
	req, err := http.NewRequest("GET", supabaseURL+"/rest/v1/user_profiles?id=eq."+user.ID.String(), nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check profile",
		})
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check profile",
		})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var profiles []map[string]interface{}
	json.Unmarshal(body, &profiles)

	result := fiber.Map{
		"exists": len(profiles) > 0,
		"userId": user.ID.String(),
	}

	// If profile exists, include the UID
	if len(profiles) > 0 {
		if uid, ok := profiles[0]["uid"]; ok {
			result["uid"] = uid
		}
	}

	return c.JSON(result)
}

func handleCreateProfile(c *fiber.Ctx) error {
	type CreateProfileRequest struct {
		Name string `json:"name"`
	}

	var req CreateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Name is required",
		})
	}

	// Get the authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header is required",
		})
	}

	// Extract the token
	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	// Get user info
	client := authClient.WithToken(token)
	user, err := client.GetUser()

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired token",
		})
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	// Call PostgreSQL function via Supabase RPC
	rpcPayload := map[string]interface{}{
		"p_user_id": user.ID.String(),
		"p_name":    req.Name,
	}

	jsonData, _ := json.Marshal(rpcPayload)

	httpReq, err := http.NewRequest("POST", supabaseURL+"/rest/v1/rpc/create_user_profile", bytes.NewBuffer(jsonData))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create profile",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+supabaseKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error calling Supabase function: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create profile",
		})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		log.Printf("Supabase error: %s", string(body))
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error": "Failed to create profile",
		})
	}

	var profile []map[string]interface{}
	json.Unmarshal(body, &profile)

	if len(profile) == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create profile",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"profile": profile[0],
	})
}
