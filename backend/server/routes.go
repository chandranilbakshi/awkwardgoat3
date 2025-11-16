package server

import (
	"athena-backend/handlers"
	"athena-backend/utils"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/supabase-community/gotrue-go"
)

var authClient gotrue.Client

// SetAuthClient sets the auth client for use in utils
func SetAuthClient(client gotrue.Client) {
	authClient = client
}

func SetupRoutes(app *fiber.App) {
	// Auth routes
	app.Post("/api/auth/signup", handlers.HandleSignup)
	app.Post("/api/auth/refresh", handlers.HandleRefreshToken)
	app.Get("/api/auth/me", handlers.HandleGetUser)

	// Profile routes
	app.Post("/api/user/create-profile", handlers.HandleCreateProfile)
	app.Get("/api/user/check-profile", handlers.HandleCheckProfile)
	app.Get("/api/user/get-name/:id", handlers.HandleCheckId) // Path parameter
	app.Get("/api/user/get-name", handlers.HandleCheckId)     // Query parameter

	// User search
	app.Get("/api/user/search-by-uid/:uid", utils.HandleSearchByUID)

	// Friend routes
	app.Post("/api/friends/send-request", handlers.HandleSendFriendRequest)
	app.Get("/api/friends/requests", handlers.HandleViewFriendRequests)
	app.Put("/api/friends/manage-request", handlers.HandleManageFriendRequest)
	app.Get("/api/friends/list", handlers.HandleLoadFriends)

	// Message routes
	app.Get("/api/messages/history", handlers.HandleGetMessageHistory)

	app.Get("/ws", func(c *fiber.Ctx) error {
		// Check if WebSocket upgrade
		if !websocket.IsWebSocketUpgrade(c) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "WebSocket upgrade required",
			})
		}

		// Get token from query parameter
		token := c.Query("token")
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication token required",
			})
		}

		// Verify token and get user (same as your HTTP calls)
		client := authClient.WithToken(token)
		user, err := client.GetUser()
		if err != nil {
			log.Printf("WebSocket auth failed: %v", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Store authenticated user_id in context
		c.Locals("authenticated_user_id", user.ID.String())

		// Upgrade to WebSocket
		return websocket.New(handlers.HandleWebSocket)(c)
	})

	// Health check
	app.Get("/api/health", handleHealth)
}

func handleHealth(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Server is running",
	})
}
