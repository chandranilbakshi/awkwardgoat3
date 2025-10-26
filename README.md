# AthenaSphere

A modern, passwordless social platform built with Go and Next.js. Features magic link authentication, user profiles, and friend management.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/chandranilbakshi/awkwardgoat3.git
cd awkwardgoat3

# Start both backend and frontend
make dev

# Or run them separately:
make dev-backend  # Backend on :8080
make dev-frontend # Frontend on :3000
```

## 📋 Prerequisites

- **Go 1.25+** - Backend server
- **Node.js 18+** - Frontend application
- **Supabase Account** - Authentication & database

## ⚙️ Setup

### 1. Supabase Configuration

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Email** authentication provider
3. Add `http://localhost:3000/auth/callback` to Redirect URLs
4. Copy your **Project URL** and **Anon Key**

### 2. Environment Variables

**Backend** - Create `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
PORT=8080
FRONTEND_URL=http://localhost:3000
```

**Frontend** - Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 3. Install Dependencies

```bash
# Install all dependencies (backend + frontend)
make install

# Or install separately:
cd backend && go mod download
cd frontend && npm install
```

## 🏗️ Tech Stack

### Backend
- **Go** with Fiber v2 web framework
- **Supabase** (PostgreSQL + GoTrue Auth)
- Modular architecture with clean separation

### Frontend
- **Next.js 14** with App Router
- **React 18** with Server Components
- **Tailwind CSS** for styling

## 📁 Project Structure

```
awkwardgoat3/
├── backend/
│   ├── config/          # Environment configuration
│   ├── server/          # Server setup & routes
│   ├── handlers/        # Request handlers
│   ├── cors/           # CORS middleware
│   └── utils/          # Helper functions
├── frontend/
│   └── src/
│       ├── app/        # Next.js pages & layouts
│       ├── components/ # React components
│       └── contexts/   # State management
└── Makefile           # Development commands
```

## 🔑 Features

- ✅ **Passwordless Authentication** - Magic link via email
- ✅ **User Profiles** - Create profile with unique 8-digit UID
- ✅ **Friend System** - Send/accept requests, manage friends
- ✅ **User Search** - Find users by UID
- ✅ **Protected Routes** - Auto-redirect unauthenticated users
- ✅ **Token Management** - Access & refresh tokens

## 📚 Documentation

- [Backend Documentation](./backend/README.md) - API endpoints, architecture
- [Frontend Documentation](./frontend/README.md) - Components, routing, auth flow

## 🛠️ Make Commands

```bash
make install      # Install all dependencies
make dev          # Start both backend & frontend
make dev-backend  # Start backend only
make dev-frontend # Start frontend only
make stop         # Stop all services
```

## 🔒 Security

- Never commit `.env` files
- Use HTTPS in production
- Implement rate limiting
- Move tokens to httpOnly cookies for production
- Keep service_role keys secret

## 📝 License

MIT

## 👥 Contributing

Contributions welcome! Please read the contribution guidelines before submitting PRs.

---

Built with ❤️ using Go and Next.js
