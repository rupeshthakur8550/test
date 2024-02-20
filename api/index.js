import express from 'express';
import addressRoutes from './routes/addressRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import shortestRoutes from './routes/shortestpath.js';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', addressRoutes);
app.use('/api', technicianRoutes);
app.use('/api', shortestRoutes);

const port = process.env.PORT || 3001; // Use the port specified by the environment variable PORT or default to 3001
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
