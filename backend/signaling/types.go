package signaling

import "time"

type CallType int
type SDPType int

// CallType assigned using iota for automatic incrementing constants. (alternate to Enums)
const (
	AudioType CallType = iota
	VideoType
)

const (
	SDPTypeOffer SDPType = iota
	SDPTypeAnswer
)

type CallSDP struct {
	CallType  CallType  `json:"call_type"`
	SDPType   SDPType   `json:"sdp_type"` // offer or answer
	Sender    int       `json:"sender_id"`
	Receiver  int       `json:"receiver_id"`
	SdpString string    `json:"sdp_string"`
	Timestamp time.Time `json:"time"`
}

/*
candidate - the actual connection path
sdpMid - which media section this belongs to
sdpIndex - exact index in SDP so browser can place it correctly
*/
// As SdpMid and SdpIndex are optional fields in WEBRTC, we use pointers to understand " " vs null.
type IceCandidate struct {
	Sender    int     `json:"sender_id"`
	Receiver  int     `json:"receiver_id"`
	Candidate string  `json:"candidate"`
	SdpMid    *string `json:"sdpMid,omitempty"`
	SdpIndex  *uint16 `json:"sdpIndex,omitempty"`
}
