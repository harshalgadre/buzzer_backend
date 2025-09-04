# API Gateway Service

## Overview
This service acts as the API Gateway for the Interview Platform microservices architecture. It routes requests to the appropriate microservices and provides a single entry point for the client application.

## Services
- Auth Service (`/auth`) - Authentication and user management
- Mock Interview Service (`/mock-interview`) - Handles mock interview sessions
- Room Service (`/room`) - Manages interview rooms and real-time communication
- Live Interview Service (`/live-interview`) - Handles live interview sessions

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file with the following variables:
   ```env
   GATEWAY_PORT=5000
   AUTH_SERVICE_PORT=6001
   MOCK_INTERVIEW_SERVICE_PORT=6002
   ROOM_INTERVIEW_SERVICE_PORT=6003
   LIVE_INTERVIEW_SERVICE_PORT=6004
   CLIENT_URL=http://localhost:4001
   ```

## Running the Service

### Development Mode
```bash
# Start gateway service only
npm run dev

# Start all services including gateway
cd .. && npm run dev
```

### Production Mode
```bash
# Start gateway service only
npm start

# Start all services including gateway
cd .. && npm start
```

## API Routes
- Authentication: `http://localhost:5000/auth`
- Mock Interviews: `http://localhost:5000/mock-interview`
- Interview Rooms: `http://localhost:5000/room`
- Live Interviews: `http://localhost:5000/live-interview`

## Health Check
- Gateway health: `http://localhost:5000/health`