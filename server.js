import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Firebase Setup ---
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable not set.');
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://gestion-stock-app-9ab2d-default-rtdb.europe-west1.firebasedatabase.app/"
  });

  console.log('Firebase Admin SDK initialized successfully.');

} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error);
  process.exit(1); // Exit the process with an error code
}


// Get a reference to the database service
const db = admin.database();
const stockRef = db.ref('stock');

// --- Express & Socket.IO Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));

"""// --- Real-time Data Sync ---
let currentStock = [];

// Helper to process data from Firebase
const processFirebaseData = (data) => {
  if (!data) return [];
  // If it's an object, map it to an array, preserving the keys as 'id'
  if (!Array.isArray(data)) {
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
  }
  // If it's an array (from initial seeding or older structure), filter out null values
  return data.filter(p => p);
};

// Listen for changes in the database and broadcast them
stockRef.on('value', (snapshot) => {
  const data = snapshot.val();
  currentStock = processFirebaseData(data);
  io.emit('stock update', currentStock);
  console.log('Stock data updated from Firebase and broadcasted.');
}, (errorObject) => {
  console.log('The read failed: ' + errorObject.name);
});


io.on('connection', (socket) => {
  console.log('a user connected');
  // Send the current stock to the newly connected client
  socket.emit('stock update', currentStock);

  socket.on('update stock', ({ id, change }) => {
    // The product ID is the key in the database
    const productRef = stockRef.child(id);
    if (productRef) {
      // Use a transaction to safely update the stock
      productRef.child('stock').transaction((current_stock) => {
        const newStock = (current_stock || 0) + change;
        return newStock < 0 ? 0 : newStock; // Prevent negative stock
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});""

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
