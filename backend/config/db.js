const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

const sslConfig =
  process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } :
  process.env.DB_SSL === 'relaxed' ? { rejectUnauthorized: false } :
  undefined;

async function initializeDatabase() {
  const dbName = process.env.DB_NAME || 'bookmyslot';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    ssl: sslConfig
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.end();

  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    ssl: sslConfig
  });

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user', 'organizer') DEFAULT 'user',
      balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createEventsTable = `
    CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      description TEXT,
      venue VARCHAR(150) NOT NULL,
      event_date DATE NOT NULL,
      event_time TIME NOT NULL,
      price DECIMAL(8,2) NOT NULL,
      total_capacity INT NOT NULL,
      available_capacity INT NOT NULL,
      organizer_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  

  const createBookingsTable = `
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      event_id INT NOT NULL,
      quantity INT NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_status ENUM('Pending', 'Paid', 'Refunded') DEFAULT 'Pending',
      booking_status ENUM('Confirmed', 'Cancelled') DEFAULT 'Confirmed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `;

  const createWalletTransactionsTable = `
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('Deposit', 'Withdraw', 'Payment', 'Refund', 'Earning', 'Payout') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      balance_after DECIMAL(10,2) NOT NULL,
      related_booking_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (related_booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );
  `;

  await pool.query(createUsersTable);

  
  try {
    await pool.query('ALTER TABLE users ADD COLUMN balance DECIMAL(10,2) NOT NULL DEFAULT 0.00');
    console.log('Balance column added to users table successfully');
  } catch (err) {
    if (err.errno !== 1060 && err.code !== 'ER_DUP_FIELDNAME') {
      console.error('Failed to alter users table:', err);
    }
  }

  await pool.query(createEventsTable);
  await pool.query(createBookingsTable);
  await pool.query(createWalletTransactionsTable);

  try {
    await pool.query("ALTER TABLE wallet_transactions MODIFY COLUMN type ENUM('Deposit', 'Withdraw', 'Payment', 'Refund', 'Earning', 'Payout') NOT NULL");
  } catch (err) {
    console.error('Failed to alter wallet_transactions type enum:', err);
  }

  try {
    await pool.query("ALTER TABLE bookings MODIFY COLUMN payment_status ENUM('Pending', 'Paid', 'Refunded') DEFAULT 'Pending'");
  } catch (err) {
    console.error('Failed to alter bookings payment_status enum:', err);
  }

  console.log('MySQL Database and tables initialized successfully');
}

module.exports = {
  getPool: () => {
    if (!pool) {
      throw new Error('Database pool not initialized. Call initializeDatabase first.');
    }
    return pool;
  },
  initializeDatabase
};