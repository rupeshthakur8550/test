import sqlite3 from "sqlite3";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import dotenv from 'dotenv';

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

// Function to download the SQLite database file from AWS S3
const downloadDatabaseFromS3 = async (filePath) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: databaseFileName,
    };
    const response = await s3Client.send(new GetObjectCommand(params));
    fs.writeFileSync(filePath, response.Body);
    console.log(`Database file ${databaseFileName} downloaded successfully from S3.`);
  } catch (err) {
    console.error('Error downloading file from S3:', err);
    throw err;
  }
};

// Connect to the SQLite database
export const connectToDatabase = async () => {
  const tempDbFileName = 'temp-database.db'; // Temporary file path
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
