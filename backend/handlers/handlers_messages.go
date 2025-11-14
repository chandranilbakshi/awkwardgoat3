package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

var hub = &Hub{
	clients:    make(map[string]*Client),
	broadcast:  make(chan *Message),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

// Initialize the hub
func init() {
	go hub.run()
}

// Run the hub to manage clients and messages
func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.UserID] = client
			h.mu.Unlock()
			log.Printf("Client registered: %s", client.UserID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				close(client.Send)
				log.Printf("Client unregistered: %s", client.UserID)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			// Store message in Supabase
			if err := storeMessage(message); err != nil {
				log.Printf("Error storing message: %v", err)
			}

			// Send to recipient if online
			h.mu.RLock()
			recipientID := message.UserID2
			if message.SenderID == message.UserID2 {
				recipientID = message.UserID1
			}

			if client, ok := h.clients[recipientID]; ok {
				messageJSON, _ := json.Marshal(message)
				select {
				case client.Send <- messageJSON:
				default:
					close(client.Send)
					delete(h.clients, client.UserID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Store message in Supabase
func storeMessage(msg *Message) error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	// Create request body
	body := map[string]interface{}{
		"user_id_1":  msg.UserID1,
		"user_id_2":  msg.UserID2,
		"sender_id":  msg.SenderID,
		"content":    msg.Content,
		"created_at": msg.CreatedAt.Format(time.RFC3339),
	}

	bodyJSON, err := json.Marshal([]interface{}{body})
	if err != nil {
		return err
	}

	// Make HTTP request to Supabase REST API
	url := fmt.Sprintf("%s/rest/v1/messages", supabaseURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyJSON))
	if err != nil {
		return err
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("Supabase insert error: Status %d, Body: %s", resp.StatusCode, string(bodyBytes))
		return fmt.Errorf("failed to insert message: %d", resp.StatusCode)
	}

	return nil
}

// WebSocket connection handler
func HandleWebSocket(c *websocket.Conn) {
	// Get AUTHENTICATED user ID from context (not from query!)
	userIDInterface := c.Locals("authenticated_user_id")
	if userIDInterface == nil {
		log.Println("No authenticated user in WebSocket context")
		c.Close()
		return
	}

	userID := userIDInterface.(string)
	log.Printf("Authenticated WebSocket connection for user: %s", userID)

	client := &Client{
		UserID: userID,
		Conn:   c,
		Send:   make(chan []byte, 256),
	}

	hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	client.readPump()
}

// Read messages from WebSocket
func (c *Client) readPump() {
	defer func() {
		hub.unregister <- c
		c.Conn.Close()
	}()

	for {
		var msg Message
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Ensure user_id_1 < user_id_2 for consistency
		userIDs := []string{msg.UserID1, msg.UserID2}
		sort.Strings(userIDs)
		msg.UserID1 = userIDs[0]
		msg.UserID2 = userIDs[1]
		msg.CreatedAt = time.Now()

		// Broadcast message
		hub.broadcast <- &msg
	}
}

// Write messages to WebSocket
func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()

	for message := range c.Send {
		err := c.Conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			return
		}
	}
}

// HandleGetMessageHistory retrieves message history between two users
func HandleGetMessageHistory(c *fiber.Ctx) error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	// Get authorization token
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "No authorization token provided",
		})
	}

	// Extract the token (format: "Bearer <token>")
	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	// Verify token and get user
	client := authClient.WithToken(token)
	user, err := client.GetUser()
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid token",
		})
	}

	// Get friend ID from query params
	friendID := c.Query("friend_id")
	if friendID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "friend_id is required",
		})
	}

	limit := c.QueryInt("limit", 100)
	offset := c.QueryInt("offset", 0)

	// Get optional 'since' parameter for incremental sync
	sinceParam := c.Query("since")

	// Ensure user_id_1 < user_id_2
	userIDs := []string{user.ID.String(), friendID}
	sort.Strings(userIDs)
	userID1 := userIDs[0]
	userID2 := userIDs[1]

	// Build query URL with optional 'since' filter
	var url string
	if sinceParam != "" {
		// Incremental sync: fetch only messages created after 'since' timestamp
		url = fmt.Sprintf("%s/rest/v1/messages?user_id_1=eq.%s&user_id_2=eq.%s&created_at=gt.%s&order=created_at.asc&limit=%d",
			supabaseURL, userID1, userID2, sinceParam, limit)
	} else {
		// Full sync: fetch all messages with limit and offset
		url = fmt.Sprintf("%s/rest/v1/messages?user_id_1=eq.%s&user_id_2=eq.%s&order=created_at.asc&limit=%d&offset=%d",
			supabaseURL, userID1, userID2, limit, offset)
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create request",
		})
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)

	httpClient := &http.Client{}
	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("Error fetching messages: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch messages",
		})
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read response",
		})
	}

	var messages []Message
	if err := json.Unmarshal(bodyBytes, &messages); err != nil {
		log.Printf("Error unmarshaling messages: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to parse messages",
		})
	}

	return c.JSON(fiber.Map{
		"messages":     messages,
		"current_user": user.ID.String(),
	})
}
