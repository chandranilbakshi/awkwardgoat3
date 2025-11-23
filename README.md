<div align="center">

# 🌐 AthenaSphere

### *Real-time communication redefined*

**WebRTC voice calling • Instant messaging • Seamless connections**

[![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-orange?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-green?style=for-the-badge&logo=socket.io&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

### 🚀 **[Try It Live at zibro.live](https://zibro.live/)** 🚀

*No installation required • Passwordless login • Ready in seconds*

</div>

<br>

> **💬 Love it? Hate it?** Share your experience on social media and let us know what you think!

<br>

---

## 📊 Feature Showcase

<table>
<tr>
<td width="50%" valign="top">

### 🔐 **Passwordless Authentication**
- Magic link email login
- Zero password management
- JWT session tokens
- Auto-refresh sessions
- Secure by default

</td>
<td width="50%" valign="top">

### 👥 **Smart Friend System**
- Unique 8-digit UIDs
- Send/receive requests
- Filter by status
- Real-time updates
- One-click copying

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 💬 **Real-time Messaging**
- Instant WebSocket delivery
- Virtual scroll (1000s msgs)
- Persistent chat history
- Optimistic UI updates
- Cross-device sync

</td>
<td width="50%" valign="top">

### 🎙️ **WebRTC Voice Calls**
- P2P audio connection
- Custom ringtones
- Mute/unmute control
- Live call duration
- NAT traversal (STUN/TURN)

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🎨 **Modern Interface**
- Responsive mobile/desktop
- VS Code dark theme
- Smooth animations
- Resizable panels
- Toast notifications

</td>
<td width="50%" valign="top">

### ⚡ **Performance First**
- Virtual scrolling
- Local message caching
- Debounced searches
- Lazy loading
- Optimized rendering

</td>
</tr>
</table>

<br>

<br>

---

## 🎯 Core Features

<details>
<summary><b>🔐 Authentication & Security</b></summary>

<br>

> **Passwordless magic links** powered by Supabase GoTrue

**Features:**
- 📧 Email-based magic link authentication
- 🔑 JWT access & refresh token management
- 🛡️ Protected route guards with auto-redirect
- 🔄 Automatic session refresh
- 💾 Secure token storage
- ⏱️ Session persistence across browser restarts

**Security Measures:**
- ✅ Encrypted database storage (Supabase)
- ✅ CORS protection
- ✅ Input validation & sanitization
- ✅ Secure WebSocket connections

</details>

<details>
<summary><b>👥 Friend Management</b></summary>

<br>

> **Connect with anyone using simple 8-digit UIDs**

**Discovery:**
- 🔍 Search friends by unique UID
- ⚡ Debounced search (instant results)
- 📋 One-click UID copy to clipboard
- 🎯 Exact match user lookup

**Request System:**
- 📤 Send friend requests
- 📥 Receive & manage incoming requests
- 🏷️ Status filters (pending/accepted/rejected)
- 👀 View sent/received request tabs
- ✅ Accept or ❌ reject with one click
- 🔄 Real-time list updates via WebSocket

</details>

<details>
<summary><b>💬 Real-time Messaging</b></summary>

<br>

> **Lightning-fast chat with WebSocket synchronization**

**Core Messaging:**
- ⚡ Instant message delivery via WebSocket
- 💾 Persistent storage in Supabase PostgreSQL
- 🔄 Cross-device message synchronization
- 📱 Optimistic UI updates (instant feedback)
- 🕐 Timestamp-based message ordering

**Performance Optimization:**
- 📜 Virtual scrolling (@tanstack/react-virtual)
- 💨 Handle 1000s of messages smoothly
- 🗂️ Local message caching (chatStorage.js)
- 📦 Batch message loading
- 🎯 Efficient re-render prevention

**UI Features:**
- 📐 Resizable chat panels
- 📱 Responsive mobile/desktop layouts
- 👤 Own vs received message styling
- ⏰ Grouped timestamps
- 🔵 Send/delivery indicators

</details>

<details>
<summary><b>🎙️ WebRTC Voice Calls</b></summary>

<br>

> **Crystal-clear peer-to-peer voice communication**

**Call Features:**
- 📞 Initiate voice calls with any friend
- 📲 Incoming call notifications
- 🔊 Custom ringtones (incoming/outgoing)
- 🎤 Mute/unmute microphone control
- ⏱️ Live call duration timer
- 📱 Call state management (idle/ringing/calling/active)

**Technical Implementation:**
- 🌐 WebRTC peer-to-peer connection
- 🔌 WebSocket-based signaling server
- 🧊 ICE candidate exchange
- 🎯 SDP offer/answer negotiation
- 🌍 STUN/TURN for NAT traversal
- 🔊 Direct browser-to-browser audio streams

**User Experience:**
- 🎨 Beautiful call modal UI
- 🔔 Toast notifications for call events
- ⏰ Auto-cleanup on call end
- 🎵 Ringtone looping & auto-stop
- 🖼️ User avatar placeholders

</details>

<details>
<summary><b>🎨 User Interface & Design</b></summary>

<br>

> **Modern, responsive, and delightful to use**

**Design System:**
- 🌑 VS Code-inspired dark theme
- 🎨 Consistent color palette
- 📱 Mobile-first responsive design
- ✨ Smooth animations & transitions
- 🎯 Intuitive component hierarchy

**Components:**
- 🪟 Dynamic modals with positioning
- 🍞 Toast notifications (react-hot-toast)
- 📊 Loading skeletons
- 🔄 Spinner indicators
- 💬 Custom message bubbles
- 👤 Avatar placeholders

**Interactions:**
- 🖱️ Resizable panels (drag to adjust)
- 📜 Virtual scroll (smooth infinite scroll)
- ⌨️ Keyboard shortcuts support
- 🎯 Focus management
- 📲 Touch-optimized controls

</details>

<br>

<br>

---

## 🏗️ Technology Stack

<div align="center">

### **Backend**

![Go](https://img.shields.io/badge/Go-00ADD8?style=flat-square&logo=go&logoColor=white)
![Fiber](https://img.shields.io/badge/Fiber-00ACD7?style=flat-square&logo=fiber&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=flat-square&logo=socket.io&logoColor=white)

### **Frontend**

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=flat-square&logo=webrtc&logoColor=white)

</div>

<br>

<table>
<tr>
<td width="50%" valign="top">

**🔧 Backend Stack**

```
• Go 1.25+ - High-performance backend
• Fiber v2 - Express-inspired web framework
• Supabase - Auth & PostgreSQL database
• GoTrue - User authentication
• WebSocket - Real-time communication
• CORS - Cross-origin middleware
```

</td>
<td width="50%" valign="top">

**⚛️ Frontend Stack**

```
• Next.js 15.5 - App Router & SSR
• React 19 - Concurrent features
• Tailwind CSS v4 - Utility styling
• WebRTC API - P2P voice calls
• Lucide React - Icon system
• React Hot Toast - Notifications
• TanStack Virtual - Scroll optimization
```

</td>
</tr>
</table>

<br>

---

## 🔧 For Developers

<details>
<summary><b>⚙️ Prerequisites & Setup</b></summary>

<br>

**Requirements:**
- Go 1.25+
- Node.js 18+
- Supabase Account

**Quick Start:**

```bash
# Clone repository
git clone https://github.com/chandranilbakshi/athenasphere.git
cd athenasphere

# Install dependencies
make install

# Start development servers
make dev
```

**Local URLs:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`

</details>

<details>
<summary><b>📦 Make Commands</b></summary>

<br>

```bash
make install       # Install all dependencies
make dev           # Start both backend & frontend
make dev-backend   # Backend only (port 8080)
make dev-frontend  # Frontend only (port 3000)
make stop          # Stop all services
```

</details>

<details>
<summary><b>📁 Project Structure</b></summary>

<br>

```
AthenaSphere/
├── backend/
│   ├── config/                    # Environment & Supabase config
│   ├── cors/                      # CORS middleware
│   ├── handlers/
│   │   ├── handlers_auth.go       # Auth endpoints
│   │   ├── handlers_profile.go    # User profiles
│   │   ├── handlers_friends.go    # Friend system
│   │   ├── handlers_messages.go   # Chat persistence
│   │   ├── handlers_signalling.go # WebRTC signaling
│   │   └── types.go              # Type definitions
│   ├── server/
│   │   ├── fiberServer.go        # WebSocket server
│   │   └── routes.go             # API routes
│   ├── utils/
│   │   ├── auth.go               # JWT validation
│   │   └── HandleSearchByUID.go  # User search
│   └── main.go
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.js           # Main chat UI
│       │   ├── layout.js         # Root layout
│       │   ├── signup/           # Auth page
│       │   └── auth/callback/    # OAuth handler
│       ├── components/
│       │   ├── AddFriendModal.js # Friend management
│       │   ├── CallModal.js      # Call interface
│       │   └── OpenChat.js       # Chat component
│       ├── contexts/
│       │   └── AuthContext.js    # Auth state
│       ├── hooks/
│       │   ├── useApi.js         # API wrapper
│       │   ├── useMessages.js    # Message handling
│       │   ├── useWebRTC.js      # WebRTC logic
│       │   └── useWebSocket.js   # WebSocket connection
│       └── utils/
│           └── chatStorage.js    # Local caching
│
└── DOCS/
    ├── DOCKER.md                 # Deployment guide
    └── WEBRTC_IMPLEMENTATION.md  # WebRTC docs
```

</details>

<details>
<summary><b>📖 Documentation</b></summary>

<br>

- **[Backend Docs](./backend/README.md)** - API endpoints & WebSocket protocols
- **[Frontend Docs](./frontend/README.md)** - Components, hooks & architecture
- **[Docker Guide](./DOCS/DOCKER.md)** - Containerization & deployment
- **[WebRTC Implementation](./DOCS/WEBRTC_IMPLEMENTATION.md)** - Signaling details

</details>

<details>
<summary><b>🐳 Docker Deployment</b></summary>

<br>

```bash
# Build images
docker build -t athenasphere-backend ./backend
docker build -t athenasphere-frontend ./frontend

# Run containers
docker run -p 8080:8080 athenasphere-backend
docker run -p 3000:3000 athenasphere-frontend
```

See **[DOCS/DOCKER.md](./DOCS/DOCKER.md)** for complete guide.

</details>

<br>

---

## 🚢 Production Deployment

<div align="center">

### **Live at [zibro.live](https://zibro.live/)**

![Deployment](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)
![Uptime](https://img.shields.io/badge/Uptime-24/7-blue?style=for-the-badge)

</div>

<br>

> **🔒 Security:** Implements passwordless auth, JWT sessions, encrypted storage, CORS protection, and input sanitization.

<br>

---

```
AthenaSphere/
├── backend/
│   ├── config/                    # Environment & Supabase configuration
│   ├── cors/                      # CORS middleware setup
│   ├── handlers/
│   │   ├── handlers_auth.go       # Magic link auth, logout
│   │   ├── handlers_profile.go    # User profile management
│   │   ├── handlers_friends.go    # Friend requests & management
│   │   ├── handlers_messages.go   # Chat message persistence
│   │   ├── handlers_signalling.go # WebRTC signaling (offer/answer/ICE)
│   │   └── types.go              # Request/response types
│   ├── server/
│   │   ├── fiberServer.go        # WebSocket upgrade & server setup
│   │   └── routes.go             # API route definitions
│   ├── utils/
│   │   ├── auth.go               # JWT token validation
│   │   └── HandleSearchByUID.go  # User search logic
│   └── main.go                   # Application entry point
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.js           # Main chat interface
│       │   ├── layout.js         # Root layout with providers
│       │   ├── signup/           # Magic link signup page
│       │   └── auth/callback/    # OAuth callback handler
│       ├── components/
│       │   ├── AddFriendModal.js # Friend search & request management
│       │   ├── CallModal.js      # WebRTC call UI
│       │   └── OpenChat.js       # Chat interface with virtual scroll
│       ├── contexts/
│       │   └── AuthContext.js    # Global auth state
│       ├── hooks/
│       │   ├── useApi.js         # Authenticated API wrapper
│       │   ├── useMessages.js    # Message fetching & caching
│       │   ├── useWebRTC.js      # WebRTC connection management
│       │   └── useWebSocket.js   # WebSocket connection & reconnection
│       └── utils/
│           └── chatStorage.js    # Local message storage
│
├── DOCS/
│   ├── DOCKER.md                 # Docker deployment guide
│   └── WEBRTC_IMPLEMENTATION.md  # WebRTC architecture docs
│
└── Makefile                      # Development workflow commands
```

---

## 🔧 Development Workflow

### Prerequisites
- **Go 1.25+** for backend
- **Node.js 18+** for frontend  
- **Supabase Account** for auth & database

### Quick Start

```bash
# Clone the repository
git clone https://github.com/chandranilbakshi/athenasphere.git
cd athenasphere

# Install dependencies
make install

# Start both backend and frontend
make dev
```

**Local Development URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Make Commands

```bash
make install       # Install all dependencies
make dev           # Start both backend & frontend
make dev-backend   # Backend only (port 8080)
make dev-frontend  # Frontend only (port 3000)
make stop          # Stop all services
```

<br>

---

## 🎮 How It Works

<table>
<tr>
<td width="25%" align="center">
<h3>1️⃣</h3>
<h4>🔐 Auth</h4>
</td>
<td width="25%" align="center">
<h3>2️⃣</h3>
<h4>👥 Connect</h4>
</td>
<td width="25%" align="center">
<h3>3️⃣</h3>
<h4>💬 Chat</h4>
</td>
<td width="25%" align="center">
<h3>4️⃣</h3>
<h4>📞 Call</h4>
</td>
</tr>
<tr>
<td valign="top">

Email magic link → Click → Tokens stored → Authenticated

</td>
<td valign="top">

Search by UID → Send request → Accept/Reject → Friends list updates

</td>
<td valign="top">

Type message → WebSocket send → Supabase store → Instant delivery

</td>
<td valign="top">

Initiate call → WebSocket signal → P2P connect → Voice streams

</td>
</tr>
</table>

<br>

---

## 📖 Documentation

- **[Backend Docs](./backend/README.md)** - API endpoints, WebSocket protocols
- **[Frontend Docs](./frontend/README.md)** - Components, hooks, architecture
- **[Docker Guide](./DOCS/DOCKER.md)** - Containerization & deployment
- **[WebRTC Implementation](./DOCS/WEBRTC_IMPLEMENTATION.md)** - Signaling & P2P details

---

## 🚢 Deployment

### Production
The application is live at **[zibro.live](https://zibro.live/)**

### Docker Support (For Developers)
```bash
# Build images
docker build -t athenasphere-backend ./backend
docker build -t athenasphere-frontend ./frontend

# Run containers
docker run -p 8080:8080 athenasphere-backend
docker run -p 3000:3000 athenasphere-frontend
```

See **[DOCS/DOCKER.md](./DOCS/DOCKER.md)** for complete deployment guide.

---

## 🔒 Security & Privacy

This is a **collaborative personal project** between two developers. The platform implements:

- ✅ Passwordless authentication via magic links
- ✅ JWT-based session management
- ✅ Secure WebSocket connections
- ✅ Encrypted database storage (Supabase)
- ✅ CORS protection
- ✅ Input validation and sanitization

**Note:** For production environments, additional security measures like HTTPS, rate limiting, and httpOnly cookies are recommended.

---

## 🗺️ Roadmap

<table>
<tr>
<td width="50%" valign="top">

### ✅ **Currently Live**

![Live](https://img.shields.io/badge/🚀-Production-success?style=flat-square)

- ✅ Passwordless authentication
- ✅ User profiles with UIDs
- ✅ Friend request system
- ✅ Real-time messaging
- ✅ WebRTC voice calls
- ✅ WebSocket signaling
- ✅ Virtual scrolling
- ✅ Deployed at [zibro.live](https://zibro.live/)

</td>
<td width="50%" valign="top">

### 🔮 **Coming Soon**

![Planned](https://img.shields.io/badge/📅-Planned-blue?style=flat-square)

- [ ] Video calling support
- [ ] Group chats
- [ ] File sharing
- [ ] User presence indicators
- [ ] Push notifications
- [ ] Profile customization
- [ ] Message reactions
- [ ] End-to-end encryption

</td>
</tr>
</table>

<br>

<br>

---

## 💬 Feedback & Community

<div align="center">

### **We'd love to hear from you!**

<table>
<tr>
<td align="center" width="33%">
<h3>⭐</h3>
<h4>Star the Repo</h4>
<p>Show support if you like AthenaSphere!</p>
</td>
<td align="center" width="33%">
<h3>🐦</h3>
<h4>Share on Socials</h4>
<p>Tell your friends about your experience</p>
</td>
<td align="center" width="33%">
<h3>💡</h3>
<h4>Share Ideas</h4>
<p>Suggest features you'd love to see</p>
</td>
</tr>
</table>

</div>

<br>

---

## 📝 About This Project

<div align="center">

![Personal Project](https://img.shields.io/badge/Type-Personal_Project-blueviolet?style=for-the-badge)
![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</div>

<br>

> AthenaSphere is a **personal project** built by two developers as an exploration of modern web technologies and real-time communication. The platform is freely available for anyone to use at **[zibro.live](https://zibro.live/)**.

> **Note:** This repository is shared for educational and portfolio purposes. We are not accepting code contributions at this time.

<br>

---

<div align="center">

**Built with ❤️ by the AthenaSphere Team**

[![GitHub](https://img.shields.io/badge/GitHub-AthenaSphere-181717?style=for-the-badge&logo=github)](https://github.com/chandranilbakshi/athenasphere)
[![Live Demo](https://img.shields.io/badge/Live_Demo-zibro.live-success?style=for-the-badge&logo=vercel)](https://zibro.live/)

*Experience real-time communication without boundaries*

</div>
