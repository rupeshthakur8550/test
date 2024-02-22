import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, readFile } from 'fs/promises';
import sqlite3 from 'sqlite3';
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

const uploadDatabaseToS3 = async () => {
  try {
    // Write the database file to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: "database.db",
      Body: await readFile("database.db")
    }));
    
    console.log("Database uploaded to S3 successfully.");
  } catch (error) {
    console.error("Error uploading database to S3:", error);
    throw error;
  }
};

const downloadDatabaseFromS3 = async () => {
  try {
    // Download the database file from S3
    const { Body } = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: "database.db"
    }));

    // Write the downloaded database file locally
    await writeFile("database.db", Body);

    console.log("Database downloaded from S3 successfully.");
  } catch (error) {
    console.error("Error downloading database from S3:", error);
    throw error;
  }
};

const fileExists = async (filePath) => {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    } else {
      throw error;
    }
  }
};

const initializeDatabase = async () => {
  try {
    // Check if the database file exists locally
    const localFileExists = await fileExists("database.db");

    if (!localFileExists) {
      console.log("Database file not found locally.");
      await uploadDatabaseToS3();
    } else {
      console.log("Database file found locally.");
    }

    // Download the database file from S3
    await downloadDatabaseFromS3();

    // Connect to the SQLite database
    const db = new sqlite3.Database("database.db");

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
