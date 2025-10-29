// server/server.go
package server

import (
	"athena-backend/config"
	customCors "athena-backend/cors"
	"log"

	"github.com/gofiber/fiber/v2"
)

type Server struct {
	app    *fiber.App
	config *config.Config
}

func NewApp(cfg *config.Config) *fiber.App {
	app := fiber.New(fiber.Config{
		DisableStartupMessage: false,
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
	app.Use(customCors.New())

	return app
}

func New(cfg *config.Config) *Server {
	return &Server{
		app:    NewApp(cfg),
		config: cfg,
	}
}

func (s *Server) App() *fiber.App {
	return s.app
}

func (s *Server) Start() error {
	log.Printf("Server starting on port %s", s.config.Port)
	return s.app.Listen(":" + s.config.Port)
}
