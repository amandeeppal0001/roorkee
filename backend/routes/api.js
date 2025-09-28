import express from 'express';
import axios from 'axios';

const router = express.Router();

// GET /api/buildings
router.get('/buildings', (req, res) => {
    res.json(req.app.locals.mockBuildings);
});

// GET /api/vehicles
router.get('/vehicles', (req, res) => {
    res.json(req.app.locals.mockVehicles);
});

// POST /api/routes/optimize
router.post('/routes/optimize', async (req, res) => {
    const { start, end } = req.body; // Expects { start: { lat, lng }, end: { lat, lng } }

    if (!start || !end) {
        return res.status(400).json({ error: 'Start and end points are required.' });
    }

    const apiKey = process.env.MAPMYINDIA_API_KEY;
    const startCoords = `${start.lng},${start.lat}`;
    const endCoords = `${end.lng},${end.lat}`;
    
    // Using MapmyIndia's Route API
    const url = `https://apis.mapmyindia.com/directions/v1/${apiKey}?start=${startCoords}&destination=${endCoords}&alternatives=false&overview=full`;

    try {
        const response = await axios.get(url);
        
        // Extract the geometry (the line to draw on the map)
        const routeGeometry = response.data.routes[0]?.geometry;

        if (!routeGeometry) {
            return res.status(404).json({ error: 'Route not found.' });
        }
        
        res.json({ geometry: routeGeometry });

    } catch (error) {
        console.error("MapmyIndia API Error:", error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch route from MapmyIndia API.' });
    }
});

export default router;