import { useState, useEffect, useCallback, useRef } from 'react';
import type { SystemStatus, TrafficLight, CameraFeed, Vehicle, UserProfile, Notification } from '@/types';
import { intersections, generateHourlyTrafficData, generateDetections, defaultUserProfile, defaultNotifications } from '@/data/indianTrafficData';

export const useSystemStatus = () => {
  const [status, setStatus] = useState<SystemStatus>({ cpu: 26, memory: 85, network: 1 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => ({
        cpu: Math.max(15, Math.min(45, prev.cpu + (Math.random() - 0.5) * 5)),
        memory: Math.max(75, Math.min(95, prev.memory + (Math.random() - 0.5) * 3)),
        network: Math.max(0, Math.min(5, prev.network + (Math.random() - 0.5) * 1)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return status;
};

export const useTrafficMetrics = () => {
  const [metrics, setMetrics] = useState({
    systemHealth: 94.9, weatherCondition: 25.1, aiResponseTime: 35.8,
    currentFlow: 145.9, avgWaitTime: 1.9, totalVehicleCount: 45231, congestionIndex: 68,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        systemHealth: Math.max(90, Math.min(99, prev.systemHealth + (Math.random() - 0.5) * 0.5)),
        weatherCondition: Math.max(20, Math.min(35, prev.weatherCondition + (Math.random() - 0.5) * 0.3)),
        aiResponseTime: Math.max(25, Math.min(45, prev.aiResponseTime + (Math.random() - 0.5) * 2)),
        currentFlow: Math.max(100, Math.min(200, prev.currentFlow + (Math.random() - 0.5) * 10)),
        avgWaitTime: Math.max(1, Math.min(5, prev.avgWaitTime + (Math.random() - 0.5) * 0.2)),
        totalVehicleCount: prev.totalVehicleCount + Math.floor(Math.random() * 50 - 20),
        congestionIndex: Math.max(40, Math.min(90, prev.congestionIndex + (Math.random() - 0.5) * 3)),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return metrics;
};

export const useTrafficLights = () => {
  const [lights, setLights] = useState<TrafficLight[]>([
    { direction: 'N', state: 'green', timer: 45 },
    { direction: 'S', state: 'green', timer: 45 },
    { direction: 'E', state: 'red', timer: 45 },
    { direction: 'W', state: 'red', timer: 45 },
  ]);
  const [activePhase, setActivePhase] = useState<'NS' | 'EW'>('NS');
  const [isAuto, setIsAuto] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [ambulanceDetected, setAmbulanceDetected] = useState(false);
  const [ambulanceDirection, setAmbulanceDirection] = useState<'N' | 'S' | 'E' | 'W' | null>(null);
  const [vehicleCounts, setVehicleCounts] = useState({ N: 0, S: 0, E: 0, W: 0 });

  const activePhaseRef = useRef(activePhase);
  activePhaseRef.current = activePhase;

  useEffect(() => {
    if (!isAuto || emergencyMode) return;

    const interval = setInterval(() => {
      setLights(prev => {
        const phase = activePhaseRef.current;
        let switchPhase = false;

        const newLights = prev.map(light => {
          const isActive = (phase === 'NS' && (light.direction === 'N' || light.direction === 'S')) ||
            (phase === 'EW' && (light.direction === 'E' || light.direction === 'W'));

          if (isActive) {
            const newTimer = light.timer - 1;
            if (newTimer <= 0 && light.state === 'green') return { ...light, state: 'yellow' as const, timer: 4 };
            if (newTimer <= 0 && light.state === 'yellow') { switchPhase = true; return { ...light, state: 'red' as const, timer: 45 }; }
            return { ...light, timer: newTimer };
          }
          return light;
        });

        if (switchPhase) {
          const nextPhase = phase === 'NS' ? 'EW' : 'NS';
          setActivePhase(nextPhase);
          return newLights.map(light => {
            const willBeActive = (nextPhase === 'NS' && (light.direction === 'N' || light.direction === 'S')) ||
              (nextPhase === 'EW' && (light.direction === 'E' || light.direction === 'W'));
            if (willBeActive) return { ...light, state: 'green' as const, timer: 45 };
            return light;
          });
        }

        return newLights;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuto, emergencyMode]);

  const smartOptimize = useCallback((counts: { N: number; S: number; E: number; W: number }) => {
    if (!isAuto || emergencyMode || ambulanceDetected) return;
    setVehicleCounts(counts);

    const nsCount = counts.N + counts.S;
    const ewCount = counts.E + counts.W;
    const phase = activePhaseRef.current;
    const threshold = 3; // Reduced threshold for more responsive switching

    if (nsCount > ewCount + threshold && phase !== 'NS') {
      setActivePhase('NS');
      // Green time proportional to vehicle count (more vehicles = longer green)
      const greenTime = Math.max(30, Math.min(90, nsCount * 5));
      setLights([
        { direction: 'N', state: 'green', timer: greenTime },
        { direction: 'S', state: 'green', timer: greenTime },
        { direction: 'E', state: 'red', timer: greenTime + 5 },
        { direction: 'W', state: 'red', timer: greenTime + 5 },
      ]);
    } else if (ewCount > nsCount + threshold && phase !== 'EW') {
      setActivePhase('EW');
      const greenTime = Math.max(30, Math.min(90, ewCount * 5));
      setLights([
        { direction: 'N', state: 'red', timer: greenTime + 5 },
        { direction: 'S', state: 'red', timer: greenTime + 5 },
        { direction: 'E', state: 'green', timer: greenTime },
        { direction: 'W', state: 'green', timer: greenTime },
      ]);
    }
  }, [isAuto, emergencyMode, ambulanceDetected]);

  const triggerAmbulancePriority = useCallback((direction: 'N' | 'S' | 'E' | 'W') => {
    setAmbulanceDetected(true);
    setAmbulanceDirection(direction);
    setIsAuto(false);
    // Ambulance direction → GREEN (60s), ALL others → RED (60s timer so vehicles stop)
    setLights([
      { direction: 'N', state: direction === 'N' ? 'green' : 'red', timer: 60 },
      { direction: 'S', state: direction === 'S' ? 'green' : 'red', timer: 60 },
      { direction: 'E', state: direction === 'E' ? 'green' : 'red', timer: 60 },
      { direction: 'W', state: direction === 'W' ? 'green' : 'red', timer: 60 },
    ]);
    setActivePhase(direction === 'N' || direction === 'S' ? 'NS' : 'EW');
    setTimeout(() => {
      setAmbulanceDetected(false);
      setAmbulanceDirection(null);
      setIsAuto(true);
      setActivePhase('NS');
      setLights([
        { direction: 'N', state: 'green', timer: 45 },
        { direction: 'S', state: 'green', timer: 45 },
        { direction: 'E', state: 'red', timer: 45 },
        { direction: 'W', state: 'red', timer: 45 },
      ]);
    }, 62000);
  }, []);

  const extendGreenTime = useCallback((seconds: number) => {
    const phase = activePhaseRef.current;
    setLights(prev => prev.map(light => {
      const isActive = (phase === 'NS' && (light.direction === 'N' || light.direction === 'S')) ||
        (phase === 'EW' && (light.direction === 'E' || light.direction === 'W'));
      if (isActive && light.state === 'green') return { ...light, timer: light.timer + seconds };
      return light;
    }));
  }, []);

  const emergencyOverride = useCallback(() => {
    setEmergencyMode(true);
    setIsAuto(false);
    setAmbulanceDetected(false);
    setLights(prev => prev.map(l => ({ ...l, state: 'red' as const, timer: 0 })));
  }, []);

  const resetToAuto = useCallback(() => {
    setEmergencyMode(false);
    setAmbulanceDetected(false);
    setAmbulanceDirection(null);
    setIsAuto(true);
    setActivePhase('NS');
    setLights([
      { direction: 'N', state: 'green', timer: 45 },
      { direction: 'S', state: 'green', timer: 45 },
      { direction: 'E', state: 'red', timer: 45 },
      { direction: 'W', state: 'red', timer: 45 },
    ]);
  }, []);

  const manualControl = useCallback((direction: 'N' | 'S' | 'E' | 'W') => {
    setIsAuto(false);
    setEmergencyMode(false);
    setLights(prev => prev.map(light => ({
      ...light,
      state: light.direction === direction ? 'green' : 'red' as const,
      timer: light.direction === direction ? 30 : 0,
    })));
    setActivePhase(direction === 'N' || direction === 'S' ? 'NS' : 'EW');
  }, []);

  const prioritizeAmbulance = useCallback((direction: 'N' | 'S' | 'E' | 'W') => {
    triggerAmbulancePriority(direction);
  }, [triggerAmbulancePriority]);

  return {
    lights, activePhase, isAuto, emergencyMode,
    ambulanceDetected, ambulanceDirection, vehicleCounts,
    extendGreenTime, emergencyOverride, resetToAuto, manualControl,
    prioritizeAmbulance, smartOptimize, triggerAmbulancePriority, setIsAuto,
  };
};

function generateVehiclesEnhanced(count = 15): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const types: Array<'car' | 'bus' | 'truck' | 'bike'> =
    ['car', 'car', 'car', 'car', 'bike', 'bike', 'bus', 'truck'];

  const dirConfigs = {
    N: { xBase: 48, yRange: [65, 95] },
    S: { xBase: 52, yRange: [5, 35] },
    E: { xRange: [5, 35], yBase: 48 },
    W: { xRange: [65, 95], yBase: 52 },
  };

  const dirs: Array<'N' | 'S' | 'E' | 'W'> = ['N', 'N', 'N', 'S', 'S', 'E', 'E', 'E', 'W', 'W', 'N', 'S', 'E', 'W', 'N'];

  for (let i = 0; i < count; i++) {
    const direction = dirs[i % dirs.length];
    let x = 50, y = 50;

    if (direction === 'N') {
      x = 46 + Math.random() * 4;
      y = dirConfigs.N.yRange[0] + Math.random() * (dirConfigs.N.yRange[1] - dirConfigs.N.yRange[0]);
    } else if (direction === 'S') {
      x = 50 + Math.random() * 4;
      y = dirConfigs.S.yRange[0] + Math.random() * (dirConfigs.S.yRange[1] - dirConfigs.S.yRange[0]);
    } else if (direction === 'E') {
      x = (dirConfigs.E.xRange as number[])[0] + Math.random() * ((dirConfigs.E.xRange as number[])[1] - (dirConfigs.E.xRange as number[])[0]);
      y = 46 + Math.random() * 4;
    } else {
      x = (dirConfigs.W.xRange as number[])[0] + Math.random() * ((dirConfigs.W.xRange as number[])[1] - (dirConfigs.W.xRange as number[])[0]);
      y = 50 + Math.random() * 4;
    }

    vehicles.push({
      id: `veh-${i}-${Math.random().toString(36).slice(2)}`,
      type: types[Math.floor(Math.random() * types.length)],
      x, y, direction,
      speed: 0.12 + Math.random() * 0.15, // Slow speed
      detected: true,
      confidence: 0.7 + Math.random() * 0.3,
    });
  }
  return vehicles;
}

export const useVehicles = (
  lights: TrafficLight[],
  onAmbulanceDetected?: (dir: 'N' | 'S' | 'E' | 'W') => void,
  onCountsUpdate?: (counts: { N: number; S: number; E: number; W: number }) => void,
  intersectionId?: string,
) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => generateVehiclesEnhanced());
  const ambulanceNotifiedRef = useRef(false);
  const lastAmbulanceSpawnRef = useRef<number>(Date.now() - 65000); // Allow spawn very quickly at start
  const tickRef = useRef(0);
  const lightsRef = useRef(lights);
  lightsRef.current = lights;

  // Force spawn first ambulance immediately on mount
  useEffect(() => {
    const dirs: Array<'N' | 'S' | 'E' | 'W'> = ['N', 'S', 'E', 'W'];
    const direction = dirs[Math.floor(Math.random() * dirs.length)];
    let x = 50, y = 50;
    if (direction === 'N') { x = 47; y = 95; }
    else if (direction === 'S') { x = 53; y = 5; }
    else if (direction === 'E') { x = 5; y = 47; }
    else { x = 95; y = 53; }
    const amb: Vehicle = {
      id: `amb-init-${Date.now()}`,
      type: 'ambulance', x, y, direction,
      speed: 0.3, detected: true, confidence: 0.99
    };
    setVehicles(prev => [...prev, amb]);
    lastAmbulanceSpawnRef.current = Date.now();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset vehicles when city/intersection changes
  useEffect(() => {
    ambulanceNotifiedRef.current = false;
    setVehicles(generateVehiclesEnhanced());
  }, [intersectionId]);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      const currentLights = lightsRef.current;

      setVehicles(prev => {
        // ── STOP LINES (% from top-left) ────────────────────────────────────
        // N-direction (going up): stop at y=64 (just above intersection)
        // S-direction (going down): stop at y=36
        // E-direction (going right): stop at x=36
        // W-direction (going left): stop at x=64
        const STOP = { N: 64, S: 36, E: 36, W: 64 };
        const MIN_GAP = 7; // % minimum spacing between vehicles in same lane

        // Sort vehicles per lane so we process front vehicle first
        const sorted = [...prev].sort((a, b) => {
          if (a.direction !== b.direction) return 0;
          // For N: front = smallest y (nearest top). For S: front = largest y. Same for E/W
          switch (a.direction) {
            case 'N': return a.y - b.y;
            case 'S': return b.y - a.y;
            case 'E': return b.x - a.x;
            case 'W': return a.x - b.x;
            default: return 0;
          }
        });

        const updated = sorted.map((vehicle, idx) => {
          const light = currentLights.find(l => l.direction === vehicle.direction);
          const isAmbulance = vehicle.type === 'ambulance';
          const greenOrYellow = light?.state === 'green' || light?.state === 'yellow';
          const canMove = isAmbulance || greenOrYellow;
          const speed = isAmbulance ? vehicle.speed * 2.5 : vehicle.speed;

          let newX = vehicle.x;
          let newY = vehicle.y;
          let remove = false;

          // Find the vehicle directly ahead in the same lane
          const ahead = sorted.slice(0, idx).filter(v => v.direction === vehicle.direction);
          const frontVehicle = ahead[ahead.length - 1]; // the closest one ahead

          // Compute the effective stop position:
          // either the stop line OR the vehicle ahead minus MIN_GAP
          const stopN = frontVehicle ? Math.max(STOP.N, frontVehicle.y + MIN_GAP)   : STOP.N;
          const stopS = frontVehicle ? Math.min(STOP.S, frontVehicle.y - MIN_GAP)   : STOP.S;
          const stopE = frontVehicle ? Math.min(STOP.E, frontVehicle.x - MIN_GAP)   : STOP.E;
          const stopW = frontVehicle ? Math.max(STOP.W, frontVehicle.x + MIN_GAP)  : STOP.W;

          if (canMove) {
            switch (vehicle.direction) {
              case 'N':
                newY = vehicle.y - speed;
                if (newY < -5) { remove = true; }
                break;
              case 'S':
                newY = vehicle.y + speed;
                if (newY > 105) { remove = true; }
                break;
              case 'E':
                newX = vehicle.x + speed;
                if (newX > 105) { remove = true; }
                break;
              case 'W':
                newX = vehicle.x - speed;
                if (newX < -5) { remove = true; }
                break;
            }
          } else {
            // On RED: creep slowly toward stop line, then hard-stop
            switch (vehicle.direction) {
              case 'N': if (vehicle.y > stopN) { newY = Math.max(vehicle.y - speed * 0.5, stopN); } break;
              case 'S': if (vehicle.y < stopS) { newY = Math.min(vehicle.y + speed * 0.5, stopS); } break;
              case 'E': if (vehicle.x < stopE) { newX = Math.min(vehicle.x + speed * 0.5, stopE); } break;
              case 'W': if (vehicle.x > stopW) { newX = Math.max(vehicle.x - speed * 0.5, stopW); } break;
            }
          }

          return { ...vehicle, x: newX, y: newY, _remove: remove };
        })
        .filter(v => !(v as any)._remove);

        // Ambulance detection — trigger immediately when ambulance enters
        const ambulance = updated.find(v => v.type === 'ambulance');
        if (ambulance && !ambulanceNotifiedRef.current && onAmbulanceDetected) {
          ambulanceNotifiedRef.current = true;
          onAmbulanceDetected(ambulance.direction as 'N' | 'S' | 'E' | 'W');
        }
        // Reset notification flag when ambulance has exited the scene
        if (!ambulance && ambulanceNotifiedRef.current) {
          ambulanceNotifiedRef.current = false;
        }

        // Update counts every 3 ticks
        if (tickRef.current % 3 === 0 && onCountsUpdate) {
          const counts = { N: 0, S: 0, E: 0, W: 0 };
          updated.forEach(v => { counts[v.direction]++; });
          onCountsUpdate(counts);
        }

        return updated;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [onAmbulanceDetected, onCountsUpdate]);

  // Dynamic vehicle spawning
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(prev => {
        let updated = [...prev];
        
        // Spawn standard vehicles
        if (updated.length < 22 && Math.random() > 0.35) {
          updated = [...updated, ...generateVehiclesEnhanced(1)];
        }
        if (updated.length > 25 && Math.random() > 0.5) {
          updated = updated.slice(1);
        }

        // Strict Ambulance 60-second cooldown spawner
        const hasAmbulance = updated.some(v => v.type === 'ambulance');
        const timeSinceLastSpawn = Date.now() - lastAmbulanceSpawnRef.current;
        
        if (!hasAmbulance && timeSinceLastSpawn >= 60000) {
          if (Math.random() > 0.4) { // 60% chance every 3.5s to spawn after cooldown - more frequent
            const dirs: Array<'N' | 'S' | 'E' | 'W'> = ['N', 'S', 'E', 'W'];
            const direction = dirs[Math.floor(Math.random() * dirs.length)];
            const dirConfigs = {
              N: { xBase: 48, y: 95 },
              S: { xBase: 52, y: 5 },
              E: { x: 5, yBase: 48 },
              W: { x: 95, yBase: 52 },
            };
            
            let x = 50, y = 50;
            if (direction === 'N') { x = 46 + Math.random() * 4; y = dirConfigs.N.y; }
            else if (direction === 'S') { x = 50 + Math.random() * 4; y = dirConfigs.S.y; }
            else if (direction === 'E') { x = dirConfigs.E.x; y = 46 + Math.random() * 4; }
            else { x = dirConfigs.W.x; y = 50 + Math.random() * 4; }

            const newAmbulance: Vehicle = {
              id: `amb-${Math.random().toString(36).slice(2)}`,
              type: 'ambulance',
              x, y, direction,
              speed: 0.25 + Math.random() * 0.1, // Faster than normal cars
              detected: true, confidence: 0.99
            };
            
            updated.push(newAmbulance);
            lastAmbulanceSpawnRef.current = Date.now();
          }
        }
        
        return updated;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return vehicles;
};

// ── Pedestrian zebra-crossing hook ────────────────────────────────────────────

export interface Pedestrian {
  id: string;
  x: number;
  y: number;
  axis: 'H' | 'V'; // H = walks left-right, V = walks top-bottom
  lane: 'top' | 'bottom' | 'left' | 'right'; // which zebra crossing
  direction: 1 | -1; // +1 or -1 movement
  speed: number;
}

function spawnPedestrian(): Pedestrian {
  const lanes = ['top', 'bottom', 'left', 'right'] as const;
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const axis = (lane === 'left' || lane === 'right') ? 'V' : 'H';
  const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
  // Zebra positions: top≈37%, bottom≈63%, left≈37%, right≈63% of the intersection center
  const topY = 37, bottomY = 63, leftX = 37, rightX = 63;
  let x = 50, y = 50;
  if (lane === 'top')    { y = topY;    x = direction === 1 ? 36 : 64; }
  if (lane === 'bottom') { y = bottomY; x = direction === 1 ? 36 : 64; }
  if (lane === 'left')   { x = leftX;   y = direction === 1 ? 36 : 64; }
  if (lane === 'right')  { x = rightX;  y = direction === 1 ? 36 : 64; }
  return {
    id: `ped-${Math.random().toString(36).slice(2)}`,
    x, y, axis, lane, direction,
    speed: 0.06 + Math.random() * 0.04,
  };
}

export const usePedestrians = (lights: TrafficLight[]) => {
  const [pedestrians, setPedestrians] = useState<Pedestrian[]>([]);
  const lightsRef = useRef(lights);
  lightsRef.current = lights;

  // Spawn pedestrians only on RED (stopped traffic)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLights = lightsRef.current;
      const nsRed = currentLights.find(l => l.direction === 'N')?.state === 'red';
      const ewRed = currentLights.find(l => l.direction === 'E')?.state === 'red';

      setPedestrians(prev => {
        // Move existing pedestrians
        let updated = prev.map(p => {
          let newX = p.x;
          let newY = p.y;
          if (p.axis === 'H') newX += p.direction * p.speed * 6;
          else               newY += p.direction * p.speed * 6;
          return { ...p, x: newX, y: newY };
        }).filter(p => p.x > 28 && p.x < 72 && p.y > 28 && p.y < 72);

        // Spawn new pedestrians on red lights
        if (prev.length < 4) {
          if ((nsRed) && Math.random() > 0.5) {
            // EW roads are green, NS is red, so pedestrians cross EW-facing zebras (top/bottom)
            const lane = Math.random() > 0.5 ? 'top' : 'bottom';
            const p = spawnPedestrian();
            updated.push({ ...p, lane, axis: 'H',
              y: lane === 'top' ? 37 : 63,
              x: p.direction === 1 ? 36 : 64,
            });
          }
          if ((ewRed) && Math.random() > 0.5) {
            // NS roads are green, EW is red, so pedestrians cross NS-facing zebras (left/right)
            const lane = Math.random() > 0.5 ? 'left' : 'right';
            const p = spawnPedestrian();
            updated.push({ ...p, lane, axis: 'V',
              x: lane === 'left' ? 37 : 63,
              y: p.direction === 1 ? 36 : 64,
            });
          }
        }
        return updated;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return pedestrians;
};

export const useCameraFeed = (intersectionId: string) => {
  const [feed, setFeed] = useState<CameraFeed>({
    id: intersectionId, name: 'Camera Feed',
    location: intersections.find(i => i.id === intersectionId)?.location || '',
    isLive: true, vehiclesDetected: 22, fps: 10.5, device: 'YOLOv8',
    detections: generateDetections(),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setFeed(prev => ({
        ...prev,
        vehiclesDetected: Math.max(5, Math.min(50, prev.vehiclesDetected + Math.floor(Math.random() * 6 - 3))),
        fps: Math.max(8, Math.min(15, prev.fps + (Math.random() - 0.5) * 0.5)),
        detections: generateDetections(),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return feed;
};

export const useAnalyticsData = (range: string = 'Last Hour') => {
  const [data, setData] = useState(generateHourlyTrafficData(range));
  
  // Calculate summary metrics based on the data points
  const currentVolume = data.reduce((acc, curr) => acc + curr.volume, 0);
  const avgCongestion = Math.round(data.reduce((acc, curr) => acc + curr.congestion, 0) / data.length);

  useEffect(() => {
    setData(generateHourlyTrafficData(range));
  }, [range]);

  return { 
    data, 
    currentVolume: range.includes('Week') || range.includes('Month') ? currentVolume : data[data.length - 1]?.volume || 0,
    congestion: avgCongestion 
  };
};

export const useCurrentTime = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return time;
};

export const usePredictiveAnalytics = () => {
  const [predictions, setPredictions] = useState({
    morningRush: { probability: 94, peakTime: '07:30', status: 'High volume expected' },
    eveningRush: { probability: 91, peakTime: '18:00', status: 'High volume expected' },
  });
  useEffect(() => {
    const interval = setInterval(() => {
      setPredictions(prev => ({
        morningRush: { ...prev.morningRush, probability: Math.max(85, Math.min(98, prev.morningRush.probability + Math.floor(Math.random() * 4 - 2))) },
        eveningRush: { ...prev.eveningRush, probability: Math.max(85, Math.min(95, prev.eveningRush.probability + Math.floor(Math.random() * 4 - 2))) },
      }));
    }, 8000);
    return () => clearInterval(interval);
  }, []);
  return predictions;
};

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);
  return { profile, updateProfile };
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(defaultNotifications);
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    setNotifications(prev => [{ ...notification, id: Date.now().toString(), timestamp: new Date() }, ...prev]);
  }, []);
  const unreadCount = notifications.filter(n => !n.read).length;
  return { notifications, unreadCount, markAsRead, markAllAsRead, addNotification };
};
