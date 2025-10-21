package main

import (
	"bytes"
	"encoding/json"
	"fmt"
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
	app.Get("/api/user/search-by-uid/:uid", handleSearchByUID)
	app.Post("/api/friends/send-request", handleSendFriendRequest)
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

func handleSearchByUID(c *fiber.Ctx) error {
	uid := c.Params("uid")

	if uid == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "UID is required",
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

	// Verify user is authenticated
	client := authClient.WithToken(token)
	_, err := client.GetUser()

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired token",
		})
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	// Query user_profiles table by UID
	httpReq, err := http.NewRequest("GET", supabaseURL+"/rest/v1/user_profiles?uid=eq."+uid+"&select=id,name,uid", nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to search user",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error querying Supabase: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to search user",
		})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		log.Printf("Supabase error: %s", string(body))
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error": "Failed to search user",
		})
	}

	var profiles []map[string]interface{}
	json.Unmarshal(body, &profiles)

	if len(profiles) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":  "User does not exist",
			"exists": false,
		})
	}

	return c.JSON(fiber.Map{
		"exists": true,
		"user": fiber.Map{
			"id":   profiles[0]["id"],
			"name": profiles[0]["name"],
			"uid":  profiles[0]["uid"],
		},
	})
}

func handleSendFriendRequest(c *fiber.Ctx) error {
	type SendRequestBody struct {
		ReceiverUID int `json:"receiver_uid"`
	}

	var req SendRequestBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.ReceiverUID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Receiver UID is required",
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

	// Get current user info
	client := authClient.WithToken(token)
	user, err := client.GetUser()

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired token",
		})
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	// Get sender's profile to get their UID
	httpReq, err := http.NewRequest("GET", supabaseURL+"/rest/v1/user_profiles?id=eq."+user.ID.String()+"&select=uid", nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get sender profile",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error querying sender profile: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get sender profile",
		})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var senderProfiles []map[string]interface{}
	json.Unmarshal(body, &senderProfiles)

	if len(senderProfiles) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sender profile not found",
		})
	}

	senderUID := int(senderProfiles[0]["uid"].(float64))

	// Check if trying to send request to self
	if senderUID == req.ReceiverUID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot send friend request to yourself",
		})
	}

	// Get receiver's user ID from UID
	receiverUIDStr := fmt.Sprintf("%d", req.ReceiverUID)
	httpReq, err = http.NewRequest("GET", supabaseURL+"/rest/v1/user_profiles?uid=eq."+receiverUIDStr+"&select=id", nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get receiver profile",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err = http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error querying receiver profile: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get receiver profile",
		})
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)
	var receiverProfiles []map[string]interface{}
	json.Unmarshal(body, &receiverProfiles)

	if len(receiverProfiles) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Receiver not found",
		})
	}

	receiverID := receiverProfiles[0]["id"].(string)

	// Check for existing friend request or friendship
	checkURL := supabaseURL + "/rest/v1/friend_requests?or=(and(sender_id.eq." + user.ID.String() + ",receiver_id.eq." + receiverID + "),and(sender_id.eq." + receiverID + ",receiver_id.eq." + user.ID.String() + "))&select=*"
	httpReq, err = http.NewRequest("GET", checkURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check existing requests",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err = http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error checking existing requests: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check existing requests",
		})
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)
	var existingRequests []map[string]interface{}
	json.Unmarshal(body, &existingRequests)

	if len(existingRequests) > 0 {
		status := existingRequests[0]["status"].(string)
		if status == "pending" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Friend request already pending",
			})
		} else if status == "accepted" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Already friends",
			})
		}
	}

	// Create friend request
	requestData := map[string]interface{}{
		"sender_id":   user.ID.String(),
		"receiver_id": receiverID,
		"status":      "pending",
	}

	jsonData, _ := json.Marshal(requestData)

	httpReq, err = http.NewRequest("POST", supabaseURL+"/rest/v1/friend_requests", bytes.NewBuffer(jsonData))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create friend request",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+supabaseKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Prefer", "return=representation")

	resp, err = http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error creating friend request: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create friend request",
		})
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)

	if resp.StatusCode != 201 {
		log.Printf("Supabase error: %s", string(body))
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error": "Failed to create friend request",
		})
	}

	var createdRequest []map[string]interface{}
	json.Unmarshal(body, &createdRequest)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Friend request sent successfully",
		"request": createdRequest[0],
	})
}
