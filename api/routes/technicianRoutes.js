import express from 'express';
import { connectToDatabase, getDatabaseFromS3, updateDatabaseOnS3 } from '../utils/db.js';

const router = express.Router();

// Middleware to handle database setup before route handling
router.use(async (req, res, next) => {
    try {
        await connectToDatabase(); // Connect to the database once
        await getDatabaseFromS3(); // Get the database from S3 if needed
        req.db = connectToDatabase(); // Inject the database connection into request object
        next();
    } catch (error) {
        console.error("Error setting up database:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to insert a new technician
router.post('/technician', async (req, res) => {
    const { location, longitude, latitude } = req.body;
    const db = req.db; // Database connection injected by middleware

    try {
        await db.run(`INSERT INTO technician (location, longitude, latitude) VALUES (?, ?, ?)`, [location, longitude, latitude]);
        const lastID = this.lastID;
        console.log(`Inserted a row with the ID: ${lastID}`);
        res.status(200).json({ technician_id: lastID });
    } catch (err) {
        console.error("Error inserting data into the technician table:", err);
        res.status(500).send('Error inserting data into the technician table');
    }
});

// Route to update completion status to 1 for a provided technician ID
router.put('/technician/:technician_id/completion', async (req, res) => {
    const technician_id = req.params.technician_id;
    const db = req.db; // Database connection injected by middleware

    try {
        const result = await db.run(`UPDATE technician SET completion_status = 1 WHERE id = ?`, [technician_id]);
        if (result.changes > 0) {
            res.status(200).json({ message: 'Completion status updated successfully' });
        } else {
            res.status(404).send('Technician ID not found');
        }
    } catch (err) {
        console.error("Error updating completion status for the provided technician ID:", err);
        res.status(500).send('Error updating completion status for the provided technician ID');
    }
});

// Route to delete a technician entry by ID
router.delete('/technician/:technician_id', async (req, res) => {
    const technician_id = req.params.technician_id;
    const db = req.db; // Database connection injected by middleware

    try {
        const result = await db.run(`DELETE FROM technician WHERE id = ?`, [technician_id]);
        if (result.changes > 0) {
            res.status(200).json({ message: 'Entry deleted successfully' });
        } else {
            res.status(404).send('Technician ID not found');
        }
    } catch (err) {
        console.error("Error deleting entry for the provided technician ID:", err);
        res.status(500).send('Error deleting entry for the provided technician ID');
    }
});

// Middleware to handle database cleanup after route handling
router.use(async (req, res) => {
    try {
        await updateDatabaseOnS3(); // Update the database on S3 after all routes are handled
        req.db.close(); // Close the database connection
    } catch (error) {
        console.error("Error updating database on S3:", error);
    }
});

export default router;
