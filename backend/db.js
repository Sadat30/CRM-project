const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root',
  database: process.env.DB_NAME || 'simplecrm',
  socketPath: process.env.DB_SOCKET || null, // Set to null to force TCP/IP connection
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Add timeouts to prevent hanging
  connectTimeout: 10000, // 10 seconds
  acquireTimeout: 10000, // 10 seconds
  timeout: 10000, // 10 seconds query timeout
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection on startup
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Check DB_HOST, DB_USER, DB_PASS, DB_NAME in .env');
    console.error('   Make sure MySQL is running and accessible');
  });

module.exports = pool;
