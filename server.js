import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Firebase Setup ---
// Important: The service account key is stored in Render's environment variables.
// We parse it from a string to a JSON object.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gestion-stock-app-9ab2d-default-rtdb.europe-west1.firebasedatabase.app/"
});

// Get a reference to the database service
const db = admin.database();
const stockRef = db.ref('stock');

// --- Express & Socket.IO Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));

// --- Real-time Data Sync ---
let currentStock = [];

// Listen for changes in the database and broadcast them
stockRef.on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    currentStock = Array.isArray(data) ? data : Object.values(data);
    io.emit('stock update', currentStock);
    console.log('Stock data updated from Firebase and broadcasted.');
  }
}, (errorObject) => {
  console.log('The read failed: ' + errorObject.name);
});


io.on('connection', (socket) => {
  console.log('a user connected');
  // Send the current stock to the newly connected client
  socket.emit('stock update', currentStock);

  socket.on('update stock', ({ id, change }) => {
    // Find the index of the product to update
    const productIndex = currentStock.findIndex(p => p.id === id);
    if (productIndex !== -1) {
      const productRef = stockRef.child(productIndex.toString());
      // Use a transaction to safely update the stock
      productRef.child('stock').transaction((current_stock) => {
        return (current_stock || 0) + change;
      });
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
