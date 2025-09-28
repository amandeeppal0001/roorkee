import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors()); // Allows requests from your frontend
app.use(express.json()); // Parses incoming JSON requests

// --- MOCK DATA ---
// In a real app, this would come from a database.
const mockBuildings = [
    { id: 'b1', name: 'Main Building', location: { lat: 29.8649, lng: 77.8966 }, carbonScore: 85 },
    { id: 'b2', name: 'Library', location: { lat: 29.8660, lng: 77.8970 }, carbonScore: 60 },
    { id: 'b3', name: 'Hostel A', location: { lat: 29.8675, lng: 77.8950 }, carbonScore: 92 },
];
const mockVehicles = {
    'v1': { name: 'Shuttle 1', location: { lat: 29.8655, lng: 77.8960 } },
    'v2': { name: 'Maintenance Van', location: { lat: 29.8670, lng: 77.8955 } },
};
// Simple simulator to make vehicles "move"
setInterval(() => {
    mockVehicles.v1.location.lat += (Math.random() - 0.5) * 0.0001;
    mockVehicles.v1.location.lng += (Math.random() - 0.5) * 0.0001;
    mockVehicles.v2.location.lat -= (Math.random() - 0.5) * 0.0001;
    console.log("Updated vehicle positions.");
}, 3000);

// Add mock data to the app object to make it accessible in routes
app.locals.mockBuildings = mockBuildings;
app.locals.mockVehicles = mockVehicles;


// API Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});