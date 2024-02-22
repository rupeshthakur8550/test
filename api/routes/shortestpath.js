import express from 'express';
import { db } from '../utils/db.js';

const router = express.Router();

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
function calculateShortestPath(locations) {
  // Get the technician's location from the first element of the locations array
  const technicianLocation = locations[0];

  // Get the addresses to visit (excluding the technician's location)
  const addressesToVisit = locations.slice(1);

  const resultData = [technicianLocation]; // Initialize resultData with technician's location

  // Visit addresses one by one
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

const getAddressByTechnicianId = (technician_id, callback) => {
  db.all(`SELECT location AS name, longitude AS lon, latitude AS lat, 'technician' AS type 
          FROM technician 
          WHERE id = ?
          UNION
          SELECT address AS name, longitude AS lon, latitude AS lat, 'address' AS type 
          FROM address 
          WHERE technician_id = ? 
          ORDER BY type DESC`, [technician_id, technician_id], (err, rows) => {
    if (err) {
      console.error(err.message);
      callback(err, null);
    } else {
      callback(null, rows);
    }
  });
};

// Route to calculate shortest path
router.get('/shortestpath/:technician_id', (req, res) => {
  const technician_id = req.params.technician_id;

  getAddressByTechnicianId(technician_id, (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Error retrieving data from the address table' });
    } else {
      // Calculate shortest path
      const shortestPath = calculateShortestPath(data);
      res.status(200).json(shortestPath);
    }
  });
});

export default router;
