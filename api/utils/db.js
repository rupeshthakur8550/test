import sqlite3 from "sqlite3";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile } from 'fs/promises';
import s3fs from "s3fs";
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

const bucketName = process.env.CYCLIC_BUCKET_NAME;
const databaseFileName = "database.db";

const s3fsImpl = new s3fs(bucketName, {
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN
});

const uploadDatabaseToS3 = async () => {
  try {
    await s3fsImpl.writeFile(databaseFileName, ""); // Create an empty file to upload
    console.log("Database uploaded to S3 successfully.");
  } catch (error) {
    console.error("Error uploading database to S3:", error);
    throw error; // Rethrow the error to indicate failure
  }
};

const downloadDatabaseFromS3 = async () => {
  try {
    const data = await s3fsImpl.readFile(databaseFileName);
    await writeFile(databaseFileName, data);
    console.log("Database downloaded from S3 successfully.");
  } catch (error) {
    console.error("Error downloading database from S3:", error);
    throw error; // Rethrow the error to indicate failure
  }
};

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

const initializeDatabase = async () => {
  try {
    const s3FileExists = await fileExists(databaseFileName);
    if (!s3FileExists) {
      console.log("Database file not found in S3, creating a new one.");
      const db = new sqlite3.Database(databaseFileName);
      await db.close(); // Close the database connection
      await uploadDatabaseToS3();
    }
    await downloadDatabaseFromS3();
    const db = new sqlite3.Database(databaseFileName);
    console.log('Connected to the database.');
    await createTables(db);
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

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

export { initializeDatabase, uploadDatabaseToS3, downloadDatabaseFromS3 };
