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

// Route to insert a new technician
router.post('/technician', async (req, res) => {
  const { location, longitude, latitude } = req.body;

  try {
    const db = await initDB();

    await db.run(`INSERT INTO technician (location, longitude, latitude) 
      VALUES (?, ?, ?)`, [location, longitude, latitude]);

    const technician_id = this.lastID;
    console.log(`Inserted a row with the ID: ${technician_id}`);
    res.status(200).json({ technician_id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error inserting data into the technician table');
  }
});

// Route to update completion status to 1 for a provided technician ID
router.put('/technician/:technician_id/completion', async (req, res) => {
  const technician_id = req.params.technician_id;

  try {
    const db = await initDB();

    const result = await db.run(`UPDATE technician SET completion_status = 1 WHERE id = ?`, [technician_id]);
    if (result.changes > 0) {
      res.status(200).json({ message: 'Completion status updated successfully' });
    } else {
      res.status(404).send('Technician ID not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error updating completion status for the provided technician ID');
  }
});

// Route to delete a technician entry for a provided technician ID
router.delete('/technician/:technician_id', async (req, res) => {
  const technician_id = req.params.technician_id;

  try {
    const db = await initDB();

    const result = await db.run(`DELETE FROM technician WHERE id = ?`, [technician_id]);
    if (result.changes > 0) {
      res.status(200).json({ message: 'Entry deleted successfully' });
    } else {
      res.status(404).send('Technician ID not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error deleting entry for the provided technician ID');
  }
});

export default router;
