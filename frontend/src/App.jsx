import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  
  // Use a state to hold marker instances so we can update them later
  const [vehicleMarkers, setVehicleMarkers] = useState({});

  const [buildings, setBuildings] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [loading, setLoading] = useState(true);

  // --- 1. INITIAL MAP SETUP (Uhttps://firebasestorage.googleapis.com/v0/b/preplaced-dev.appspot.com/o/Leeco.png?alt=media&token=1d6f6009-2e8b-4b32-b2a3-2f9092610d17$0sing the new Mappls API) ---
  useEffect(() => {
    // FIX: This check prevents the map from being initialized more than once.
    if (map.current) {
        return; 
    }

    // This check waits for the Mappls script to be ready
    if (!window.mappls || !window.mappls.Map) {
      console.error("Mappls SDK not loaded.");
      return;
    }

    // Initialize the Mappls Map, passing the DOM element directly
    map.current = new window.mappls.Map(mapContainer.current, {
      center: [29.8649, 77.8966], // Mappls uses [lat, lng] for center
      zoom: 15
    });

    map.current.on('load', () => {
      console.log("Map loaded successfully!");
      fetchData();
      setLoading(false);
    });

    // Cleanup when the component is unmounted
    return () => {
        if(map.current) {
            map.current.remove();
            map.current = null; // Ensure the ref is cleared
        }
    };
  }, []);

  // Function to fetch initial data from your backend
  const fetchData = async () => {
    try {
      const buildingsRes = await axios.get('http://localhost:5002/api/buildings');
      setBuildings(buildingsRes.data);
      const vehiclesRes = await axios.get('http://localhost:5002/api/vehicles');
      setVehicles(vehiclesRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };
  
  // --- 2. REAL-TIME VEHICLE TRACKING ---
  useEffect(() => {
    const interval = setInterval(() => {
      axios.get('http://localhost:5002/api/vehicles')
        .then(res => setVehicles(res.data))
        .catch(err => console.error("Vehicle fetch error:", err));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // --- 3. DRAWING BUILDING DATA ON THE MAP ---
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || buildings.length === 0) return;

    // This effect runs once when buildings are loaded
    buildings.forEach(building => {
      const marker = new window.mappls.Marker({
          position: { lat: building.location.lat, lng: building.location.lng },
          map: map.current,
          fitbounds: false,
          // Use icon_html for custom markers
          icon_html: `<div class="building-marker" style="background-color: rgba(255, 0, 0, ${building.carbonScore / 100})"></div>`
      });

      // Add popup info that shows on click
      const infoWindow = new window.mappls.InfoWindow({
        content: `<h6>${building.name}</h6><p>Carbon Score: ${building.carbonScore}</p>`
      });
      marker.on('click', () => {
        infoWindow.open(map.current, marker);
      });
    });

  }, [buildings]); // Rerun only when building data changes

  // --- 4. DRAWING AND UPDATING VEHICLE DATA ON THE MAP ---
  useEffect(() => {
      if (!map.current || !map.current.isStyleLoaded()) return;

      const newMarkers = {...vehicleMarkers};

      Object.keys(vehicles).forEach(vehicleId => {
          const vehicle = vehicles[vehicleId];
          const position = { lat: vehicle.location.lat, lng: vehicle.location.lng };

          if (newMarkers[vehicleId]) {
              // If marker exists, just update its position
              newMarkers[vehicleId].setLngLat(position);
          } else {
              // If marker is new, create it and add to state
              newMarkers[vehicleId] = new window.mappls.Marker({
                  position: position,
                  map: map.current,
                  icon_html: `<div class="vehicle-marker">🚚</div>`
              });
          }
      });
      setVehicleMarkers(newMarkers);

  }, [vehicles]); // Rerun only when vehicle data changes

  // --- 5. HANDLE ROUTE OPTIMIZATION ---
  const handleOptimizeRoute = async () => {
      if (!map.current) return;
      const startPoint = buildings.find(b => b.id === 'b1')?.location;
      const endPoint = buildings.find(b => b.id === 'b2')?.location;

      if(!startPoint || !endPoint) {
          alert("Could not find start/end buildings!");
          return;
      }
      
      try {
        const response = await axios.post('http://localhost:5002/api/routes/optimize', {
            start: startPoint,
            end: endPoint
        });
        const routeGeoJSON = response.data.geometry;
        
        // Mappls uses a simple addPolyline method
        map.current.addPolyline({
            path: routeGeoJSON.coordinates.map(c => ({ lat: c[1], lng: c[0] })), // Convert [lng, lat] to {lat, lng}
            strokeColor: "#007cbf",
            strokeOpacity: 1.0,
            strokeWeight: 5
        });

      } catch(error) {
          console.error("Route optimization failed:", error);
          alert("Could not generate route.");
      }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>Campus Digital Twin</h2>
        <p>A smart solution for a greener, more efficient campus.</p>
        <div className="control-panel">
            <h4>Actions</h4>
            <button onClick={handleOptimizeRoute}>
                Optimize Route (Main Building to Library)
            </button>
        </div>
        <div className="legend">
            <h4>Legend</h4>
            <div><span className="legend-color" style={{backgroundColor: 'rgba(255, 0, 0, 0.9)'}}></span> High Carbon Footprint</div>
            <div><span className="legend-color" style={{backgroundColor: 'rgba(255, 0, 0, 0.4)'}}></span> Low Carbon Footprint</div>
            <div><span>🚚</span> Campus Vehicle</div>
        </div>
      </div>
      {/* The map container needs the ID 'map' for the SDK to find it */}
      <div id="map" ref={mapContainer} className="map-container" />
      {loading && <div className="loader">Loading Map & Data...</div>}
    </div>
  );
}

export default App;

