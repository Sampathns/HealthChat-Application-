# 🏥 HealthChat — AI-Powered Healthcare Management System

A full-stack, production-grade healthcare platform with real-time chat, AI health assistant (Google Gemini), appointment management, and multi-role dashboards.

---

## 🚀 Tech Stack

| Layer       | Technology                         |
| ----------- | ---------------------------------- |
| Frontend    | React.js, Tailwind CSS, Socket.io  |
| Backend     | Node.js, Express.js, Socket.io     |
| Database    | MongoDB + Mongoose                 |
| AI Service  | Python FastAPI + **Google Gemini** |
| Auth        | JWT + bcrypt                       |
| File Upload | Cloudinary                         |
| Realtime    | Socket.io                          |

---

## 📁 Project Structure

```
healthchat/
├── client/        → React frontend
├── server/        → Node.js + Express backend
├── ai-service/    → Python FastAPI + Google Gemini
└── docker-compose.yml
```

---

## ⚙️ Environment Variables

### `server/.env`

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/healthchat
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
AI_SERVICE_URL=http://localhost:8000
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=your_stripe_secret_key_here
```

### `client/.env`

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### `ai-service/.env`

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8000
```

> 🔑 Get your **free** Gemini API key at: https://aistudio.google.com/app/apikey

---

## 🛠️ Setup & Run

### 1. Install dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd client && npm install

# AI Service
cd ai-service && pip install -r requirements.txt
```

### 2. Create `.env` files

Copy each `.env.example` → `.env` and fill in your values.

### 3. Seed the database (optional but recommended)

```bash
cd server && npm run seed
```

### 4. Start all 3 services (3 terminals)

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm start

# Terminal 3 — AI Service
cd ai-service && uvicorn main:app --reload --port 8000
```

---

## 🌐 URLs

| Service    | URL                          |
| ---------- | ---------------------------- |
| Frontend   | http://localhost:3000        |
| Backend    | http://localhost:5000/health |
| AI Service | http://localhost:8000        |
| AI Docs    | http://localhost:8000/docs   |

---

## 👤 Demo Accounts (after seed)

| Role    | Email                  | Password    |
| ------- | ---------------------- | ----------- |
| Patient | patient@healthchat.com | Patient@123 |
| Doctor  | doctor1@healthchat.com | Doctor@123  |
| Admin   | admin@healthchat.com   | Admin@123   |

---

## 🐳 Docker

```bash
docker-compose up --build
```

---

## ✨ Features

- 💳 Payments: Visa / Mastercard support via Stripe (backend endpoint added).

- 🔐 JWT Authentication with roles (Patient / Doctor / Admin)
- 💬 Real-time chat with Socket.io + typing indicators
- 🤖 AI Health Assistant powered by Google Gemini Pro
- 📅 Appointment booking + status management
- 💊 Digital prescriptions
- 📋 Medical reports upload (Cloudinary)
- 🔔 Real-time notifications
- 📊 Admin analytics dashboard
- 🌙 Dark / Light mode
- 📱 Fully responsive mobile design
"# HealthChat-Ai-ChatApplication" 
"# HealthChat-Ai-ChatApplication" 
