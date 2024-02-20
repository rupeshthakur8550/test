import sqlite3 from "sqlite3";
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const bucketName = "cyclic-faithful-culottes-bull-ap-south-1";
const databaseFileName = 'database.db';

// Initialize AWS SDK v3 S3 client
const s3Client = new S3Client({
  region: 'ap-south-1', // Update with your AWS region
});

// Function to upload the SQLite database file to AWS S3
const uploadDatabaseToS3 = async (dbStream) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: databaseFileName,
      Body: dbStream,
    };
    await s3Client.send(new PutObjectCommand(params));
    console.log(`Database file ${databaseFileName} uploaded successfully to S3 bucket.`);
  } catch (err) {
    console.error('Error uploading file to S3:', err);
    throw err;
  }
};

// Function to download the SQLite database file from AWS S3
const downloadDatabaseFromS3 = async () => {
  try {
    const params = {
      Bucket: bucketName,
      Key: databaseFileName,
    };
    const data = await s3Client.send(new GetObjectCommand(params));
    return data.Body;
  } catch (err) {
    console.error('Error downloading file from S3:', err);
    throw err;
  }
};

// Create and store the database file in AWS storage
const createAndStoreDatabase = async () => {
  const db = new sqlite3.Database(':memory:'); // Create an in-memory database

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
    const dbBuffer = await downloadDatabaseFromS3();

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

// Export the connection function for use in routes
export { connectToDatabase };

// Create and store the database
createAndStoreDatabase();
