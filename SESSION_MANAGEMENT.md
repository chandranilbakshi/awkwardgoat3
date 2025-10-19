# Session Management Implementation - Complete Guide

## 🎯 What Was Implemented

### Backend (Go)
✅ **Three API Endpoints:**
1. `POST /api/auth/signup` - Send magic link
2. `POST /api/auth/refresh` - Refresh expired access token
3. `GET /api/auth/me` - Get current user info (requires auth)

### Frontend (Next.js)
✅ **Auth Context** - Global session management
✅ **Protected Routes** - Auto-redirect if not logged in
✅ **Auto Token Refresh** - Refreshes token when expired
✅ **Persistent Sessions** - User stays logged in after page refresh

---

## 🔄 How Session Management Works

### 1. **User Signs Up**
```
User enters email → Backend sends magic link → User clicks link → Tokens stored
```

### 2. **Session Check on Page Load**
```javascript
// AuthContext checks on mount:
1. Check if access_token exists in localStorage
2. Call /api/auth/me to verify token
3. If valid: Set user and continue
4. If expired: Try to refresh with refresh_token
5. If refresh fails: Logout and redirect to /signup
```

### 3. **Token Refresh Flow**
```javascript
// When access_token expires:
1. Get refresh_token from localStorage
2. Call POST /api/auth/refresh
3. Get new access_token and refresh_token
4. Store new tokens
5. Update user state
```

### 4. **Protected Pages**
```javascript
// Any page can check auth status:
const { user, isAuthenticated, loading } = useAuth();

if (!isAuthenticated) {
  // Redirect to login
}
```

---

## 📁 File Structure

```
frontend/
├── src/
│   ├── contexts/
│   │   └── AuthContext.js          ← Session management logic
│   ├── components/
│   │   └── ProtectedRoute.js       ← Wrapper for protected pages
│   ├── app/
│   │   ├── layout.js               ← Wraps app with AuthProvider
│   │   ├── page.js                 ← Home page (protected)
│   │   ├── (auth)/
│   │   │   └── signup/
│   │   │       └── page.js         ← Signup page
│   │   └── auth/
│   │       └── callback/
│   │           └── page.js         ← Magic link callback

backend/
└── main.go
    ├── handleSignup              ← Send magic link
    ├── handleRefreshToken        ← Refresh access token
    └── handleGetUser             ← Get current user
```

---

## 🎨 Usage Examples

### 1. **Use Auth in Any Component**
```javascript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 2. **Protect a Page**
```javascript
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Dashboard</h1>
        {/* Only authenticated users see this */}
      </div>
    </ProtectedRoute>
  );
}
```

### 3. **Access User Data**
```javascript
const { user } = useAuth();

console.log(user.email);
console.log(user.id);
console.log(user.created_at);
```

---

## 🔒 Security Features

✅ **Token Validation** - Tokens verified on every protected request
✅ **Auto Logout** - User logged out if token refresh fails
✅ **Secure Headers** - Authorization: Bearer token sent with requests
✅ **Token Expiry** - Access tokens expire, refresh tokens used to get new ones

---

## 🧪 Testing Session Management

### Test 1: **Login Persistence**
1. Sign up and log in
2. Close browser
3. Open browser and go back to app
4. ✅ You should still be logged in!

### Test 2: **Token Refresh**
1. Log in
2. Wait for access token to expire (default 1 hour)
3. Make a request
4. ✅ Token should auto-refresh

### Test 3: **Protected Routes**
1. Log out
2. Try to access homepage
3. ✅ Should redirect to /signup

---

## 🚀 What's Next?

Now that session management is working, you can:
1. ✅ Build your chat interface
2. ✅ Add WebSocket connections (user is authenticated)
3. ✅ Store messages in Supabase database
4. ✅ Add user profiles
5. ✅ Implement real-time features

---

## 🐛 Troubleshooting

### "User keeps getting logged out"
- Check if tokens are being stored in localStorage
- Check browser console for errors
- Verify backend /api/auth/me is returning user data

### "Session not persisting after refresh"
- Make sure AuthProvider is wrapping your app in layout.js
- Check if localStorage has access_token and refresh_token

### "Token refresh not working"
- Check refresh_token exists in localStorage
- Verify /api/auth/refresh endpoint is working
- Check token hasn't expired beyond refresh window

---

## 📊 Session Flow Diagram

```
User Opens App
      ↓
AuthContext.checkAuth()
      ↓
Has access_token?
   ↙     ↘
 YES      NO
  ↓        ↓
Verify   Show
Token    Login
  ↓
Valid?
 ↙  ↘
YES  NO
 ↓    ↓
Set  Refresh
User Token
      ↓
   Success?
    ↙  ↘
  YES   NO
   ↓     ↓
  Set  Logout
  User
```

---

Your session management is now fully implemented! 🎉
