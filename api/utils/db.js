import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import sqlite3 from 'sqlite3';
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

// Modified open function to properly use sqlite3
function openDatabase() {
  return new sqlite3.Database(DB_FILE_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
}

// Create SQLite database and upload to S3
async function createDatabase() {
  return new Promise((resolve, reject) => {
    const db = openDatabase();

    db.exec(sql_create_technician);
    db.exec(sql_create_address);

    console.log("Tables created successfully.");

    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        const fileStream = fs.createReadStream(DB_FILE_PATH);
        const uploadParams = {
          Bucket: process.env.CYCLIC_BUCKET_NAME,
          Key: DB_FILE_PATH,
          Body: fileStream
        };

        s3.send(new PutObjectCommand(uploadParams))
          .then(() => {
            console.log("Database file uploaded to S3 successfully.");
            resolve();
          })
          .catch(reject);
      }
    });
  });
}

// Get database file from S3
async function getDatabaseFromS3() {
  const downloadParams = {
    Bucket: process.env.CYCLIC_BUCKET_NAME,
    Key: DB_FILE_PATH
  };

  const data = await s3.send(new GetObjectCommand(downloadParams));
  const fileStream = fs.createWriteStream(DB_FILE_PATH);
  data.Body.pipe(fileStream);

  return new Promise((resolve, reject) => {
    fileStream.on('close', () => {
      console.log("Database file downloaded from S3.");
      resolve();
    });
    fileStream.on('error', reject);
  });
}

// Connect to SQLite database
async function connectToDatabase() {
  return openDatabase();
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

    s3.send(new PutObjectCommand(uploadParams))
      .then(() => {
        console.log("Updated database file uploaded to S3 successfully.");
        resolve();
      })
      .catch(reject);
  });
}

// Run the functions sequentially
async function main() {
  try {
    await createDatabase();
  } catch (error) {
    console.error("Error:", error);
  }
}

main();

export { connectToDatabase, getDatabaseFromS3, updateDatabaseOnS3 };
