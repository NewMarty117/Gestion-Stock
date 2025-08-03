const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const stockFilePath = path.join(__dirname, 'stock.json');

app.use(express.static(path.join(__dirname, 'public')));

const readStock = () => {
  const rawData = fs.readFileSync(stockFilePath);
  return JSON.parse(rawData);
};

const writeStock = (data) => {
  fs.writeFileSync(stockFilePath, JSON.stringify(data, null, 2));
};

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit('stock update', readStock());

  socket.on('update stock', ({ id, change }) => {
    const stock = readStock();
    const product = stock.find(p => p.id === id);
    if (product) {
      product.stock += change;
      writeStock(stock);
      io.emit('stock update', stock);
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
