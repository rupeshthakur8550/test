import express from 'express';
import { db } from '../utils/db.js';

const router = express.Router();

// Route to insert a new technician
router.post('/technician', (req, res) => {
    const { location, longitude, latitude } = req.body;

    db.run(`INSERT INTO technician (location, longitude, latitude) 
            VALUES (?, ?, ?)`, [location, longitude, latitude], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error inserting data into the technician table');
        }
        
        console.log(`Inserted a row with the ID: ${this.lastID}`);
        if (this.lastID) {
            return res.status(200).json({ technician_id: this.lastID });
        } else {
            return res.status(500).send('No result returned from the database');
        }
    });
});

// Route to update completion status to 1 for a provided technician ID
router.put('/technician/:technician_id/completion', (req, res) => {
    const technician_id = req.params.technician_id;

    db.run(`UPDATE technician SET completion_status = 1 WHERE id = ?`, [technician_id], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error updating completion status for the provided technician ID');
        }
        
        if (this.changes > 0) {
            return res.status(200).json({ message: 'Completion status updated successfully' });
        } else {
            return res.status(404).send('Technician ID not found');
        }
    });
});

// Route to delete a technician entry for a provided technician ID
router.delete('/technician/:technician_id', (req, res) => {
    const technician_id = req.params.technician_id;

    db.run(`DELETE FROM technician WHERE id = ?`, [technician_id], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error deleting entry for the provided technician ID');
        }
        
        if (this.changes > 0) {
            return res.status(200).json({ message: 'Entry deleted successfully' });
        } else {
            return res.status(404).send('Technician ID not found');
        }
    });
});

export default router;
