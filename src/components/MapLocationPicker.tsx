import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { MapPin, Save } from 'lucide-react';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapLocationPickerProps {
  latitude: string;
  longitude: string;
  onSave: (lat: string, lng: string) => void;
  disabled?: boolean;
}

const DEFAULT_LAT = -6.2088;
const DEFAULT_LNG = 106.8456;

const MapLocationPicker = ({ latitude, longitude, onSave, disabled }: MapLocationPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [pickedLat, setPickedLat] = useState(latitude || '');
  const [pickedLng, setPickedLng] = useState(longitude || '');
  const [mapReady, setMapReady] = useState(false);

  const initLat = latitude ? parseFloat(latitude) : DEFAULT_LAT;
  const initLng = longitude ? parseFloat(longitude) : DEFAULT_LNG;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [initLat, initLng],
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initLat, initLng], { draggable: !disabled }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setPickedLat(pos.lat.toFixed(6));
      setPickedLng(pos.lng.toFixed(6));
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      marker.setLatLng(e.latlng);
      setPickedLat(e.latlng.lat.toFixed(6));
      setPickedLng(e.latlng.lng.toFixed(6));
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    setMapReady(true);

    // Set initial picked values
    if (latitude && longitude) {
      setPickedLat(parseFloat(latitude).toFixed(6));
      setPickedLng(parseFloat(longitude).toFixed(6));
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    if (pickedLat && pickedLng) {
      onSave(pickedLat, pickedLng);
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={mapRef}
        className="w-full h-[300px] rounded-lg border border-border overflow-hidden"
        style={{ zIndex: 0 }}
      />
      <p className="text-xs text-muted-foreground">
        Klik pada peta atau geser pin untuk menentukan titik lokasi, lalu klik "Simpan Lokasi".
      </p>
      {pickedLat && pickedLng && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{pickedLat}, {pickedLng}</span>
          <a
            href={`https://www.google.com/maps?q=${pickedLat},${pickedLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline ml-1"
          >
            Lihat di Google Maps
          </a>
        </div>
      )}
      {!disabled && (
        <Button
          type="button"
          onClick={handleSave}
          disabled={!pickedLat || !pickedLng}
          className="w-full"
          size="sm"
        >
          <Save className="mr-2 h-4 w-4" />
          Simpan Lokasi
        </Button>
      )}
    </div>
  );
};

export default MapLocationPicker;
