# NexComm - Custom Communication Platform

A private, admin-controlled, full-stack communication platform combining real-time video calling, instant messaging, content sharing, and live GPS location tracking.

## ✅ Completed Features

### Backend (`packages/server`)
- Express REST API with security middleware
- JWT authentication with refresh tokens
- User management (CRUD, roles, suspend)
- Group management
- Message routes with reactions, pin, search
- File upload endpoints
- Socket.IO WebSocket for real-time features
- WebRTC signaling support
- Live location sharing via WebSocket
- Typing indicators and read receipts
- RBAC middleware

### Database (`packages/database`)
- Prisma schema with 10 models
- Service functions for Auth, Users, Groups, Messages

### Admin Dashboard (`apps/admin`)
- Login page with authentication
- Dashboard with real-time statistics
- User Management Table with:
  - Role changes (Member/Moderator/Admin)
  - Suspend/unsuspend users
  - Delete users
  - **Initiate audio/video calls to any user** ⭐
- Modern dark theme UI

### Web App (`apps/web`)
- **Chat Page** (`/chat/[chatId]`):
  - Real-time messaging via Socket.IO
  - Read receipts, typing indicators
  - Audio/Video call buttons
  - Location sharing button
  - Voice message recording

- **Call Page** (`/call/[callId]`):
  - WebRTC peer-to-peer video/audio calls
  - Mute/unmute, toggle camera
  - Screen sharing
  - In-call text chat sidebar
  - Call duration timer

- **Location Sharing** (`/location`):
  - Real-time GPS tracking
  - Configurable duration (15min - 8 hours)
  - Pause/Resume/Stop controls
  - Map view with user markers

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure
docker-compose up -d

# 3. Setup environment
cp .env.example .env

# 4. Initialize database
cd packages/database && npx prisma generate && npx prisma migrate dev && cd ../..

# 5. Run development servers
npm run dev
```

Access:
- Web App: http://localhost:3000
- Admin Dashboard: http://localhost:3001
- Backend API: http://localhost:4000

## 📱 Key Feature: Admin Calling

Admins can initiate calls directly from the user management table by clicking the phone or video icon next to any user. This triggers WebRTC signaling via Socket.IO.

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Real-Time | Socket.IO, WebRTC |
| Database | PostgreSQL, Prisma ORM |
| Cache | Redis |
| Auth | JWT + Refresh Tokens |
