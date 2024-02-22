import express from "express";
import { connectToDatabase, getDatabaseFromS3, updateDatabaseOnS3 } from '../utils/db.js';

const router = express.Router();
let db; // Reuse the database connection

// Middleware to handle database setup before route handling
router.use(async (req, res, next) => {
    try {
        if (!db) {
            db = await connectToDatabase(); // Connect to the database once
            await getDatabaseFromS3(); // Get the database from S3 if needed
        }
        req.db = db; // Inject the database connection into request object
        next();
    } catch (error) {
        console.error("Error setting up database:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Function to find the nearest neighbor
function findNearestNeighbor(location, addresses) {
    let nearestAddress = addresses[0];
    let shortestDistance = calculateDistance(location.lat, location.lon, nearestAddress.lat, nearestAddress.lon);

    for (let i = 1; i < addresses.length; i++) {
        const distance = calculateDistance(location.lat, location.lon, addresses[i].lat, addresses[i].lon);
        if (distance < shortestDistance) {
            nearestAddress = addresses[i];
            shortestDistance = distance;
        }
    }

    return nearestAddress;
}

// Function to calculate the shortest path
async function calculateShortestPath(locations) {
    const technicianLocation = locations[0];
    const addressesToVisit = locations.slice(1);
    const resultData = [technicianLocation];

    while (addressesToVisit.length > 0) {
        const nearestAddress = findNearestNeighbor(technicianLocation, addressesToVisit);
        resultData.push(nearestAddress);
        const index = addressesToVisit.findIndex(address => address.name === nearestAddress.name);
        if (index > -1) {
            addressesToVisit.splice(index, 1);
        }
        technicianLocation.lat = nearestAddress.lat;
        technicianLocation.lon = nearestAddress.lon;
    }

    return resultData;
}

// Function to get address data by technician ID from the database
async function getAddressByTechnicianId(db, technician_id) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT location AS name, longitude AS lon, latitude AS lat, 'technician' AS type 
                FROM technician 
                WHERE id = ?
                UNION
                SELECT address AS name, longitude AS lon, latitude AS lat, 'address' AS type 
                FROM address 
                WHERE technician_id = ? 
                ORDER BY type DESC`, [technician_id, technician_id], (err, rows) => {
            if (err) {
                console.error("Error retrieving data from the database:", err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

router.get('/shortestpath/:technician_id', async (req, res) => {
    const technician_id = req.params.technician_id;
    try {
        const data = await getAddressByTechnicianId(req.db, technician_id);
        const shortestPath = await calculateShortestPath(data);
        res.status(200).json(shortestPath);
    } catch (err) {
        console.error("Error retrieving data from the address table:", err);
        res.status(500).json({ error: 'Error retrieving data from the address table' });
    }
});

// Middleware to handle database cleanup after route handling
router.use(async (req, res, next) => {
    try {
        if (db) {
            await updateDatabaseOnS3(); // Update the database on S3 after all routes are handled
            db.close(); // Close the database connection
            db = null; // Reset the database connection
        }
        next();
    } catch (error) {
        console.error("Error updating database on S3:", error);
        res.status(500).json({ error: 'Error updating database on S3' });
    }
});

export default router;
