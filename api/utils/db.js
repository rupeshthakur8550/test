import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import sqlite3 from 'sqlite3';
import { Readable } from 'stream';
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

const uploadDatabaseToS3 = async (db) => {
  try {
    // Write the database file to S3
    const dbStream = db.backup();

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: "database.db",
      Body: dbStream
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

    // Create a readable stream from the S3 response body
    const dbStream = Readable.from(Body);

    // Connect to an in-memory SQLite database
    const db = new sqlite3.Database(":memory:");
    
    // Restore the database from the stream
    await new Promise((resolve, reject) => {
      dbStream.pipe(db.backup()).on('finish', resolve).on('error', reject);
    });

    console.log("Database downloaded from S3 successfully.");

    return db;
  } catch (error) {
    console.error("Error downloading database from S3:", error);
    throw error;
  }
};

const initializeDatabase = async () => {
  try {
    // Initialize the database by downloading from S3
    const db = await downloadDatabaseFromS3();

    // Create tables if they don't exist
    await createTables(db);

    console.log('Connected to the database.');

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
