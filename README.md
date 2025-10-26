# Athena

A modern, passwordless social platform built with **Go** and **Next.js**. Connect with friends using magic link authentication - no passwords needed! 🔐✨

[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## ✨ Highlights

- 🔐 **Passwordless Auth** - Secure magic link authentication via Supabase
- 👥 **Friend Management** - Send, accept, and manage friend requests
- 🔍 **User Discovery** - Find friends using unique 8-digit UIDs
- 🎨 **Modern Stack** - Go + Next.js 14 with App Router
- 🏗️ **Clean Architecture** - Modular, scalable, and maintainable codebase

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/chandranilbakshi/awkwardgoat3.git
cd awkwardgoat3

# Install dependencies
make install

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

- ✅ **Passwordless Authentication** - Magic link via email (powered by Supabase)
- ✅ **User Profiles** - Unique 8-digit UID for easy friend discovery
- ✅ **Friend System** - Send, accept, reject friend requests
- ✅ **User Search** - Find friends by their UID
- ✅ **Protected Routes** - Automatic auth redirects
- ✅ **Token Management** - Secure access & refresh token handling
- ✅ **Real-time Updates** - Built on modern architecture for future WebSocket/WebRTC integration

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

⚠️ **Production Deployment Checklist:**
- [ ] Never commit `.env` or `.env.local` files
- [ ] Use HTTPS only (enforce with redirects)
- [ ] Implement rate limiting on auth endpoints
- [ ] Move tokens from localStorage to httpOnly cookies
- [ ] Keep Supabase `service_role` keys secret
- [ ] Enable CORS only for trusted origins
- [ ] Add input validation and sanitization
- [ ] Set up proper logging and monitoring

## 🗺️ Roadmap

- [ ] WebSocket support for real-time messaging
- [ ] WebRTC integration for video/voice calls
- [ ] User status (online/offline)
- [ ] Push notifications
- [ ] Profile customization (avatar, bio)
- [ ] Group chats

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

We welcome contributions! Here's how you can help:

1. 🍴 Fork the repository
2. 🔨 Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. 💾 Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push to the branch (`git push origin feature/AmazingFeature`)
5. 🎉 Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate tests.

## 🐛 Issues & Support

Found a bug or have a feature request? [Open an issue](https://github.com/chandranilbakshi/awkwardgoat3/issues) on GitHub.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Authentication & Database
- [Fiber](https://gofiber.io/) - Go Web Framework
- [Next.js](https://nextjs.org/) - React Framework

---

**Made with ❤️ by [Chandranil Bakshi](https://github.com/chandranilbakshi)**

If you find this project useful, please give it a ⭐!
