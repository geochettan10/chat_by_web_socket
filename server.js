const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

let clients = new Map();
let clientIdCounter = 0;

wss.on('connection', (ws) => {
  const clientId = ++clientIdCounter;
  const clientName = `Client ${clientId}`;
  
  clients.set(ws, { id: clientId, name: clientName });
  
  console.log(`${clientName} connected`);
  
  // Send welcome message to the new client
  ws.send(JSON.stringify({
    type: 'system',
    message: `Welcome! You are ${clientName}`,
    timestamp: new Date().toISOString()
  }));
  
  // Broadcast to all other clients that new user joined
  broadcast({
    type: 'system',
    message: `${clientName} joined the chat`,
    timestamp: new Date().toISOString()
  }, ws);
  
  // Send current user count to all clients
  broadcastUserCount();
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const client = clients.get(ws);
      
      if (message.type === 'chat') {
        // Broadcast chat message to all clients
        broadcast({
          type: 'chat',
          sender: client.name,
          message: message.message,
          timestamp: new Date().toISOString()
        });
      } else if (message.type === 'typing') {
        // Broadcast typing indicator to all other clients
        broadcast({
          type: 'typing',
          sender: client.name,
          isTyping: message.isTyping
        }, ws);
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });
  
  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      console.log(`${client.name} disconnected`);
      
      // Notify all clients about disconnection
      broadcast({
        type: 'system',
        message: `${client.name} disconnected`,
        timestamp: new Date().toISOString()
      });
      
      clients.delete(ws);
      broadcastUserCount();
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcast(data, excludeWs = null) {
  const message = JSON.stringify(data);
  clients.forEach((client, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function broadcastUserCount() {
  const count = clients.size;
  broadcast({
    type: 'userCount',
    count: count
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});