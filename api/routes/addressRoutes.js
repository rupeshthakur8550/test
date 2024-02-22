import express from 'express';
import { db } from '../utils/db.js';

const router = express.Router();

// Route to handle inserting a new address
router.post('/address', async (req, res) => {
  const { address, longitude, latitude, technician_id } = req.body;

  try {
    db.run(`INSERT INTO address (address, longitude, latitude, technician_id) 
      VALUES (?, ?, ?, ?)`, [address, longitude, latitude, technician_id], (err) => {
      if (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error inserting data into the address table' });
      } else {
        res.status(201).json({ message: 'Data inserted into the address table' });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error connecting to database' });
  }
});

// Route to handle retrieving addresses by technician ID
router.get('/address/:technician_id', async (req, res) => {
  const technician_id = req.params.technician_id;

  try {
    db.all(`SELECT address, longitude, latitude FROM address WHERE technician_id = ?`, [technician_id], (err, rows) => {
      if (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error retrieving data from the address table' });
      } else {
        res.status(200).json(rows);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error connecting to database' });
  }
});

// Route to handle deleting all addresses associated with a technician ID
router.delete('/address/:technician_id', async (req, res) => {
  const technician_id = req.params.technician_id;

  try {
    db.run(`DELETE FROM address WHERE technician_id = ?`, [technician_id], (err) => {
      if (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error deleting addresses associated with the provided technician ID' });
      } else {
        res.status(200).json({ message: 'Addresses deleted successfully' });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error connecting to database' });
  }
});

export default router;
