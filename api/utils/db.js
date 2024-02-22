import sqlite3 from 'sqlite3';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Open the SQLite database file in read-write mode
const db = new sqlite3.Database('database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
  createTables();
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

const bucketName = process.env.CYCLIC_BUCKET_NAME;

const createTables = () => {
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

  db.exec(sql_create_technician, err => {
    if (err) {
      console.error(err.message);
    }
  });

  db.exec(sql_create_address, err => {
    if (err) {
      console.error(err.message);
    }
  });

  // Store the database file in AWS S3 bucket
  const fileContent = fs.readFileSync('database.db');
  const uploadParams = {
    Bucket: bucketName,
    Key: 'database.db',
    Body: Readable.from(fileContent)
  };

  s3Client.send(new PutObjectCommand(uploadParams)).then(
    () => {
      console.log('Database file uploaded to S3 successfully.');
    },
    err => {
      console.error('Error uploading to S3:', err);
    }
  );
};

export default db;
