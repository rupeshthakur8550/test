import sqlite3 from 'sqlite3';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const db = new sqlite3.Database('database.db', err => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
  createTables();
});

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN
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
  const params = {
    Bucket: bucketName,
    Key: 'database.db',
    Body: fileContent
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error uploading to S3:', err);
    } else {
      console.log('Database file uploaded to S3 successfully:', data.Location);
    }
  });
};

export default db;
