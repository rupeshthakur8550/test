import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

// Function to insert an address into the database
const insertAddress = (address, longitude, latitude, technician_id, callback) => {
    db.run(`INSERT INTO address (address, longitude, latitude, technician_id) 
          VALUES (?, ?, ?, ?)`, [address, longitude, latitude, technician_id], (err) => {
        if (err) {
            console.error(err.message);
            callback(err);
        } else {
            callback(null);
        }
    });
};

// Function to retrieve addresses by technician ID from the database
const getAddressByTechnicianId = (technician_id, callback) => {
    db.all(`SELECT address, longitude, latitude FROM address WHERE technician_id = ?`, [technician_id], (err, rows) => {
        if (err) {
            console.error(err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
};

// Function to delete all addresses associated with a technician ID
const deleteAddressesByTechnicianId = (technician_id, callback) => {
    db.run(`DELETE FROM address WHERE technician_id = ?`, [technician_id], (err) => {
        if (err) {
            console.error(err.message);
            callback(err);
        } else {
            callback(null);
        }
    });
};

// Route to handle inserting a new address
router.post('/address', (req, res) => {
    const { address, longitude, latitude, technician_id } = req.body;

    insertAddress(address, longitude, latitude, technician_id, (err) => {
        if (err) {
            res.status(500).json({ error: 'Error inserting data into the address table' });
        } else {
            res.status(201).json({ message: 'Data inserted into the address table' });
        }
    });
});

// Route to handle retrieving addresses by technician ID
router.get('/address/:technician_id', (req, res) => {
    const technician_id = req.params.technician_id;

    getAddressByTechnicianId(technician_id, (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Error retrieving data from the address table' });
        } else {
            res.status(200).json(data);
        }
    });
});

// Route to handle deleting all addresses associated with a technician ID
router.delete('/address/:technician_id', (req, res) => {
    const technician_id = req.params.technician_id;

    deleteAddressesByTechnicianId(technician_id, (err) => {
        if (err) {
            res.status(500).json({ error: 'Error deleting addresses associated with the provided technician ID' });
        } else {
            res.status(200).json({ message: 'Addresses deleted successfully' });
        }
    });
});

export default router;