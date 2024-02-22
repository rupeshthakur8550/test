import express from 'express';
import { initializeDatabase } from '../utils/db.js';

const router = express.Router();

// Initialize the SQLite database
const initDB = async () => {
  try {
    return await initializeDatabase();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Route to handle inserting a new address
router.post('/address', async (req, res) => {
  const { address, longitude, latitude, technician_id } = req.body;

  try {
    const db = await initDB();

    db.run(`INSERT INTO address (address, longitude, latitude, technician_id) 
      VALUES (?, ?, ?, ?)`, [address, longitude, latitude, technician_id]);

    res.status(201).json({ message: 'Data inserted into the address table' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error connecting to database' });
  }
});

// Route to handle retrieving addresses by technician ID
router.get('/address/:technician_id', async (req, res) => {
  const technician_id = req.params.technician_id;

  try {
    const db = await initDB();

    const rows = db.all(`SELECT address, longitude, latitude FROM address WHERE technician_id = ?`, [technician_id]);

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error connecting to database' });
  }
});

// Route to handle deleting all addresses associated with a technician ID
router.delete('/address/:technician_id', async (req, res) => {
  const technician_id = req.params.technician_id;

  try {
    const db = await initDB();

    db.run(`DELETE FROM address WHERE technician_id = ?`, [technician_id]);

    res.status(200).json({ message: 'Addresses deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error connecting to database' });
  }
});

export default router;
