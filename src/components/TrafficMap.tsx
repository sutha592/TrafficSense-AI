import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Tirunelveli Intersection Data ────────────────────────────────────────────

export interface MapIntersection {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  congestionLevel: 'high' | 'medium' | 'low';
  vehicles: number;
  waitTime: number;
  efficiency: number;
  status: string;
}

const INTERSECTIONS: MapIntersection[] = [
  { id: 'INT001', name: 'Vannarpettai Signal',    location: 'Tirunelveli Bypass Road', lat: 8.7062, lng: 77.7536, congestionLevel: 'high',   vehicles: 2156, waitTime: 5.2, efficiency: 85, status: 'active' },
  { id: 'INT002', name: 'Tirunelveli Junction',   location: 'Railway Station',         lat: 8.7284, lng: 77.7072, congestionLevel: 'high',   vehicles: 1890, waitTime: 4.3, efficiency: 72, status: 'active' },
  { id: 'INT003', name: 'Murugankurichi Signal',  location: 'Palayamkottai',           lat: 8.7197, lng: 77.7322, congestionLevel: 'medium', vehicles: 1567, waitTime: 3.8, efficiency: 78, status: 'active' },
  { id: 'INT004', name: 'New Bus Stand',          location: 'Vaeinthaankulam',         lat: 8.7483, lng: 77.6963, congestionLevel: 'medium', vehicles: 1121, waitTime: 3.1, efficiency: 92, status: 'active' },
  { id: 'INT005', name: 'Tirunelveli Town',       location: 'Nellai Town',             lat: 8.7212, lng: 77.6998, congestionLevel: 'high',   vehicles: 1980, waitTime: 4.8, efficiency: 81, status: 'active' },
  { id: 'INT006', name: 'KTC Nagar Intersection', location: 'Madurai Highway',         lat: 8.7356, lng: 77.6825, congestionLevel: 'low',    vehicles: 987,  waitTime: 2.1, efficiency: 88, status: 'active' },
  { id: 'INT007', name: 'Thachanallur Bypass',   location: 'Madurai Road',            lat: 8.6923, lng: 77.6756, congestionLevel: 'low',    vehicles: 876,  waitTime: 1.8, efficiency: 94, status: 'active' },
  { id: 'INT008', name: 'Palayamkottai Market',  location: 'Samathanapuram',          lat: 8.7176, lng: 77.7357, congestionLevel: 'low',    vehicles: 765,  waitTime: 1.5, efficiency: 96, status: 'active' },
];

// Road connections between intersections (polylines)
const ROAD_CONNECTIONS: [string, string][] = [
  ['INT001', 'INT003'],
  ['INT003', 'INT008'],
  ['INT002', 'INT005'],
  ['INT005', 'INT006'],
  ['INT006', 'INT007'],
  ['INT004', 'INT005'],
  ['INT002', 'INT003'],
];

// ── Color helpers ─────────────────────────────────────────────────────────────

function congestionColor(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high')   return '#ef4444';
  if (level === 'medium') return '#f59e0b';
  return '#10b981';
}

function congestionBg(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high')   return '#fee2e2';
  if (level === 'medium') return '#fef3c7';
  return '#d1fae5';
}

function congestionLabel(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high')   return '🔴 High';
  if (level === 'medium') return '🟡 Medium';
  return '🟢 Low';
}

// ── Custom marker SVG ─────────────────────────────────────────────────────────

function createMarkerIcon(color: string, isSelected: boolean, isAmbulance = false) {
  const size = isSelected ? 28 : 20;
  const pulse = isAmbulance ? `<circle cx="14" cy="14" r="12" fill="${color}" opacity="0.3"><animate attributeName="r" values="10;18;10" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0;0.5" dur="1s" repeatCount="indefinite"/></circle>` : '';
  const ring = isSelected ? `<circle cx="14" cy="14" r="13" fill="none" stroke="${color}" stroke-width="3" opacity="0.6"><animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/></circle>` : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size + 8}" height="${size + 8}" viewBox="0 0 28 28">
      ${ring}
      ${pulse}
      <circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="14" cy="14" r="4" fill="white"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, (size + 8) / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

function createAmbulanceIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="#ef4444" opacity="0.25">
        <animate attributeName="r" values="12;20;12" dur="0.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0;0.4" dur="0.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="18" cy="18" r="12" fill="#ef4444" stroke="white" stroke-width="2.5"/>
      <text x="18" y="23" text-anchor="middle" font-size="14">🚑</text>
    </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18] });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TrafficMapProps {
  selectedId?: string;
  ambulanceDirection?: 'N' | 'S' | 'E' | 'W' | null;
  ambulanceDetected?: boolean;
  onSelectIntersection?: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TrafficMap({
  selectedId = 'INT001',
  ambulanceDirection,
  ambulanceDetected,
  onSelectIntersection,
}: TrafficMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);
  const ambulanceMarkerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);


  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [8.7200, 77.7100],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    // Satellite tile layer (Esri World Imagery - free, no API key needed)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    }).addTo(map);

    // Road/label overlay on top of satellite
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      opacity: 0.85,
    }).addTo(map);

    mapRef.current = map;

    // ── Regional Vehicle Simulation ──────────────────────────────────────────
    // Simulates small markers moving between connected intersections
    const activeVehicles: Array<{
      id: string;
      from: MapIntersection;
      to: MapIntersection;
      progress: number;
      speed: number;
      marker: L.CircleMarker;
    }> = [];

    const spawnVehicle = () => {
      if (activeVehicles.length > 20) return; // Increased cap for regional vehicles
      
      const conn = ROAD_CONNECTIONS[Math.floor(Math.random() * ROAD_CONNECTIONS.length)];
      const from = INTERSECTIONS.find(i => i.id === conn[0])!;
      const to   = INTERSECTIONS.find(i => i.id === conn[1])!;
      
      const marker = L.circleMarker([from.lat, from.lng], {
        radius: 4,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 1,
        fillOpacity: 0.9,
      }).addTo(map);

      activeVehicles.push({
        id: Math.random().toString(36).substring(7),
        from, to, progress: 0, 
        speed: 0.003 + Math.random() * 0.008,
        marker
      });
    };

    const moveInterval = setInterval(() => {
      if (Math.random() > 0.8) spawnVehicle();

      for (let i = activeVehicles.length - 1; i >= 0; i--) {
        const v = activeVehicles[i];
        v.progress += v.speed;

        if (v.progress >= 1) {
          v.marker.remove();
          activeVehicles.splice(i, 1);
          continue;
        }

        // Linear interpolation between Lat/Lng
        const lat = v.from.lat + (v.to.lat - v.from.lat) * v.progress;
        const lng = v.from.lng + (v.to.lng - v.from.lng) * v.progress;
        v.marker.setLatLng([lat, lng]);
      }
    }, 100);

    // ── Draw road connections (polylines) ──────────────────────────────────
    ROAD_CONNECTIONS.forEach(([fromId, toId]) => {
      const from = INTERSECTIONS.find(i => i.id === fromId)!;
      const to   = INTERSECTIONS.find(i => i.id === toId)!;
      const avgCongestion = (
        (from.congestionLevel === 'high' ? 3 : from.congestionLevel === 'medium' ? 2 : 1) +
        (to.congestionLevel   === 'high' ? 3 : to.congestionLevel   === 'medium' ? 2 : 1)
      ) / 2;
      const color = avgCongestion >= 2.5 ? '#ef4444' : avgCongestion >= 1.5 ? '#f59e0b' : '#10b981';

      // Dark border underline for visibility on satellite
      const shadow = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
        color: '#000000',
        weight: 9,
        opacity: 0.55,
      }).addTo(map);
      polylinesRef.current.push(shadow);

      // Coloured line on top
      const line = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
        color,
        weight: 5,
        opacity: 1,
        dashArray: avgCongestion >= 2.5 ? '10 6' : undefined,
      }).addTo(map);
      polylinesRef.current.push(line);
    });

    // ── Draw prediction/heatmap circles ────────────────────────────────────
    INTERSECTIONS.forEach(node => {
      const radius = node.vehicles * 8; // scale for visibility
      const circle = L.circle([node.lat, node.lng], {
        radius,
        color: congestionColor(node.congestionLevel),
        fillColor: congestionColor(node.congestionLevel),
        fillOpacity: 0.08,
        weight: 1,
        opacity: 0.3,
      }).addTo(map);
      circlesRef.current.push(circle);
    });

    // ── Place intersection markers ─────────────────────────────────────────
    INTERSECTIONS.forEach(node => {
      const isSelected = node.id === selectedId;
      const icon = createMarkerIcon(congestionColor(node.congestionLevel), isSelected);

      const marker = L.marker([node.lat, node.lng], { icon })
        .addTo(map)
        .bindPopup(buildPopupHtml(node), { maxWidth: 240, className: 'traffic-popup' });

      marker.on('click', () => {
        onSelectIntersection?.(node.id);
      });

      markersRef.current[node.id] = marker;
    });

    return () => {
      clearInterval(moveInterval);
      activeVehicles.forEach(v => v.marker.remove());
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update selected marker ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    INTERSECTIONS.forEach(node => {
      const isSelected = node.id === selectedId;
      const marker = markersRef.current[node.id];
      if (marker) {
        marker.setIcon(createMarkerIcon(congestionColor(node.congestionLevel), isSelected));
        // Update popup content
        marker.setPopupContent(buildPopupHtml(node));
      }
    });

    // Fly to selected intersection
    const selected = INTERSECTIONS.find(i => i.id === selectedId);
    if (selected) {
      mapRef.current.flyTo([selected.lat, selected.lng], 15, { animate: true, duration: 1 });
    }
  }, [selectedId]);

  // ── Ambulance marker ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old ambulance marker
    if (ambulanceMarkerRef.current) {
      ambulanceMarkerRef.current.remove();
      ambulanceMarkerRef.current = null;
    }

    if (ambulanceDetected && selectedId) {
      const selected = INTERSECTIONS.find(i => i.id === selectedId);
      if (!selected) return;

      // Offset position based on direction
      const offsets: Record<string, [number, number]> = {
        N: [0.003, 0], S: [-0.003, 0], E: [0, 0.003], W: [0, -0.003],
      };
      const [dlat, dlng] = offsets[ambulanceDirection ?? 'N'] ?? [0.003, 0];
      const ambLat = selected.lat + dlat;
      const ambLng = selected.lng + dlng;

      const ambMarker = L.marker([ambLat, ambLng], { icon: createAmbulanceIcon() })
        .addTo(mapRef.current)
        .bindPopup('<b>🚑 Ambulance Approaching</b><br/>Priority lane active — all other signals RED', { maxWidth: 200 })
        .openPopup();

      // Draw dashed route from ambulance to intersection
      const routeLine = L.polyline([[ambLat, ambLng], [selected.lat, selected.lng]], {
        color: '#ef4444',
        weight: 4,
        dashArray: '8 6',
        opacity: 0.9,
      }).addTo(mapRef.current);

      ambulanceMarkerRef.current = ambMarker;
      (ambulanceMarkerRef.current as any)._routeLine = routeLine;
    }
  }, [ambulanceDetected, ambulanceDirection, selectedId]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-700" style={{ height: 320 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 z-[1000] text-xs space-y-1">
        <p className="text-white font-semibold mb-1 text-[10px] uppercase tracking-wide">Traffic Density</p>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/><span className="text-red-300">High Congestion</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"/><span className="text-amber-300">Medium</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/><span className="text-emerald-300">Low / Clear</span></div>
      </div>

      {/* Ambulance alert badge */}
      {ambulanceDetected && (
        <div className="absolute top-3 right-3 z-[1000] bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse flex items-center gap-1.5">
          🚑 Ambulance Active — Lane {ambulanceDirection}
        </div>
      )}

      {/* Map title */}
      <div className="absolute top-3 left-3 z-[1000] bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
        <p className="text-white text-xs font-semibold">📍 Tirunelveli Traffic Map</p>
        <p className="text-slate-400 text-[10px]">Live intersection monitoring</p>
      </div>
    </div>
  );
}

// ── Popup HTML builder ────────────────────────────────────────────────────────

function buildPopupHtml(node: MapIntersection): string {
  const color = congestionColor(node.congestionLevel);
  const bg    = congestionBg(node.congestionLevel);
  const label = congestionLabel(node.congestionLevel);
  return `
    <div style="font-family:system-ui,sans-serif;min-width:200px;">
      <div style="background:${bg};border-left:4px solid ${color};padding:8px 10px;border-radius:6px 6px 0 0;">
        <p style="margin:0;font-weight:700;font-size:13px;color:#1e293b;">📍 ${node.name}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#64748b;">${node.location}</p>
      </div>
      <div style="padding:10px;background:#f8fafc;border-radius:0 0 6px 6px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <div style="text-align:center;background:white;padding:6px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
            <p style="margin:0;font-size:16px;font-weight:700;color:#1e293b;">${node.vehicles.toLocaleString()}</p>
            <p style="margin:0;font-size:10px;color:#64748b;">Vehicles</p>
          </div>
          <div style="text-align:center;background:white;padding:6px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
            <p style="margin:0;font-size:16px;font-weight:700;color:#1e293b;">${node.waitTime}m</p>
            <p style="margin:0;font-size:10px;color:#64748b;">Wait Time</p>
          </div>
          <div style="text-align:center;background:white;padding:6px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
            <p style="margin:0;font-size:16px;font-weight:700;color:#10b981;">${node.efficiency}%</p>
            <p style="margin:0;font-size:10px;color:#64748b;">Efficiency</p>
          </div>
          <div style="text-align:center;background:white;padding:6px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
            <p style="margin:0;font-size:13px;font-weight:600;">${label}</p>
            <p style="margin:0;font-size:10px;color:#64748b;">Congestion</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:11px;color:#64748b;">Status</span>
          <span style="font-size:11px;font-weight:600;color:${node.status === 'active' ? '#10b981' : '#f59e0b'};">● ${node.status.toUpperCase()}</span>
        </div>
      </div>
    </div>`;
}
