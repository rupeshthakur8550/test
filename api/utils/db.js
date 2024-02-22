import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import sqlite3, {OPEN_READWRITE} from 'sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

const DB_FILE_PATH = 'database.db';
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

// Create SQLite database and upload to S3
async function createDatabase() {
  return new Promise(async (resolve, reject) => {
    const db = open({
      filename: DB_FILE_PATH,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
    });

    try {
      // Execute SQL queries to create tables
      await db.exec(sql_create_technician);
      await db.exec(sql_create_address);

      console.log("Tables created successfully.");

      // Close the database connection
      db.close();

      // Upload database file to S3
      const fileStream = fs.createReadStream(DB_FILE_PATH);
      const uploadParams = {
        Bucket: process.env.CYCLIC_BUCKET_NAME,
        Key: DB_FILE_PATH,
        Body: fileStream
      };
      s3.send(new PutObjectCommand(uploadParams)).then(data => {
        console.log("Database file uploaded to S3 successfully.");
        resolve();
      }).catch(err => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Get database file from S3
async function getDatabaseFromS3() {
  return new Promise((resolve, reject) => {
    const downloadParams = {
      Bucket: process.env.CYCLIC_BUCKET_NAME,
      Key: DB_FILE_PATH
    };
    s3.send(new GetObjectCommand(downloadParams)).then(data => {
      const fileStream = fs.createWriteStream(DB_FILE_PATH);
      data.Body.pipe(fileStream);
      fileStream.on('close', () => {
        console.log("Database file downloaded from S3.");
        resolve();
      });
    }).catch(err => {
      reject(err);
    });
  });
}

// Connect to SQLite database
async function connectToDatabase() {
  return open({
    filename: DB_FILE_PATH,
    driver: sqlite3.Database,
    mode: sqlite3.OPEN_READWRITE
  });
}

// Update the modified database file on S3
async function updateDatabaseOnS3() {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(DB_FILE_PATH);
    const uploadParams = {
      Bucket: process.env.CYCLIC_BUCKET_NAME,
      Key: DB_FILE_PATH,
      Body: fileStream
    };
    s3.send(new PutObjectCommand(uploadParams)).then(data => {
      console.log("Updated database file uploaded to S3 successfully.");
      resolve();
    }).catch(err => {
      reject(err);
    });
  });
}

export { connectToDatabase, createDatabase, getDatabaseFromS3, updateDatabaseOnS3 };
