package handlers

import (
	"athena-backend/utils"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gofiber/fiber/v2"
)

func HandleSendFriendRequest(c *fiber.Ctx) error {
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

	// Extract the token using helper function
	token := utils.ExtractBearerToken(authHeader)

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
		switch status {
		case "pending":
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Friend request already pending",
			})
		case "accepted":
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

func HandleViewFriendRequests(c *fiber.Ctx) error {
	// Get the authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header is required",
		})
	}

	// Extract the token using helper function
	token := utils.ExtractBearerToken(authHeader)

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
	var receivedErr, sentErr error

	// Use WaitGroup for parallel fetching when both types are needed
	var wg sync.WaitGroup

	// Fetch received requests if requested
	if typeFilter == "received" || typeFilter == "both" {
		wg.Add(1)
		go func() {
			defer wg.Done()

			receivedURL := supabaseURL + "/rest/v1/friend_requests?to_user_id=eq." + userID + statusQuery +
				"&select=id,status,created_at,from_user:user_profiles!friend_requests_from_user_id_fkey1(name)" +
				"&order=created_at.desc&offset=" + offsetParam + "&limit=" + limitParam

			receivedReq, err := http.NewRequest("GET", receivedURL, nil)
			if err != nil {
				receivedErr = err
				return
			}

			receivedReq.Header.Set("apikey", supabaseKey)
			receivedReq.Header.Set("Authorization", "Bearer "+token)

			receivedResp, err := http.DefaultClient.Do(receivedReq)
			if err != nil {
				log.Printf("Error fetching received requests: %v", err)
				receivedErr = err
				return
			}
			defer receivedResp.Body.Close()

			receivedBody, _ := io.ReadAll(receivedResp.Body)

			if receivedResp.StatusCode != 200 {
				log.Printf("Supabase error (received): %s", string(receivedBody))
				receivedErr = fmt.Errorf("supabase returned status %d", receivedResp.StatusCode)
				return
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
		}()
	}

	// Fetch sent requests if requested
	if typeFilter == "sent" || typeFilter == "both" {
		wg.Add(1)
		go func() {
			defer wg.Done()

			sentURL := supabaseURL + "/rest/v1/friend_requests?from_user_id=eq." + userID + statusQuery +
				"&select=id,status,created_at,to_user:user_profiles!friend_requests_to_user_id_fkey1(name)" +
				"&order=created_at.desc&offset=" + offsetParam + "&limit=" + limitParam

			sentReq, err := http.NewRequest("GET", sentURL, nil)
			if err != nil {
				sentErr = err
				return
			}

			sentReq.Header.Set("apikey", supabaseKey)
			sentReq.Header.Set("Authorization", "Bearer "+token)

			sentResp, err := http.DefaultClient.Do(sentReq)
			if err != nil {
				log.Printf("Error fetching sent requests: %v", err)
				sentErr = err
				return
			}
			defer sentResp.Body.Close()

			sentBody, _ := io.ReadAll(sentResp.Body)

			if sentResp.StatusCode != 200 {
				log.Printf("Supabase error (sent): %s", string(sentBody))
				sentErr = fmt.Errorf("supabase returned status %d", sentResp.StatusCode)
				return
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
		}()
	}

	// Wait for all goroutines to complete
	wg.Wait()

	// Check for errors
	if receivedErr != nil && (typeFilter == "received" || typeFilter == "both") {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch received requests",
		})
	}
	if sentErr != nil && (typeFilter == "sent" || typeFilter == "both") {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch sent requests",
		})
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

func HandleManageFriendRequest(c *fiber.Ctx) error {
	var req ManageRequestBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.RequestID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Request ID is required",
		})
	}

	if req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Status is required",
		})
	}

	// Validate status values
	if req.Status != "accepted" && req.Status != "rejected" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Status must be 'accepted' or 'rejected'",
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

	// Update the friend request status with conditions (combines check and update in one query)
	updateData := map[string]interface{}{
		"status": req.Status,
	}

	jsonData, _ := json.Marshal(updateData)

	// Use query parameters to ensure only the recipient can update and only pending requests
	updateURL := supabaseURL + "/rest/v1/friend_requests?id=eq." + req.RequestID + "&to_user_id=eq." + user.ID.String() + "&status=eq.pending"
	httpReq, err := http.NewRequest("PATCH", updateURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update friend request",
		})
	}

	httpReq.Header.Set("apikey", supabaseKey)
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Prefer", "return=representation")

	// If accepted, prepare friendship creation in parallel
	var friendshipResp *http.Response
	var friendshipErr error
	var friendshipDone chan bool

	if req.Status == "accepted" {
		friendshipDone = make(chan bool, 1)

		go func() {
			defer func() { friendshipDone <- true }()

			// First get the from_user_id by querying the friend request
			checkReq, err := http.NewRequest("GET", supabaseURL+"/rest/v1/friend_requests?id=eq."+req.RequestID+"&select=from_user_id", nil)
			if err != nil {
				log.Printf("Error creating check request: %v", err)
				friendshipErr = err
				return
			}

			checkReq.Header.Set("apikey", supabaseKey)
			checkReq.Header.Set("Authorization", "Bearer "+token)

			checkResp, err := http.DefaultClient.Do(checkReq)
			if err != nil {
				log.Printf("Error checking friend request: %v", err)
				friendshipErr = err
				return
			}
			defer checkResp.Body.Close()

			checkBody, _ := io.ReadAll(checkResp.Body)
			var requestData []map[string]interface{}
			json.Unmarshal(checkBody, &requestData)

			if len(requestData) == 0 {
				log.Printf("Friend request not found for friendship creation")
				friendshipErr = err
				return
			}

			fromUserID := requestData[0]["from_user_id"].(string)
			toUserID := user.ID.String()

			// Ensure user_id_1 is smaller than user_id_2
			var userId1, userId2 string
			if fromUserID < toUserID {
				userId1 = fromUserID
				userId2 = toUserID
			} else {
				userId1 = toUserID
				userId2 = fromUserID
			}

			// Create friendship record
			friendshipData := map[string]interface{}{
				"user_id_1": userId1,
				"user_id_2": userId2,
			}

			friendshipJSON, _ := json.Marshal(friendshipData)

			friendshipReq, err := http.NewRequest("POST", supabaseURL+"/rest/v1/friendships", bytes.NewBuffer(friendshipJSON))
			if err != nil {
				log.Printf("Error creating friendship request: %v", err)
				friendshipErr = err
				return
			}

			friendshipReq.Header.Set("apikey", supabaseKey)
			friendshipReq.Header.Set("Authorization", "Bearer "+token)
			friendshipReq.Header.Set("Content-Type", "application/json")

			friendshipResp, friendshipErr = http.DefaultClient.Do(friendshipReq)
		}()
	}

	// Execute friend request update
	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error updating friend request: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update friend request",
		})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		log.Printf("Supabase error: %s", string(body))
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error": "Failed to update friend request",
		})
	}

	var updatedRequest []map[string]interface{}
	json.Unmarshal(body, &updatedRequest)

	// Check if any rows were updated
	if len(updatedRequest) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Friend request not found or you are not authorized to manage it",
		})
	}

	// Wait for friendship creation to complete if it was started
	if req.Status == "accepted" && friendshipDone != nil {
		<-friendshipDone
		if friendshipResp != nil {
			defer friendshipResp.Body.Close()
			if friendshipResp.StatusCode != 201 {
				friendshipBody, _ := io.ReadAll(friendshipResp.Body)
				log.Printf("Supabase error creating friendship: %s", string(friendshipBody))
			}
		}
		if friendshipErr != nil {
			log.Printf("Error creating friendship: %v", friendshipErr)
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Friend request " + req.Status + " successfully",
		"request": updatedRequest[0],
	})
}

func HandleLoadFriends(c *fiber.Ctx) error {
	// Get the authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header is required",
		})
	}

	// Extract the token using helper function
	token := utils.ExtractBearerToken(authHeader)

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
	userID := user.ID.String()

	// Use a more efficient approach: make two separate queries and combine results
	// This is cleaner than complex conditional logic

	// Query 1: Get friendships where current user is user_id_1 (friend is user_id_2)
	friends1URL := supabaseURL + "/rest/v1/friendships?user_id_1=eq." + userID +
		"&select=id,fid:user_id_2,created_at,friend:user_profiles!friendships_user_id_2_fkey1(name,uid)" +
		"&order=created_at.desc"

	// Query 2: Get friendships where current user is user_id_2 (friend is user_id_1)
	friends2URL := supabaseURL + "/rest/v1/friendships?user_id_2=eq." + userID +
		"&select=id,fid:user_id_1,created_at,friend:user_profiles!friendships_user_id_1_fkey1(name,uid)" +
		"&order=created_at.desc"

	// Execute both queries in parallel
	var friends1Resp, friends2Resp *http.Response
	var friends1Err, friends2Err error
	var wg sync.WaitGroup

	wg.Add(2)

	// Query 1
	go func() {
		defer wg.Done()
		req1, err := http.NewRequest("GET", friends1URL, nil)
		if err != nil {
			friends1Err = err
			return
		}
		req1.Header.Set("apikey", supabaseKey)
		req1.Header.Set("Authorization", "Bearer "+token)
		friends1Resp, friends1Err = http.DefaultClient.Do(req1)
	}()

	// Query 2
	go func() {
		defer wg.Done()
		req2, err := http.NewRequest("GET", friends2URL, nil)
		if err != nil {
			friends2Err = err
			return
		}
		req2.Header.Set("apikey", supabaseKey)
		req2.Header.Set("Authorization", "Bearer "+token)
		friends2Resp, friends2Err = http.DefaultClient.Do(req2)
	}()

	wg.Wait()

	// Check for errors
	if friends1Err != nil {
		log.Printf("Error fetching friends (query 1): %v", friends1Err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch friends",
		})
	}
	if friends2Err != nil {
		log.Printf("Error fetching friends (query 2): %v", friends2Err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch friends",
		})
	}

	defer friends1Resp.Body.Close()
	defer friends2Resp.Body.Close()

	// Process results from both queries
	var allFriends []map[string]interface{}

	// Process query 1 results
	if friends1Resp.StatusCode == 200 {
		body1, _ := io.ReadAll(friends1Resp.Body)
		var friends1 []map[string]interface{}
		json.Unmarshal(body1, &friends1)
		allFriends = append(allFriends, friends1...)
	}

	// Process query 2 results
	if friends2Resp.StatusCode == 200 {
		body2, _ := io.ReadAll(friends2Resp.Body)
		var friends2 []map[string]interface{}
		json.Unmarshal(body2, &friends2)
		allFriends = append(allFriends, friends2...)
	}

	// Process the results to extract friend information and sort by created_at
	var friends []fiber.Map

	for _, friendship := range allFriends {
		friendInfo := friendship["friend"].(map[string]interface{})

		friends = append(friends, fiber.Map{
			"id":   friendship["id"],
			"name": friendInfo["name"],
			"fid":  friendship["fid"],
			"uid":  friendInfo["uid"],
		})
	}

	// Note: Since we're using separate queries, the overall ordering by created_at
	// might not be perfect. For perfect ordering, we'd need to sort the combined results.
	// For now, each query is individually ordered by created_at.desc

	return c.JSON(fiber.Map{
		"friends": friends,
	})
}
