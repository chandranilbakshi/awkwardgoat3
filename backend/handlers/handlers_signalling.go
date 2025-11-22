package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2/log"
)

// sendCallError sends an error response back to the client when a call cannot be established
func sendCallError(client *Client, reason string, receiverID string) {
	errResponse := CallErrorResponse{
		Reason:     reason,
		ReceiverID: receiverID,
	}

	errJSON, err := json.Marshal(errResponse)
	if err != nil {
		log.Errorf("Failed to marshal error response: %v", err)
		return
	}

	wrapper := WebSocketMessage{
		Type:    MessageTypeCallError,
		Payload: json.RawMessage(errJSON),
	}

	wrapperJSON, err := json.Marshal(wrapper)
	if err != nil {
		log.Errorf("Failed to marshal error wrapper: %v", err)
		return
	}

	select {
	case client.Send <- wrapperJSON:
		log.Infof("Sent call error to %s: %s", client.UserID, reason)
	default:
		log.Warnf("Failed to send error to %s: channel full", client.UserID)
	}
}

// HandleSdpOffer forwards an SDP offer from the sender to the intended receiver via the hub.
// It checks if the receiver is online and available (not busy), then forwards the offer.
// If the receiver is offline or busy, it sends an error response back to the sender.
// Returns an error if the receiver is unavailable or if sending fails.
func HandleSdpOffer(hub *Hub, sender *Client, offer *CallSDP) error {
	receiverId := offer.Receiver

	// Look up receiver (thread-safe)
	hub.mu.RLock()
	receiver, ok := hub.clients[receiverId]
	hub.mu.RUnlock()

	if !ok {
		// Receiver is OFFLINE (not in hub)
		log.Warnf("User %s is offline, cannot deliver offer from %s", receiverId, sender.UserID)
		sendCallError(sender, "user_offline", receiverId)
		return fmt.Errorf("user %s is offline", receiverId)
	}

	// Check if receiver is available (idle)
	receiver.mu.RLock()
	receiverState := receiver.State
	receiver.mu.RUnlock()

	if receiverState != StateIdle {
		// Receiver is BUSY (calling or in_call)
		log.Warnf("User %s is busy (state: %s), cannot deliver offer from %s", receiverId, receiverState, sender.UserID)
		sendCallError(sender, "user_busy", receiverId)
		return fmt.Errorf("user %s is busy", receiverId)
	}

	// Both users available - update states to "calling"
	sender.mu.Lock()
	sender.State = StateCalling
	sender.mu.Unlock()

	receiver.mu.Lock()
	receiver.State = StateCalling
	receiver.mu.Unlock()

	// Step 1: Marshal offer
	offerJSON, err := json.Marshal(offer)
	if err != nil {
		log.Errorf("Failed to marshal offer: %v", err)
		// Reset states on error
		sender.mu.Lock()
		sender.State = StateIdle
		sender.mu.Unlock()
		receiver.mu.Lock()
		receiver.State = StateIdle
		receiver.mu.Unlock()
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
		// Reset states on error
		sender.mu.Lock()
		sender.State = StateIdle
		sender.mu.Unlock()
		receiver.mu.Lock()
		receiver.State = StateIdle
		receiver.mu.Unlock()
		return err
	}

	// Step 4: Send to receiver (non-blocking)
	select {
	case receiver.Send <- wrapperJSON:
		log.Infof("Forwarded offer from %s to %s (both now in 'calling' state)", sender.UserID, receiverId)
		return nil // Success!
	default:
		log.Errorf("Failed to send offer to %s: channel full or closed", receiverId)
		// Reset states on failure
		sender.mu.Lock()
		sender.State = StateIdle
		sender.mu.Unlock()
		receiver.mu.Lock()
		receiver.State = StateIdle
		receiver.mu.Unlock()
		sendCallError(sender, "delivery_failed", receiverId)
		return fmt.Errorf("failed to send to receiver: channel full")
	}
}

// HandleSdpAnswer forwards an SDP answer from the sender to the intended receiver (original caller) via the hub.
// When answer is successfully sent, both parties transition to "in_call" state.
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
		// Reset sender state
		sender.mu.Lock()
		sender.State = StateIdle
		sender.mu.Unlock()
		return fmt.Errorf("user %s is offline", receiverId)
	}

	// Transition both to "in_call" state (answer accepted)
	sender.mu.Lock()
	sender.State = StateInCall
	sender.mu.Unlock()

	receiver.mu.Lock()
	receiver.State = StateInCall
	receiver.mu.Unlock()

	// Step 1: Marshal answer
	answerJSON, err := json.Marshal(answer)
	if err != nil {
		log.Errorf("Failed to marshal answer: %v", err)
		// Reset states on error
		sender.mu.Lock()
		sender.State = StateIdle
		sender.mu.Unlock()
		receiver.mu.Lock()
		receiver.State = StateIdle
		receiver.mu.Unlock()
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
		// Reset states on error
		sender.mu.Lock()
		sender.State = StateIdle
		sender.mu.Unlock()
		receiver.mu.Lock()
		receiver.State = StateIdle
		receiver.mu.Unlock()
		return err
	}

	// Step 4: Send to receiver (non-blocking)
	select {
	case receiver.Send <- wrapperJSON:
		log.Infof("Forwarded answer from %s to %s (both now 'in_call')", sender.UserID, receiverId)
		return nil // Success!
	default:
		log.Errorf("Failed to send answer to %s: channel full or closed", receiverId)
		// Reset states on failure
		sender.mu.Lock()
		sender.State = StateIdle
		sender.mu.Unlock()
		receiver.mu.Lock()
		receiver.State = StateIdle
		receiver.mu.Unlock()
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

// HandleCallEnd resets both participants' states to idle when a call ends
func HandleCallEnd(hub *Hub, sender *Client, callEnd *CallEnd) error {
	// Reset sender state
	sender.mu.Lock()
	sender.State = StateIdle
	sender.mu.Unlock()

	// Find and reset receiver state
	hub.mu.RLock()
	receiver, ok := hub.clients[callEnd.ReceiverID]
	hub.mu.RUnlock()

	if ok {
		receiver.mu.Lock()
		receiver.State = StateIdle
		receiver.mu.Unlock()

		// Forward call-end message to receiver
		callEndJSON, err := json.Marshal(callEnd)
		if err != nil {
			log.Errorf("Failed to marshal call-end: %v", err)
		} else {
			wrapper := WebSocketMessage{
				Type:    MessageTypeCallEnd,
				Payload: json.RawMessage(callEndJSON),
			}

			wrapperJSON, err := json.Marshal(wrapper)
			if err != nil {
				log.Errorf("Failed to marshal wrapper: %v", err)
			} else {
				select {
				case receiver.Send <- wrapperJSON:
					log.Infof("Forwarded call-end from %s to %s", sender.UserID, callEnd.ReceiverID)
				default:
					log.Warnf("Failed to send call-end to %s: channel full", callEnd.ReceiverID)
				}
			}
		}
	}

	log.Infof("Call ended between %s and %s, both reset to idle", sender.UserID, callEnd.ReceiverID)
	return nil
}
