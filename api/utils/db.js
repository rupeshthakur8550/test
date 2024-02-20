import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const bucketName = process.env.CYCLIC_BUCKET_NAME;
const databaseFileName = 'database.db';

// Check if environment variables are set
if (!bucketName || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_SESSION_TOKEN || !process.env.AWS_REGION) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

// Initialize AWS SDK v3 S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

// Function to upload the SQLite database file to AWS S3
export const uploadDatabaseToS3 = async (dbBuffer) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: databaseFileName,
      Body: dbBuffer,
    };
    await s3Client.send(new PutObjectCommand(params));
    console.log(`Database file ${databaseFileName} uploaded successfully to S3 bucket.`);
  } catch (err) {
    console.error('Error uploading file to S3:', err);
    throw err;
  }
};

// Connect to the SQLite database directly from AWS S3
export const connectToDatabase = async () => {
  try {
    // Check if the file exists in S3, if not, upload it
    const params = {
      Bucket: bucketName,
      Key: databaseFileName,
    };
    let dbBuffer;
    try {
      const data = await s3Client.send(new GetObjectCommand(params));
      dbBuffer = data.Body;
    } catch (err) {
      console.log(`Database file ${databaseFileName} does not exist in S3 bucket. Uploading it...`);
      // Assuming you have a local 'database.db' file, you can read it and upload it
      dbBuffer = fs.readFileSync('database.db');
      await uploadDatabaseToS3(dbBuffer);
    }
    
    // Write the downloaded database buffer to a temporary file
    const tempDbFileName = '/tmp/temp-database.db'; // Update with your desired temporary file path
    fs.writeFileSync(tempDbFileName, dbBuffer);

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
  } catch (err) {
    console.error('Error connecting to database:', err);
    throw err;
  }
};
