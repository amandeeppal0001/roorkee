import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [vehicleMarkers, setVehicleMarkers] = useState({});
  const [buildings, setBuildings] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [loading, setLoading] = useState(true);

  // Load Mappls SDK script
  useEffect(() => {
    const existingScript = document.getElementById("mappls-sdk");

    if (!existingScript) {
      const script = document.createElement("script");
      script.src =
        "https://apis.mappls.com/advancedmaps/api/7e9ae35043cd4d04737eb5cadc6e6903/map_sdk?layer=vector&v=3.0&libraries=geoanalytics";
      script.id = "mappls-sdk";
      script.async = true;
      script.defer = true;
      script.onload = () => initializeMap();
      document.body.appendChild(script);
    } else {
      initializeMap();
    }
  }, []);

  const initializeMap = () => {
    if (!window.mappls) {
      console.error("Mappls SDK not loaded.");
      return;
    }

    map.current = new window.mappls.Map(mapContainer.current, {
      center: [29.8649, 77.8966],
      zoom: 15,
    });

    map.current.on("load", () => {
      console.log("Map loaded successfully!");
      fetchData();
      setLoading(false);
      addLocalityLayer();

      if (window.mappls && window.mappls.search) {
        new window.mappls.search({
          map: map.current,
          searchType: "autosuggest",
          container: "searchBox",
          onSelect: function (result) {
            new window.mappls.Marker({
              map: map.current,
              position: {
                lat: result.latitude,
                lng: result.longitude,
              },
            });

            map.current.setCenter({
              lat: result.latitude,
              lng: result.longitude,
            });
            map.current.setZoom(16);
          },
        });
      }
    });
  };

  // Add Locality Layer (geoAnalytics)
  const addLocalityLayer = () => {
    const geoParams = {
      AccessToken: "7e9ae35043cd4d04737eb5cadc6e6903",
      GeoBoundType: "stt_nme",
      GeoBound: ["delhi", "haryana"],
      Attribute: "t_p",
      Query: ">0",
      Style: {
        BorderColor: "000000",
        BorderWidth: 1,
        FillColor: "00695c",
        Geometry: "polygon",
        Opacity: 0.5,
      },
      SpatialLayer: "geoAnalyticsLocality",
      SpatialLayer1: "locality",
    };

    const tilesURL = window.geoAnalytics.getLocality(geoParams);

    map.current.addSource("locality-source", {
      type: "raster",
      tiles: [tilesURL],
      tileSize: 256,
    });

    map.current.addLayer({
      id: "locality-layer",
      type: "raster",
      source: "locality-source",
    });

    const bounds = window.geoAnalytics.getBounds("locality", geoParams);
    if (bounds) {
      map.current.fitBounds(bounds, { padding: 40 });
    }
  };

  // Fetch buildings and vehicles
  const fetchData = async () => {
    try {
      const buildingsRes = await axios.get("http://localhost:5002/api/buildings");
      setBuildings(buildingsRes.data);
      const vehiclesRes = await axios.get("http://localhost:5002/api/vehicles");
      setVehicles(vehiclesRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  // Re-fetch vehicles every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      axios
        .get("http://localhost:5002/api/vehicles")
        .then((res) => setVehicles(res.data))
        .catch((err) => console.error("Vehicle fetch error:", err));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Draw building markers
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || buildings.length === 0) return;

    buildings.forEach((building) => {
      const marker = new window.mappls.Marker({
        position: { lat: building.location.lat, lng: building.location.lng },
        map: map.current,
        fitbounds: false,
        icon_html: `<div class="building-marker" style="background-color: rgba(255, 0, 0, ${
          building.carbonScore / 100
        })"></div>`,
      });

      const infoWindow = new window.mappls.InfoWindow({
        content: `<h6>${building.name}</h6><p>Carbon Score: ${building.carbonScore}</p>`,
      });

      marker.on("click", () => infoWindow.open(map.current, marker));
    });
  }, [buildings]);

  // Draw/update vehicle markers
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const newMarkers = { ...vehicleMarkers };

    Object.keys(vehicles).forEach((vehicleId) => {
      const vehicle = vehicles[vehicleId];
      const position = { lat: vehicle.location.lat, lng: vehicle.location.lng };

      if (newMarkers[vehicleId]) {
        newMarkers[vehicleId].setLngLat(position);
      } else {
        newMarkers[vehicleId] = new window.mappls.Marker({
          position,
          map: map.current,
          icon_html: `<div class="vehicle-marker">🚚</div>`,
        });
      }
    });

    setVehicleMarkers(newMarkers);
  }, [vehicles]);

  const handleOptimizeRoute = async () => {
    if (!map.current) return;

    const startPoint = buildings.find((b) => b.id === "b1")?.location;
    const endPoint = buildings.find((b) => b.id === "b2")?.location;

    if (!startPoint || !endPoint) {
      alert("Could not find start/end buildings!");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5002/api/routes/optimize", {
        start: startPoint,
        end: endPoint,
      });

      const routeGeoJSON = response.data.geometry;

      map.current.addPolyline({
        path: routeGeoJSON.coordinates.map((c) => ({ lat: c[1], lng: c[0] })),
        strokeColor: "#007cbf",
        strokeOpacity: 1.0,
        strokeWeight: 5,
      });
    } catch (error) {
      console.error("Route optimization failed:", error);
      alert("Could not generate route.");
    }
  };

  return (
    <div className="app-container">
      {/* <div className="sidebar">
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
          <div>
            <span className="legend-color" style={{ backgroundColor: "rgba(255, 0, 0, 0.9)" }}></span>{" "}
            High Carbon Footprint
          </div>
          <div>
            <span className="legend-color" style={{ backgroundColor: "rgba(255, 0, 0, 0.4)" }}></span>{" "}
            Low Carbon Footprint
          </div>
          <div>
            <span>🚚</span> Campus Vehicle
          </div>
        </div>
      </div> */}

      {/* Map & Search */}
      <div style={{ position: "relative", flex: 1 }}>
        <div id="searchBox" style={{ position: "absolute", top: "10px", left: "320px", zIndex: 1000 }}></div>
        <div id="map" ref={mapContainer} className="map-container" style={{ width: "100%", height: "100vh" }} />
      </div>

      {loading && <div className="loader">Loading Map & Data...</div>}
    </div>
  );
}

export default App;
