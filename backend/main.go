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
	app.Get("/api/user/search-by-uid/:uid", handleSearchByUID)
	app.Post("/api/friends/send-request", handleSendFriendRequest)
	app.Get("/api/friends/requests", handleViewFriendRequests)
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
	req.Header.Set("Authorization", "Bearer "+token)

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
	httpReq.Header.Set("Authorization", "Bearer "+token)
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
	httpReq, err := http.NewRequest("GET", supabaseURL+"/rest/v1/user_profiles?uid=eq."+uid+"&select=id,name", nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to search user",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+token)

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
		},
	})
}

func handleSendFriendRequest(c *fiber.Ctx) error {
	type SendRequestBody struct {
		ReceiverID string `json:"receiver_id"`
	}

	var req SendRequestBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.ReceiverID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Receiver ID is required",
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

	// Check if trying to send request to self
	if user.ID.String() == req.ReceiverID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot send friend request to yourself",
		})
	}

	// Check for existing friend request or friendship
	checkURL := supabaseURL + "/rest/v1/friend_requests?or=(and(from_user_id.eq." + user.ID.String() + ",to_user_id.eq." + req.ReceiverID + "),and(from_user_id.eq." + req.ReceiverID + ",to_user_id.eq." + user.ID.String() + "))&select=*"
	httpReq, err := http.NewRequest("GET", checkURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check existing requests",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error checking existing requests: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check existing requests",
		})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
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
		"from_user_id": user.ID.String(),
		"to_user_id":   req.ReceiverID,
		"status":       "pending",
	}

	jsonData, _ := json.Marshal(requestData)

	httpReq, err = http.NewRequest("POST", supabaseURL+"/rest/v1/friend_requests", bytes.NewBuffer(jsonData))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create friend request",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Prefer", "return=representation")

	resp2, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error creating friend request: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create friend request",
		})
	}
	defer resp2.Body.Close()

	body2, _ := io.ReadAll(resp2.Body)

	if resp2.StatusCode != 201 {
		log.Printf("Supabase error: %s", string(body2))
		return c.Status(resp2.StatusCode).JSON(fiber.Map{
			"error": "Failed to create friend request",
		})
	}

	var createdRequest []map[string]interface{}
	json.Unmarshal(body2, &createdRequest)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Friend request sent successfully",
		"request": createdRequest[0],
	})
}

func handleViewFriendRequests(c *fiber.Ctx) error {
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

	// Get query parameters
	offsetParam := c.Query("offset", "0")
	limitParam := c.Query("limit", "5")
	statusFilter := c.Query("status", "") // empty means all statuses
	typeFilter := c.Query("type", "both") // "sent", "received", or "both" (default)

	// Build status filter for query
	statusQuery := ""
	if statusFilter != "" {
		statusQuery = "&status=eq." + statusFilter
	}

	userID := user.ID.String()

	var formattedReceived []fiber.Map
	var formattedSent []fiber.Map

	// Fetch received requests if requested
	if typeFilter == "received" || typeFilter == "both" {
		receivedURL := supabaseURL + "/rest/v1/friend_requests?to_user_id=eq." + userID + statusQuery +
			"&select=id,status,created_at,from_user:user_profiles!friend_requests_from_user_id_fkey1(name)" +
			"&order=created_at.desc&offset=" + offsetParam + "&limit=" + limitParam

		receivedReq, err := http.NewRequest("GET", receivedURL, nil)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch received requests",
			})
		}

		receivedReq.Header.Set("apikey", supabaseKey)
		receivedReq.Header.Set("Authorization", "Bearer "+token)

		receivedResp, err := http.DefaultClient.Do(receivedReq)
		if err != nil {
			log.Printf("Error fetching received requests: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch received requests",
			})
		}
		defer receivedResp.Body.Close()

		receivedBody, _ := io.ReadAll(receivedResp.Body)

		if receivedResp.StatusCode != 200 {
			log.Printf("Supabase error (received): %s", string(receivedBody))
			return c.Status(receivedResp.StatusCode).JSON(fiber.Map{
				"error": "Failed to fetch received requests",
			})
		}

		var receivedRequests []map[string]interface{}
		json.Unmarshal(receivedBody, &receivedRequests)

		// Format the received requests
		formattedReceived = make([]fiber.Map, 0, len(receivedRequests))
		for _, req := range receivedRequests {
			fromUser := req["from_user"].(map[string]interface{})
			formattedReceived = append(formattedReceived, fiber.Map{
				"id":         req["id"],
				"user_name":  fromUser["name"],
				"status":     req["status"],
				"created_at": req["created_at"],
				"direction":  "received",
			})
		}
	}

	// Fetch sent requests if requested
	if typeFilter == "sent" || typeFilter == "both" {
		sentURL := supabaseURL + "/rest/v1/friend_requests?from_user_id=eq." + userID + statusQuery +
			"&select=id,status,created_at,to_user:user_profiles!friend_requests_to_user_id_fkey1(name)" +
			"&order=created_at.desc&offset=" + offsetParam + "&limit=" + limitParam

		sentReq, err := http.NewRequest("GET", sentURL, nil)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch sent requests",
			})
		}

		sentReq.Header.Set("apikey", supabaseKey)
		sentReq.Header.Set("Authorization", "Bearer "+token)

		sentResp, err := http.DefaultClient.Do(sentReq)
		if err != nil {
			log.Printf("Error fetching sent requests: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch sent requests",
			})
		}
		defer sentResp.Body.Close()

		sentBody, _ := io.ReadAll(sentResp.Body)

		if sentResp.StatusCode != 200 {
			log.Printf("Supabase error (sent): %s", string(sentBody))
			return c.Status(sentResp.StatusCode).JSON(fiber.Map{
				"error": "Failed to fetch sent requests",
			})
		}

		var sentRequests []map[string]interface{}
		json.Unmarshal(sentBody, &sentRequests)

		// Format the sent requests
		formattedSent = make([]fiber.Map, 0, len(sentRequests))
		for _, req := range sentRequests {
			toUser := req["to_user"].(map[string]interface{})
			formattedSent = append(formattedSent, fiber.Map{
				"id":         req["id"],
				"user_name":  toUser["name"],
				"status":     req["status"],
				"created_at": req["created_at"],
				"direction":  "sent",
			})
		}
	}

	response := fiber.Map{
		"offset": offsetParam,
		"limit":  limitParam,
	}

	// Only include the requested types in the response
	if typeFilter == "received" || typeFilter == "both" {
		response["received"] = formattedReceived
	}
	if typeFilter == "sent" || typeFilter == "both" {
		response["sent"] = formattedSent
	}

	return c.JSON(response)
}

func handleManageFriendRequest(c *fiber.Ctx) error {
	// This function can be implemented to handle accepting or rejecting friend requests

	return nil
}
