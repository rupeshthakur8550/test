import AWS from 'aws-sdk';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const bucketName = process.env.BUCKET;
const databaseFileName = 'database.db';

// Check if environment variables are set
if (!bucketName || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_SESSION_TOKEN || !process.env.AWS_REGION) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

// Initialize AWS SDK with credentials
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN
});

// Function to download the SQLite database file from AWS S3
export const downloadDatabaseFromS3 = (callback) => {
  const params = {
    Bucket: bucketName,
    Key: databaseFileName,
  };

  s3.getObject(params, (err, data) => {
    if (err) {
      console.error('Error downloading file from S3:', err);
      callback(err, null);
    } else {
      callback(null, data.Body);
    }
  });
};

// Function to upload the SQLite database file to AWS S3
export const uploadDatabaseToS3 = (dbBuffer, callback) => {
  const params = {
    Bucket: bucketName,
    Key: databaseFileName,
    Body: dbBuffer,
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error uploading file to S3:', err);
      callback(err);
    } else {
      callback(null);
    }
  });
};

// Connect to the SQLite database
export const connectToDatabase = (callback) => {
  downloadDatabaseFromS3((err, dbBuffer) => {
    if (err) {
      console.error('Error connecting to database:', err);
      callback(err, null);
    } else {
      // Write the downloaded database buffer to a temporary file
      const tempDbFileName = '/tmp/temp-database.db'; // Update with your desired temporary file path
      require('fs').writeFileSync(tempDbFileName, dbBuffer);

      // Connect to the SQLite database
      const db = new sqlite3.Database(tempDbFileName, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
          console.error('Error connecting to database:', err);
          callback(err, null);
        } else {
          console.log('Connected to the database');
          callback(null, db);
        }
      });
    }
  });
};
