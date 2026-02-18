import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Parada {
  id: string;
  direccion: string;
  lat: number;
  lon: number;
}

// Custom bus stop icon with brand colors
const busStopIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow -->
      <ellipse cx="16" cy="38" rx="8" ry="2" fill="rgba(0,0,0,0.2)"/>
      
      <!-- Main pin shape with brand green -->
      <path d="M16 0 C7 0 0 7 0 16 C0 24 16 40 16 40 S32 24 32 16 C32 7 25 0 16 0 Z" 
            fill="#1a4d3c" stroke="#ff6b35" stroke-width="2"/>
      
      <!-- Bus stop icon -->
      <g transform="translate(8, 6)">
        <!-- Bus shelter -->
        <rect x="2" y="8" width="12" height="10" fill="#ff6b35" rx="1"/>
        <rect x="3" y="9" width="10" height="8" fill="white" opacity="0.3"/>
        
        <!-- Roof -->
        <path d="M1 8 L15 8 L14 6 L2 6 Z" fill="#ff6b35"/>
        
        <!-- Pole -->
        <rect x="1" y="6" width="1.5" height="12" fill="#ff6b35"/>
        
        <!-- Bus symbol -->
        <circle cx="8" cy="13" r="2.5" fill="white" opacity="0.8"/>
        <rect x="6.5" y="11.5" width="3" height="3" fill="#1a4d3c" rx="0.5"/>
      </g>
    </svg>
  `),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

export default function ParadasMap() {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load paradas coordinates from JSON file
    fetch("/paradas_coordinates.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load paradas data");
        return res.json();
      })
      .then((data: Parada[]) => {
        console.log(`✓ Loaded ${data.length} paradas from JSON`);
        setParadas(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("✗ Error loading paradas:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-[#f5f5f5] border-8 border-[#1a4d3c]">
        <p className="text-body text-lg text-[#2a2a2a]">Cargando mapa interactivo...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border-8 border-[#1a4d3c]">
      <MapContainer
        center={[18.4655, -66.1057]} // San Juan, Puerto Rico
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {paradas.map((parada) => (
          <Marker
            key={parada.id}
            position={[parada.lat, parada.lon]}
            icon={busStopIcon}
          >
            <Popup>
              <div style={{ padding: "8px", minWidth: "200px" }}>
                <h3 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "16px", 
                  fontWeight: "600", 
                  color: "#1a4d3c" 
                }}>
                  Parada {parada.id}
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: "14px", 
                  color: "#2a2a2a", 
                  lineHeight: "1.4" 
                }}>
                  {parada.direccion}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
