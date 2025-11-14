package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2/log"
)

// HandleSdpOffer forwards an SDP offer from the sender to the intended receiver via the hub.
// It checks if the receiver is online, marshals the offer, and sends it over a non-blocking channel.
// Returns an error if the receiver is offline or if sending fails.
func HandleSdpOffer(hub *Hub, sender *Client, offer *CallSDP) error {
	receiverId := offer.Receiver

	// Look up receiver (thread-safe)
	hub.mu.RLock()
	receiver, ok := hub.clients[receiverId]
	hub.mu.RUnlock()

	if !ok {
		// Receiver is OFFLINE
		log.Warnf("User %s is offline, cannot deliver offer from %s", receiverId, sender.UserID)
		return fmt.Errorf("user %s is offline", receiverId)
	}

	// Receiver is ONLINE - forward the offer

	// Step 1: Marshal offer
	offerJSON, err := json.Marshal(offer)
	if err != nil {
		log.Errorf("Failed to marshal offer: %v", err)
		return err
	}

	// Step 2: Create wrapper
	wrapper := WebSocketMessage{
		Type:    MessageTypeCallOffer,
		Payload: json.RawMessage(offerJSON),
	}

	// Step 3: Marshal wrapper
	wrapperJSON, err := json.Marshal(wrapper)
	if err != nil {
		log.Errorf("Failed to marshal wrapper: %v", err)
		return err
	}

	// Step 4: Send to receiver (non-blocking)
	select {
	case receiver.Send <- wrapperJSON:
		log.Infof("Forwarded offer from %s to %s", sender.UserID, receiverId)
		return nil // Success!
	default:
		log.Errorf("Failed to send offer to %s: channel full or closed", receiverId)
		return fmt.Errorf("failed to send to receiver: channel full")
	}
}

// HandleSdpAnswer forwards an SDP answer from the sender to the intended receiver (original caller) via the hub.
// It checks if the receiver is online, marshals the answer, and sends it over a non-blocking channel.
// Returns an error if the receiver is offline or if sending fails.
func HandleSdpAnswer(hub *Hub, sender *Client, answer *CallSDP) error {
	receiverId := answer.Receiver

	// Look up receiver (thread-safe)
	hub.mu.RLock()
	receiver, ok := hub.clients[receiverId]
	hub.mu.RUnlock()

	if !ok {
		// Receiver is OFFLINE
		log.Warnf("User %s is offline, cannot deliver answer from %s", receiverId, sender.UserID)
		return fmt.Errorf("user %s is offline", receiverId)
	}

	// Receiver is ONLINE - forward the answer

	// Step 1: Marshal answer
	answerJSON, err := json.Marshal(answer)
	if err != nil {
		log.Errorf("Failed to marshal answer: %v", err)
		return err
	}

	// Step 2: Create wrapper
	wrapper := WebSocketMessage{
		Type:    MessageTypeCallAnswer,
		Payload: json.RawMessage(answerJSON),
	}

	// Step 3: Marshal wrapper
	wrapperJSON, err := json.Marshal(wrapper)
	if err != nil {
		log.Errorf("Failed to marshal wrapper: %v", err)
		return err
	}

	// Step 4: Send to receiver (non-blocking)
	select {
	case receiver.Send <- wrapperJSON:
		log.Infof("Forwarded answer from %s to %s", sender.UserID, receiverId)
		return nil // Success!
	default:
		log.Errorf("Failed to send answer to %s: channel full or closed", receiverId)
		return fmt.Errorf("failed to send to receiver: channel full")
	}
}

// HandleIceCandidate forwards an ICE candidate from the sender to the intended receiver via the hub.
// It checks if the receiver is online, marshals the candidate, and sends it over a non-blocking channel.
// Returns an error if the receiver is offline or if sending fails.
// Note: ICE candidates are time-sensitive and may be sent in bursts.
func HandleIceCandidate(hub *Hub, sender *Client, candidate *IceCandidate) error {
	receiverId := candidate.Receiver

	// Look up receiver (thread-safe)
	hub.mu.RLock()
	receiver, ok := hub.clients[receiverId]
	hub.mu.RUnlock()

	if !ok {
		// Receiver is OFFLINE
		log.Warnf("User %s is offline, cannot deliver ICE candidate from %s", receiverId, sender.UserID)
		return fmt.Errorf("user %s is offline", receiverId)
	}

	// Receiver is ONLINE - forward the ICE candidate

	// Step 1: Marshal candidate
	candidateJSON, err := json.Marshal(candidate)
	if err != nil {
		log.Errorf("Failed to marshal ICE candidate: %v", err)
		return err
	}

	// Step 2: Create wrapper
	wrapper := WebSocketMessage{
		Type:    MessageTypeIceCandidate,
		Payload: json.RawMessage(candidateJSON),
	}

	// Step 3: Marshal wrapper
	wrapperJSON, err := json.Marshal(wrapper)
	if err != nil {
		log.Errorf("Failed to marshal wrapper: %v", err)
		return err
	}

	// Step 4: Send to receiver (non-blocking)
	select {
	case receiver.Send <- wrapperJSON:
		log.Infof("Forwarded ICE candidate from %s to %s", sender.UserID, receiverId)
		return nil // Success!
	default:
		log.Errorf("Failed to send ICE candidate to %s: channel full or closed", receiverId)
		return fmt.Errorf("failed to send to receiver: channel full")
	}
}
