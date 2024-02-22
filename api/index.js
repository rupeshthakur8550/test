import express from 'express';
import addressRoutes from './routes/addressRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import shortestRoutes from './routes/shortestpath.js';
import { initializeDatabase } from './utils/db.js';
import cors from 'cors';
import fs from 'fs';

const app = express();

app.use(cors());
app.use(express.json());

const initDB = async () => {
  try {
    // Check if database file exists
    if (!fs.existsSync('database.db')) {
      console.log('Database file not found. Creating the database file.');
      // Create the database file
      fs.writeFileSync('database.db', '');
    }

    // Initialize the database
    return await initializeDatabase();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

initDB()
  .then(() => {
    app.use('/api', addressRoutes);
    app.use('/api', technicianRoutes);
    app.use('/api', shortestRoutes);

    const port = process.env.PORT || 3001; // Use the port specified by the environment variable PORT or default to 3001
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch(error => {
    console.error('Error initializing application:', error);
    process.exit(1); // Exit with error status
  });
