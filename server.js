require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // 0.0.0.0 lets your phone (same Wi-Fi) reach the server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CIVIS API running on port ${PORT}`);
  });
});
