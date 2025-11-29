package handlers

import (
	"athena-backend/utils"
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
)

func HandleCheckProfile(c *fiber.Ctx) error {
	// Get the authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header is required",
		})
	}

	// Extract the token using helper function
	token := utils.ExtractBearerToken(authHeader)

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

func HandleCreateProfile(c *fiber.Ctx) error {
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

	// Extract the token using helper function
	token := utils.ExtractBearerToken(authHeader)

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

func HandleCheckId(c *fiber.Ctx) error {
	// Get the authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header is required",
		})
	}

	// Extract the token using helper function
	token := utils.ExtractBearerToken(authHeader)

	// Verify the authenticated user
	client := authClient.WithToken(token)
	_, err := client.GetUser()

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired token",
		})
	}

	// Get the user ID from query parameter or path parameter
	userId := c.Query("id")
	if userId == "" {
		userId = c.Params("id")
	}

	if userId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	// Check if profile exists and get only the name column
	req, err := http.NewRequest("GET", supabaseURL+"/rest/v1/user_profiles?id=eq."+userId+"&select=name", nil)
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

	// If profile exists, include the name
	if len(profiles) > 0 {
		if name, ok := profiles[0]["name"]; ok {
			result["name"] = name
		}
	}

	return c.JSON(result)
}
