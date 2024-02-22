import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

// Ensure correct file permissions
const databasePath = 'database.db';
const createWritablePermission = async () => {
  try {
    await fs.promises.access(databasePath, fs.constants.W_OK); // Check write permission
  } catch (err) {
    if (err.code === 'EACCES') {
      console.error('Database file is not writable. Setting write permissions...');
      await fs.promises.chmod(databasePath, 0o664); // Make writable by user and group
    } else {
      console.error(err.message);
      throw err;
    }
  }
};

// Open the SQLite database in read-write mode
const openDatabase = async () => {
  try {
    await createWritablePermission(); // Ensure write permission

    const db = await new Promise((resolve, reject) => {
      const connection = new sqlite3.Database(databasePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    console.log('Connected to the database.');
    return db;
  } catch (err) {
    console.error('Error opening database:', err.message);
    throw err;
  }
};

// Create tables (you can add your table creation logic here)
const createTables = async (db) => {
  const sql_create_technician = `
    CREATE TABLE IF NOT EXISTS technician (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      longitude REAL NOT NULL,
      latitude REAL NOT NULL,
      completion_status INTEGER DEFAULT 0
    )
  `;

  const sql_create_address = `
    CREATE TABLE IF NOT EXISTS address (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      longitude REAL NOT NULL,
      latitude REAL NOT NULL,
      technician_id INTEGER NOT NULL,
      completion_status INTEGER DEFAULT 0,
      FOREIGN KEY (technician_id) REFERENCES technician(id)
    )
  `;

  await db.exec(sql_create_technician, err => {
    if (err) {
      console.error(err.message);
    }
  });

  await db.exec(sql_create_address, err => {
    if (err) {
      console.error(err.message);
    }
  });
};

const getDatabase = async () => {
  let db;
  try {
    db = await openDatabase();
    await createTables(db); // Execute table creation
    // Other initialization if needed
    return db;
  } catch (err) {
    console.error('Error:', err.message);
    if (db) {
      await db.close();
    }
    throw err;
  }
};

export default getDatabase;
