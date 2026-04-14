# 🎮 Guessing Game

A real-time multiplayer guessing game built with React, Socket.IO, and Node.js. Players join a room, a Game Master sets a question, and everyone races to guess the correct answer before time runs out!

## 🚀 Live Demo

> Coming soon

## ✨ Features

- **Real-time multiplayer** — Join rooms and play with friends instantly via WebSocket
- **Game Master rotation** — The GM role rotates after each round
- **Timed rounds** — 60-second countdown adds pressure
- **Score tracking** — Points awarded for correct guesses
- **Attempt limits** — Each player gets 3 guesses per round
- **Glassmorphism UI** — Modern, dark-themed design with smooth animations

## 🛠️ Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Frontend | React, TypeScript, Vite     |
| Backend  | Node.js, Express            |
| Realtime | Socket.IO                   |
| Styling  | Vanilla CSS (Glassmorphism) |

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/unchong-akpan/Game.git
cd Game

# Install all dependencies (root, server, and client)
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### Running the App

```bash
# Start both server and client with one command
npm run dev
```

- **Client:** http://localhost:5173
- **Server:** http://localhost:4000

## 🎯 How to Play

1. Open the app and enter a **Room ID** and your **Name**
2. Share the Room ID with friends (minimum 3 players needed)
3. The **Game Master** sets a question and answer, then starts the game
4. Players type their guesses — you get **3 attempts** per round
5. First correct guess wins! The GM role rotates to the next player

## 📁 Project Structure

```
Game/
├── client/          # React frontend (Vite + TypeScript)
│   └── src/
│       ├── App.tsx      # Main game component
│       └── index.css    # Styles
├── server/          # Node.js backend
│   └── index.js         # Express + Socket.IO server
├── package.json     # Root scripts (runs both client & server)
└── README.md
```

## 📜 License

MIT

## 👤 Author

**Unchong Akpan** — [GitHub](https://github.com/unchong-akpan)
