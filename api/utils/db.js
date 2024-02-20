import sqlite3 from "sqlite3";
import dotenv from 'dotenv';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import S3FS from 's3fs';
import fs from 'fs';

dotenv.config();

const bucketName = "cyclic-faithful-culottes-bull-ap-south-1";
const databaseFileName = 'database.db';

// Initialize AWS SDK v3 S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

// Function to download the SQLite database file from AWS S3 using s3fs
const downloadDatabaseFromS3 = async (filePath) => {
  try {
    const s3fs = new S3FS(bucketName, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const readStream = s3fs.createReadStream(databaseFileName);
    const writeStream = fs.createWriteStream(filePath);

    await new Promise((resolve, reject) => {
      readStream.pipe(writeStream);
      readStream.on('error', reject);
      writeStream.on('finish', resolve);
    });

    console.log(`Database file ${databaseFileName} downloaded successfully from S3.`);
  } catch (err) {
    console.error('Error downloading file from S3:', err);
    throw err;
  }
};

// Function to upload the SQLite database file to AWS S3 using s3fs
const uploadDatabaseToS3 = async (filePath) => {
  try {
    const s3fs = new S3FS(bucketName, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const readStream = fs.createReadStream(filePath);
    const writeStream = s3fs.createWriteStream(databaseFileName);

    await new Promise((resolve, reject) => {
      readStream.pipe(writeStream);
      readStream.on('error', reject);
      writeStream.on('finish', resolve);
    });

    console.log(`Database file ${databaseFileName} uploaded successfully to S3.`);
  } catch (err) {
    console.error('Error uploading file to S3:', err);
    throw err;
  }
};

// Connect to the SQLite database
export const connectToDatabase = async () => {
  const tempDbFileName = 'temp-database.db'; // Temporary file path

  // Download the database file from S3
  await downloadDatabaseFromS3(tempDbFileName);

  // Connect to the SQLite database
  const db = new sqlite3.Database(tempDbFileName, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      throw err;
    } else {
      console.log('Connected to the database');
    }
  });

  return db;
};

// Call the function to connect to the database
connectToDatabase(); // This will connect to the database on startup
