import sqlite3 from "sqlite3";
import S3FS from 's3fs';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const bucketName = process.env.CYCLIC_BUCKET_NAME;
const databaseFileName = 'database.db';

// Initialize s3fs with AWS credentials
const s3fs = new S3FS(bucketName, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Function to upload the SQLite database file to AWS S3
const uploadDatabaseToS3 = async (dbStream) => {
  try {
    const stream = s3fs.createWriteStream(databaseFileName);
    dbStream.pipe(stream);
    console.log(`Database file ${databaseFileName} uploaded successfully to S3 bucket.`);
  } catch (err) {
    console.error('Error uploading file to S3:', err);
    throw err;
  }
};

// Function to download the SQLite database file from AWS S3
const downloadDatabaseFromS3 = async () => {
  try {
    const stream = s3fs.createReadStream(databaseFileName);
    return stream;
  } catch (err) {
    console.error('Error downloading file from S3:', err);
    throw err;
  }
};

// Function to create and store the database file in AWS storage
const createAndStoreDatabase = async () => {
  const db = new sqlite3.Database('database.db');

  // Create tables
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS technician (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        longitude REAL NOT NULL,
        latitude REAL NOT NULL,
        completion_status INTEGER DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS address (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT NOT NULL,
        longitude REAL NOT NULL,
        latitude REAL NOT NULL,
        technician_id INTEGER NOT NULL,
        completion_status INTEGER DEFAULT 0,
        FOREIGN KEY (technician_id) REFERENCES technician(id)
      )
    `);
  });

  // Backup the in-memory database to a stream
  const dbStream = db.backup(Readable.from(''));
  
  // Upload the database file to S3
  await uploadDatabaseToS3(dbStream);
};

// Connect to the SQLite database
const connectToDatabase = async () => {
  try {
    // Download the database file from S3
    const dbBuffer = await downloadDatabaseFromS3();

    // Connect to the SQLite database
    const db = new sqlite3.Database(':memory:');
    db.run(dbBuffer.toString()); // Run the SQL commands to create tables
    console.log('Connected to the database');
    return db;
  } catch (err) {
    console.error('Error connecting to database:', err);
    throw err;
  }
};

// Export the connection function for use in routes
export { connectToDatabase };

// Connect to the SQLite database and store it in AWS S3
createAndStoreDatabase()
  .catch(err => console.error('Error:', err));
