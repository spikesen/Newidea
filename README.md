# NexComm - Private Communication Platform

A **private, admin-controlled, full-stack communication platform** combining real-time video calling, instant messaging, content sharing, and live GPS location tracking.

## 🚀 Features

### Core Modules
- **Video Calling**: 1-on-1 and group calls (up to 12 participants) with screen sharing
- **Messaging**: E2EE direct messages, group chats, reactions, read receipts
- **Content Sharing**: Files, images, voice messages with virus scanning
- **GPS Location**: Real-time location sharing with geofencing alerts

### Admin Control Panel
- User management (invite, suspend, remove)
- Group management
- Platform settings & analytics
- Audit logs

## 🏗️ Architecture

```
nexcomm/
├── apps/
│   ├── web/          # Next.js PWA (User app)
│   ├── admin/        # Next.js Admin dashboard
│   └── mobile/       # React Native app
├── packages/
│   ├── server/       # Node.js API + WebSocket
│   ├── database/     # Prisma ORM + schemas
│   └── shared/       # Shared types & utilities
├── docker-compose.yml
├── turbo.json
└── TASKS.md
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Web | Next.js 14 + TypeScript + TailwindCSS |
| Mobile | React Native (Expo) |
| Backend | Node.js + Express + Socket.IO |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis |
| Video | LiveKit SFU + WebRTC |
| Storage | AWS S3 |
| Maps | Mapbox GL |

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- pnpm or npm

### 1. Clone & Install
```bash
cd /workspace
npm install
```

### 2. Start Infrastructure
```bash
docker-compose up -d postgres redis
```

### 3. Setup Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Initialize Database
```bash
cd packages/database
npm run migrate
npm run generate
```

### 5. Run Development
```bash
cd /workspace
npm run dev
```

## 📋 Project Status

### Phase 1: MVP Foundation (In Progress)
- [x] Project structure & monorepo setup
- [x] Database schema design
- [x] Authentication services
- [x] User management services
- [x] Group management services
- [x] Message services
- [ ] Server API implementation
- [ ] Web frontend
- [ ] Mobile apps

See [TASKS.md](./TASKS.md) for full roadmap.

## 🔐 Security

- End-to-end encryption for DMs (Signal Protocol)
- DTLS-SRTP for WebRTC media
- JWT + Refresh tokens for auth
- Role-based access control (RBAC)
- Rate limiting & input sanitization

## 📄 License

ISC - Private Platform

---

*Built according to PRD v1.0*
