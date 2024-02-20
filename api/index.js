import express from 'express';
import { connectToDatabase } from './utils/db.js';
import addressRoutes from './routes/addressRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import shortestRoutes from './routes/shortestPath.js'; 
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Connect to the database before starting the server
connectToDatabase((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1); // Exit the process if unable to connect to the database
  } else {
    // Start the server
    app.use('/api', addressRoutes);
    app.use('/api', technicianRoutes);
    app.use('/api', shortestRoutes); 

    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }
});
