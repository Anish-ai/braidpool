const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Function to read JSON files safely
function readJSON(file) {
  try {
    const content = fs.readFileSync(path.join(__dirname, "data", file), "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
    return {};
  }
}

// Function to read test braid data from tests/braids folder
function readTestBraidData(filename) {
  try {
    const testsPath = path.join(__dirname, "../../tests/braids", filename);
    const content = fs.readFileSync(testsPath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading test braid data ${filename}:`, err.message);
    return null;
  }
}

// List all available test braids
function getTestBraids() {
  try {
    const testsPath = path.join(__dirname, "../../tests/braids");
    return fs.readdirSync(testsPath)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file.replace('.json', ''),
        filename: file,
        path: `../../tests/braids/${file}`
      }));
  } catch (err) {
    console.error("Error listing test braids:", err.message);
    return [];
  }
}

// API endpoints
app.get("/api/miner-stats", (req, res) => {
  // Return mock miner stats
  res.json({
    hashrate: 128.5,
    acceptedShares: 456,
    rejectedShares: 12,
    powerUsage: 1200,
    uptime: '16h 23m',
    temperature: 68,
    efficiency: 0.82,
    lastShareFound: new Date().toISOString(),
    beadsMined: 42
  });
});

app.get("/api/config", (req, res) => {
  const config = readJSON("config.json");
  res.json(config);
});

app.get("/api/dag", (req, res) => {
  const dag = readJSON("dag.json");
  res.json(dag);
});

app.get("/api/test-braids", (req, res) => {
  const testBraids = getTestBraids();
  res.json(testBraids);
});

app.get("/api/test-braids/:filename", (req, res) => {
  const filename = req.params.filename;
  const braidData = readTestBraidData(filename);
  if (braidData) {
    res.json(braidData);
  } else {
    res.status(404).json({ error: "Braid file not found" });
  }
});

// Update current DAG with test data
app.post("/api/load-test-braid", (req, res) => {
  const { filename } = req.body;
  
  if (!filename) {
    return res.status(400).json({ error: "Filename is required" });
  }
  
  const braidData = readTestBraidData(filename);
  
  if (!braidData) {
    return res.status(404).json({ error: "Braid data not found" });
  }
  
  // Save to current DAG
  try {
    fs.writeFileSync(
      path.join(__dirname, "data", "dag.json"), 
      JSON.stringify(braidData, null, 2)
    );
    
    // Notify all clients
    io.emit("dag-updated", braidData);
    
    res.json({ success: true, message: "Test braid loaded successfully" });
  } catch (err) {
    console.error("Error saving braid data:", err.message);
    res.status(500).json({ error: "Failed to save braid data" });
  }
});

// Socket.io setup
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  
  // Send updated stats every 5 seconds
  const interval = setInterval(() => {
    const updatedStats = {
      hashrate: 120 + Math.random() * 20,
      acceptedShares: Math.floor(450 + Math.random() * 20),
      rejectedShares: Math.floor(10 + Math.random() * 5),
      powerUsage: Math.floor(1150 + Math.random() * 100),
      uptime: '16h 23m',
      temperature: Math.floor(65 + Math.random() * 8),
      efficiency: 0.75 + Math.random() * 0.15,
      lastShareFound: new Date().toISOString(),
      beadsMined: 42
    };
    
    socket.emit("stats-update", updatedStats);
  }, 5000);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    clearInterval(interval);
  });
});

// Simulate mining activity and updates
let updateInterval;
function startSimulation() {
  if (updateInterval) clearInterval(updateInterval);
  
  updateInterval = setInterval(() => {
    // Update GPU stats
    const gpuStats = readJSON("gpu_stats.json");
    gpuStats.hashrate = Math.round((gpuStats.hashrate + (Math.random() * 10 - 5)) * 10) / 10;
    gpuStats.acceptedShares += Math.floor(Math.random() * 3);
    if (Math.random() > 0.95) gpuStats.rejectedShares += 1;
    gpuStats.temperature = Math.min(85, Math.max(50, gpuStats.temperature + (Math.random() * 4 - 2)));
    
    fs.writeFileSync(
      path.join(__dirname, "data", "gpu_stats.json"), 
      JSON.stringify(gpuStats, null, 2)
    );
    
    io.emit("stats-updated", gpuStats);
  }, 5000);
}

server.listen(PORT, () => {
  console.log(`✅ Miner API running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running`);
  startSimulation();
});
