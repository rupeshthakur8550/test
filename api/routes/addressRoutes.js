import express from 'express';
import { connectToDatabase } from '../utils/db.js';

const router = express.Router();

// Function to insert an address into the database
const insertAddress = async (db, address, longitude, latitude, technician_id) => {
    try {
        await db.run(`INSERT INTO address (address, longitude, latitude, technician_id) 
            VALUES (?, ?, ?, ?)`, [address, longitude, latitude, technician_id]);
        return true;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
};

// Function to retrieve addresses by technician ID from the database
const getAddressByTechnicianId = async (db, technician_id) => {
    try {
        const rows = await db.all(`SELECT address, longitude, latitude FROM address WHERE technician_id = ?`, [technician_id]);
        return rows;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
};

// Function to delete all addresses associated with a technician ID
const deleteAddressesByTechnicianId = async (db, technician_id) => {
    try {
        await db.run(`DELETE FROM address WHERE technician_id = ?`, [technician_id]);
        return true;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
};

// Route to handle inserting a new address
router.post('/address', async (req, res) => {
    const { address, longitude, latitude, technician_id } = req.body;
    const db = await connectToDatabase();

    try {
        await insertAddress(db, address, longitude, latitude, technician_id);
        res.status(201).json({ message: 'Data inserted into the address table' });
    } catch (err) {
        res.status(500).json({ error: 'Error inserting data into the address table' });
    } finally {
        db.close();
    }
});

// Route to handle retrieving addresses by technician ID
router.get('/address/:technician_id', async (req, res) => {
    const technician_id = req.params.technician_id;
    const db = await connectToDatabase();

    try {
        const data = await getAddressByTechnicianId(db, technician_id);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving data from the address table' });
    } finally {
        db.close();
    }
});

// Route to handle deleting all addresses associated with a technician ID
router.delete('/address/:technician_id', async (req, res) => {
    const technician_id = req.params.technician_id;
    const db = await connectToDatabase();

    try {
        await deleteAddressesByTechnicianId(db, technician_id);
        res.status(200).json({ message: 'Addresses deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting addresses associated with the provided technician ID' });
    } finally {
        db.close();
    }
});

export default router;
