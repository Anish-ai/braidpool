# Braidpool Miner Dashboard

A modern, real-time dashboard for monitoring Braidpool mining operations and visualizing the DAG structure.

## Features

- Real-time miner statistics including hashrate, shares, and efficiency
- Interactive DAG (Directed Acyclic Graph) visualization
- Modern UI with glassomorphic design
- Responsive layout for desktop and mobile
- WebSocket real-time updates

## Installation

### Prerequisites

- Node.js 16+ and npm
- WSL (Windows Subsystem for Linux) if running on Windows

### WSL-specific Setup (Important for Windows Users)

If you're using Windows with WSL, follow these steps first:

1. Open a WSL terminal (Ubuntu or other distro)
2. Navigate to your project directory using Linux paths:
   ```bash
   cd ~/braidpool
   ```

3. Install dependencies directly in the WSL environment, not through PowerShell

### Backend Setup

```bash
# From the WSL terminal
cd ~/braidpool/miner-dashboard/backend

# Install dependencies
npm install express cors socket.io
```

### Frontend Setup

```bash
# From the WSL terminal
cd ~/braidpool/miner-dashboard/frontend

# Install dependencies
npm install
```

## Running the Dashboard

### Start the Backend Server

```bash
# From the WSL terminal in the backend directory
cd ~/braidpool/miner-dashboard/backend
node server.js
```

### Start the Frontend Development Server

```bash
# From the WSL terminal in the frontend directory
cd ~/braidpool/miner-dashboard/frontend
npm run dev
```

### Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

## Common Issues and Solutions

### Colors and Styling Not Showing

If your dashboard isn't displaying colors and styles correctly:

1. Make sure TailwindCSS is properly installed and configured:
   ```bash
   cd ~/braidpool/miner-dashboard/frontend
   npm install tailwindcss@latest autoprefixer@latest postcss@latest
   ```

2. Verify that the layout.tsx file is importing globals.css:
   ```tsx
   import "./globals.css";
   ```

3. Check that you're running the application directly in WSL, not through PowerShell

### "node not found" Errors in D3 Visualization

These errors occur when D3 is trying to process links that reference non-existent nodes. We've implemented validation to:
- Filter out links with missing source or target nodes
- Convert string IDs to actual node objects

### Connection Issues

If you're having trouble connecting to the backend:
1. Make sure the backend server is running on port 5000
2. Check that your frontend is configured to connect to localhost:5000
3. Verify there are no firewall issues blocking the WebSocket connection

## Development

The dashboard uses:
- Next.js for the frontend framework
- D3.js for DAG visualization
- TailwindCSS for styling
- Express and Socket.io for the backend API and real-time updates 