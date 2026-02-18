import { MapView } from "@/components/Map";
import { useEffect, useState } from "react";

interface Parada {
  id: string;
  direccion: string;
  lat: number;
  lon: number;
}

const BUS_STOP_ICON_URL = "https://private-us-east-1.manuscdn.com/sessionFile/hr87zNdaugqIp849vTw9bz/sandbox/DE9wvPQs2HxKSYsREV2KvP_1771445633299_na1fn_YnVzLXN0b3AtaWNvbg.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvaHI4N3pOZGF1Z3FJcDg0OXZUdzliei9zYW5kYm94L0RFOXd2UFFzMkh4S1NZc1JFVjJLdlBfMTc3MTQ0NTYzMzI5OV9uYTFmbl9ZblZ6LXN0b3AtaWNvbg.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvaHI4N3pOZGF1Z3FJcDg0OXZUdzliei9zYW5kYm94L0RFOXd2UFFzMkh4S1NZc1JFVjJLdlBfMTc3MTQ0NTYzMzI5OV9uYTFmbl9ZblZ6TFhOMGIzQXRhV052YmcucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=qhG-tK8DUWwHuBYyOp0DekPv0gp-ee35DcwjXnGDXLaJcYyNiq6OaLCSU~4LOR~2TYA~KsEq1I155XONiztXhy86PdaLUEJIgjIgb3t0IgsQivMkE3dbbwv~eB~inqqJ1g91EY~71XWr0hnZr5TMG-eJwnWKdALAYHveh7g7DNUDAJZvbhnhrHwZLtCH6inMWe0Q8Z9ra27m1A7SjlLZsNChoBS0uGz7LQJjT9jJKpQ-wKuvGFWbvUWZ2DoZlKlCrCpqLxdpnZOS2YRBo48oJn~AQHUmkn9PkRG1DQ1PHng3WP~C~xABPMLLVnXB0N3UW8jAFyxklAieEjqbI05YUg__";

export default function ParadasMap() {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load paradas coordinates from JSON file
    fetch("/paradas_coordinates.json")
      .then((res) => res.json())
      .then((data) => {
        setParadas(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading paradas:", err);
        setError("Error cargando ubicaciones de paradas");
        setLoading(false);
      });
  }, []);

  const handleMapReady = (map: google.maps.Map) => {
    if (paradas.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    const infoWindow = new google.maps.InfoWindow();

    // Create markers for each parada
    paradas.forEach((parada) => {
      const position = { lat: parada.lat, lng: parada.lon };
      
      const marker = new google.maps.Marker({
        position,
        map,
        title: `Parada ${parada.id}`,
        icon: {
          url: BUS_STOP_ICON_URL,
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40),
        },
      });

      // Add click listener to show info window
      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a4d3c;">
              Parada ${parada.id}
            </h3>
            <p style="margin: 0; font-size: 14px; color: #2a2a2a;">
              ${parada.direccion}
            </p>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      bounds.extend(position);
    });

    // Fit map to show all markers
    map.fitBounds(bounds);
    
    // Set a reasonable max zoom level
    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      if (map.getZoom()! > 15) {
        map.setZoom(15);
      }
    });
  };

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-[#f5f5f5]">
        <p className="text-body text-lg text-[#2a2a2a]">Cargando mapa...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-[#f5f5f5]">
        <p className="text-body text-lg text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border-8 border-[#1a4d3c]">
      <MapView
        onMapReady={handleMapReady}
        initialCenter={{ lat: 18.4655, lng: -66.1057 }} // San Juan, Puerto Rico
        initialZoom={12}
      />
    </div>
  );
}
