# Ball Hub — Sports Team Management Web App

A full-stack monorepo application for managing sports teams, built with Node.js/Express (backend) and React/Vite (frontend).

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB via Mongoose
- **Real-time**: Socket.IO
- **Validation**: Zod
- **Auth**: JSON Web Tokens + bcrypt

### Frontend
- **Build Tool**: Vite
- **UI Library**: React 18 with TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form
- **Charts**: Chart.js + react-chartjs-2
- **Calendar**: FullCalendar

## Project Structure

```
ball-hub/
├── backend/          # Express.js API (Modular Monolith)
│   └── src/
│       ├── config/
│       ├── middlewares/
│       ├── modules/   # Feature modules (auth, teams, events, …)
│       ├── socket/
│       └── utils/
├── frontend/         # React + Vite app (Feature-based)
│   └── src/
│       ├── api/
│       ├── components/
│       ├── features/  # Feature slices (auth, teams, calendar, …)
│       ├── layouts/
│       ├── pages/
│       ├── routes/
│       ├── store/
│       └── utils/
├── package.json      # Root workspace config
└── README.md
```

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)

### Installation

```bash
npm install
```

### Development

```bash
# Run both frontend and backend concurrently
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend
```

### Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory and fill in your values:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/ballhub
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
