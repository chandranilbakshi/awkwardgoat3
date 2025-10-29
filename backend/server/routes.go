package server

import (
	"athena-backend/handlers"
	"athena-backend/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func SetupRoutes(app *fiber.App) {
	// Auth routes
	app.Post("/api/auth/signup", handlers.HandleSignup)
	app.Post("/api/auth/refresh", handlers.HandleRefreshToken)
	app.Get("/api/auth/me", handlers.HandleGetUser)

	// Profile routes
	app.Post("/api/user/create-profile", handlers.HandleCreateProfile)
	app.Get("/api/user/check-profile", handlers.HandleCheckProfile)

	// User search
	app.Get("/api/user/search-by-uid/:uid", utils.HandleSearchByUID)

	// Friend routes
	app.Post("/api/friends/send-request", handlers.HandleSendFriendRequest)
	app.Get("/api/friends/requests", handlers.HandleViewFriendRequests)
	app.Put("/api/friends/manage-request", handlers.HandleManageFriendRequest)
	app.Get("/api/friends/list", handlers.HandleLoadFriends)

	// Message routes
	app.Get("/api/messages/history", handlers.HandleGetMessageHistory)

	// WebSocket route - must handle upgrade
	app.Use("/ws", func(c *fiber.Ctx) error {
		// IsWebSocketUpgrade returns true if the client requested upgrade to the WebSocket protocol
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws", websocket.New(handlers.HandleWebSocket))

	// Health check
	app.Get("/api/health", handleHealth)
}

func handleHealth(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Server is running",
	})
}
