import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'

// Set up Express and Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure lowdb
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, 'stock.json')
const adapter = new JSONFile(file)
const db = new Low(adapter)

// Serve static files from 'public' directory
app.use(express.static(join(__dirname, 'public')));

// Initialize the database
await db.read()
db.data = db.data || [] // Ensure db.data is an array
await db.write()


io.on('connection', async (socket) => {
  console.log('a user connected');
  
  // Send current stock to the new client
  socket.emit('stock update', db.data);

  // Handle stock updates from clients
  socket.on('update stock', async ({ id, change }) => {
    await db.read();
    const product = db.data.find(p => p.id === id);
    if (product) {
      product.stock += change;
      await db.write();
      // Broadcast the update to all clients
      io.emit('stock update', db.data);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
