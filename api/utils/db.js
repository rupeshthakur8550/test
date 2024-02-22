import sqlite3 from "sqlite3";
import AWS from "aws-sdk";
import fs from "fs";
import s3fs from "s3fs";
import dotenv from 'dotenv';

dotenv.config();

// Set AWS credentials
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
});

// Initialize AWS S3
const s3 = new AWS.S3();

// Initialize s3fs with AWS S3
const s3fsImpl = new s3fs(process.env.CYCLIC_BUCKET_NAME, {
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN
});

// Function to upload the SQLite database file to AWS S3
const uploadDatabaseToS3 = async () => {
  try {
    // Upload the database file to S3
    await s3fsImpl.writeFile('database.db', fs.createReadStream("database.db"));
    console.log("Database uploaded to S3 successfully.");
  } catch (error) {
    console.error("Error uploading database to S3:", error);
  }
};

// Function to download the SQLite database file from AWS S3
const downloadDatabaseFromS3 = async () => {
  try {
    // Download the database file from S3
    const data = await s3fsImpl.readFile('database.db');
    fs.writeFileSync("database.db", data);
    console.log("Database downloaded from S3 successfully.");
  } catch (error) {
    console.error("Error downloading database from S3:", error);
  }
};

const db = new sqlite3.Database('database.db', async (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the database.');
    await createTables(); 
  }
});

const createTables = async () => {
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
  }
};

// Export the database instance and functions
export { db, uploadDatabaseToS3, downloadDatabaseFromS3 };
