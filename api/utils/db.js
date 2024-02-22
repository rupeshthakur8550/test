import sqlite3 from "sqlite3";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import s3fs from "s3fs";
import dotenv from 'dotenv';

dotenv.config();

// Initialize AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

// Bucket name
const bucketName = process.env.CYCLIC_BUCKET_NAME;

// Database file name
const databaseFileName = "database.db";

// Initialize s3fs with AWS S3
const s3fsImpl = new s3fs(bucketName, {
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN
});

// Function to upload the SQLite database file to AWS S3
const uploadDatabaseToS3 = async () => {
  try {
    // Upload the database file to S3
    await s3fsImpl.writeFile(databaseFileName, databaseFileName);

    console.log("Database uploaded to S3 successfully.");
  } catch (error) {
    console.error("Error uploading database to S3:", error);
  }
};

// Function to download the SQLite database file from AWS S3
const downloadDatabaseFromS3 = async () => {
  try {
    // Download the database file from S3
    const data = await s3fsImpl.readFile(databaseFileName);

    // Write the downloaded database file locally
    await writeFile(databaseFileName, data);

    console.log("Database downloaded from S3 successfully.");
  } catch (error) {
    console.error("Error downloading database from S3:", error);
  }
};

// Function to check if a file exists
const fileExists = async (filePath) => {
  try {
    await s3fsImpl.stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "NotFound") {
      return false;
    } else {
      throw error;
    }
  }
};

// Function to initialize the SQLite database
const initializeDatabase = async () => {
  try {
    // Check if the database file exists locally
    const localFileExists = await fileExists(databaseFileName);

    // If the database file doesn't exist locally, download it from S3
    if (!localFileExists) {
      await downloadDatabaseFromS3();
    }

    // Connect to the SQLite database
    const db = new sqlite3.Database(databaseFileName);

    console.log('Connected to the database.');
    await createTables(db);
    
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Function to create tables in the SQLite database
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

  try {
    await Promise.all([
      new Promise((resolve, reject) => {
        db.exec(sql_create_technician, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
      new Promise((resolve, reject) => {
        db.exec(sql_create_address, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
    ]);
    console.log('Tables created successfully.');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

// Export functions
export { initializeDatabase, uploadDatabaseToS3, downloadDatabaseFromS3 };
