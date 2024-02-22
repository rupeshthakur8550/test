import express from 'express';
import { connectToDatabase, getDatabaseFromS3, updateDatabaseOnS3 } from '../utils/db.js';

const router = express.Router();

// Middleware to handle database setup before route handling
router.use(async (req, res, next) => {
    try {
        await connectToDatabase(); // Connect to the database once
        await getDatabaseFromS3(); // Get the database from S3 if needed
        next();
    } catch (error) {
        console.error("Error setting up database:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Function to insert an address into the database
const insertAddress = async (db, address, longitude, latitude, technician_id) => {
    await db.run(`INSERT INTO address (address, longitude, latitude, technician_id) VALUES (?, ?, ?, ?)`, [address, longitude, latitude, technician_id]);
};

// Function to retrieve addresses by technician ID from the database
const getAddressByTechnicianId = async (db, technician_id) => {
    return await db.all(`SELECT address, longitude, latitude FROM address WHERE technician_id = ?`, [technician_id]);
};

// Function to delete all addresses associated with a technician ID
const deleteAddressesByTechnicianId = async (db, technician_id) => {
    await db.run(`DELETE FROM address WHERE technician_id = ?`, [technician_id]);
};

// Route to handle inserting a new address
router.post('/address', async (req, res) => {
    const { address, longitude, latitude, technician_id } = req.body;
    const db = req.db; // Database connection injected by middleware
    try {
        await insertAddress(db, address, longitude, latitude, technician_id);
        res.status(201).json({ message: 'Data inserted into the address table' });
    } catch (err) {
        console.error("Error inserting data into the address table:", err);
        res.status(500).json({ error: 'Error inserting data into the address table' });
    }
});

// Route to handle retrieving addresses by technician ID
router.get('/address/:technician_id', async (req, res) => {
    const technician_id = req.params.technician_id;
    const db = req.db; // Database connection injected by middleware
    try {
        const data = await getAddressByTechnicianId(db, technician_id);
        res.status(200).json(data);
    } catch (err) {
        console.error("Error retrieving data from the address table:", err);
        res.status(500).json({ error: 'Error retrieving data from the address table' });
    }
});

// Route to handle deleting all addresses associated with a technician ID
router.delete('/address/:technician_id', async (req, res) => {
    const technician_id = req.params.technician_id;
    const db = req.db; // Database connection injected by middleware
    try {
        await deleteAddressesByTechnicianId(db, technician_id);
        res.status(200).json({ message: 'Addresses deleted successfully' });
    } catch (err) {
        console.error("Error deleting addresses associated with the provided technician ID:", err);
        res.status(500).json({ error: 'Error deleting addresses associated with the provided technician ID' });
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
