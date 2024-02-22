import express from 'express';
import { connectToDatabase } from '../utils/db.js';

const router = express.Router();

// Route to insert a new technician
router.post('/technician', async (req, res) => {
    const { location, longitude, latitude } = req.body;
    const db = await connectToDatabase();

    try {
        await db.run(`INSERT INTO technician (location, longitude, latitude) 
            VALUES (?, ?, ?)`, [location, longitude, latitude]);
        const lastID = this.lastID;
        db.close();
        console.log(`Inserted a row with the ID: ${lastID}`);
        res.status(200).json({ technician_id: lastID });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error inserting data into the technician table');
    } finally {
        db.close();
    }
});

// Route to update completion status to 1 for a provided technician ID
router.put('/technician/:technician_id/completion', async (req, res) => {
    const technician_id = req.params.technician_id;
    const db = await connectToDatabase();

    try {
        const result = await db.run(`UPDATE technician SET completion_status = 1 WHERE id = ?`, [technician_id]);
        db.close();
        if (result.changes > 0) {
            res.status(200).json({ message: 'Completion status updated successfully' });
        } else {
            res.status(404).send('Technician ID not found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error updating completion status for the provided technician ID');
    } finally {
        db.close();
    }
});

router.delete('/technician/:technician_id', async (req, res) => {
    const technician_id = req.params.technician_id;
    const db = await connectToDatabase();

    try {
        const result = await db.run(`DELETE FROM technician WHERE id = ?`, [technician_id]);
        db.close();
        if (result.changes > 0) {
            res.status(200).json({ message: 'Entry deleted successfully' });
        } else {
            res.status(404).send('Technician ID not found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error deleting entry for the provided technician ID');
    } finally {
        db.close();
    }
});

export default router;
