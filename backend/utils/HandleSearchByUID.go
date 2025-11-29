package utils

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"io"
	"log"
	"net/http"
	"os"
)

func HandleSearchByUID(c *fiber.Ctx) error {
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

	// Extract the token using helper function
	token := ExtractBearerToken(authHeader)

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
