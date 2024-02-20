import express from 'express';
import connectToDatabase from '../api/utils/db.js';
import addressRoutes from '../api/routes/addressRoutes.js'
import technicianROutes from '../api/routes/technicianRoutes.js'
import shortestpath from '../api/routes/shortestpath.js'
import cors from 'cors';

const app = express();

app.use(cors());

app.use(express.json());

app.use('/api', addressRoutes);
app.use('/api', technicianROutes);
app.use('/api', shortestpath);

app.listen(3001, () => {
  console.log("Server is running on port no 3001");
});
