import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Hand, 
  RotateCcw, 
  Maximize2,
  Car,
  Check,
  MapPin,
  Download,
  Ambulance,
  Bike,
  User,
  Truck,
  Bus,
  Camera,
  BarChart3,
  History,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useTrafficLights, useVehicles, usePedestrians } from '@/hooks/useRealtimeData';
import { intersections } from '@/data/indianTrafficData';
import { cn } from '@/lib/utils';

// ── YOLOv8 + ONNX Runtime Web ──────────────────────────────────────────────────
import * as ort from 'onnxruntime-web';
import { preprocessImage, processYoloOutput } from '@/utils/yoloUtils';
// --------------------------------------------------------------------------

/** Map YOLO class names → our traffic categories */
const yoloToTrafficLabel: Record<string, keyof typeof LABEL_COLORS> = {
  car:        'car',
  bus:        'bus',
  truck:      'truck',
  motorcycle: 'bike',
  bicycle:    'bike',
  person:     'person',
};

const LABEL_COLORS = {
  car:       '#3b82f6',
  bus:       '#8b5cf6',
  truck:     '#f59e0b',
  bike:      '#10b981',
  person:    '#ec4899',
  ambulance: '#ef4444',
  other:     '#6b7280',
} as const;

// ── TrafficLight sub-component ────────────────────────────────────────────────

interface TrafficLightProps {
  direction: 'N' | 'S' | 'E' | 'W';
  state: 'red' | 'yellow' | 'green';
  timer: number;
}

function TrafficLight({ direction, state, timer }: TrafficLightProps) {
  const position = {
    N: 'bottom-4 left-1/2 -translate-x-1/2',
    S: 'top-4 left-1/2 -translate-x-1/2',
    E: 'left-4 top-1/2 -translate-y-1/2',
    W: 'right-4 top-1/2 -translate-y-1/2',
  };

  return (
    <div className={cn('absolute flex flex-col items-center gap-1', position[direction])}>
      <div className="bg-slate-800 rounded-lg p-2 flex flex-col gap-1 shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-slate-700">
        <div className={cn('w-4 h-4 rounded-full transition-all duration-300', state === 'red'    ? 'bg-red-500 shadow-[0_0_12px_#ef4444]'     : 'bg-slate-700/50')} />
        <div className={cn('w-4 h-4 rounded-full transition-all duration-300', state === 'yellow' ? 'bg-yellow-500 shadow-[0_0_12px_#eab308]'  : 'bg-slate-700/50')} />
        <div className={cn('w-4 h-4 rounded-full transition-all duration-300', state === 'green'  ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-slate-700/50')} />
      </div>
      <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{timer}s</span>
    </div>
  );
}

// ── VehicleIcon sub-component ─────────────────────────────────────────────────

interface VehicleIconProps { type: string; className?: string; }

function VehicleIcon({ type, className }: VehicleIconProps) {
  switch (type) {
    case 'car':       return <Car       className={className} />;
    case 'bus':       return <Bus       className={className} />;
    case 'truck':     return <Truck     className={className} />;
    case 'bike':      return <Bike      className={className} />;
    case 'person':    return <User      className={className} />;
    case 'ambulance': return <Ambulance className={className} />;
    default:          return <Car       className={className} />;
  }
}

// ── State map ─────────────────────────────────────────────────────────────────

const intersectionStates: Record<string, string> = {
  INT001: 'Tirunelveli Bypass',
  INT002: 'Railway Station Zone',
  INT003: 'Palayamkottai Hub',
  INT004: 'Vaeinthaankulam Zone',
  INT005: 'Nellai Town Zone',
  INT006: 'Old Bus Stand Zone',
  INT007: 'Madurai Highway',
  INT008: 'Tirunelveli Bypass',
};

// ── Main Component ────────────────────────────────────────────────────────────

export function Monitoring() {
  const [selectedIntersection, setSelectedIntersection] = useState('INT001');
  const {
    lights, activePhase, isAuto, emergencyMode,
    extendGreenTime, emergencyOverride, resetToAuto, manualControl, prioritizeAmbulance,
    ambulanceDetected, ambulanceDirection, smartOptimize, triggerAmbulancePriority, vehicleCounts
  } = useTrafficLights();
  
  const handleAmbulanceDetected = useCallback((dir: 'N' | 'S' | 'E' | 'W') => {
    triggerAmbulancePriority(dir);
  }, [triggerAmbulancePriority]);

  const handleCountsUpdate = useCallback((counts: { N: number; S: number; E: number; W: number }) => {
    smartOptimize(counts);
  }, [smartOptimize]);

  const vehicles = useVehicles(lights, handleAmbulanceDetected, handleCountsUpdate, selectedIntersection);
  const pedestrians = usePedestrians(lights);
  const intersection = intersections.find(i => i.id === selectedIntersection);
  const [activeTab, setActiveTab] = useState<'Live' | 'Stats' | 'History'>('Live');

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; action: string; title: string; message: string;
  }>({ open: false, action: '', title: '', message: '' });

  const [manualDirection, setManualDirection] = useState<'N' | 'S' | 'E' | 'W'>('N');
  const [lastAction, setLastAction] = useState<string>('');

  // ── Camera & Detection State ──────────────────────────────────────────────

  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef     = useRef<any>(null);          // holds loaded ONNX model
  const animFrameRef = useRef<number>(0);          // requestAnimationFrame handle
  const detectingRef = useRef(false);              // prevent overlapping detect calls

  const [cameraActive,  setCameraActive]  = useState(false);
  const [modelLoading,  setModelLoading]  = useState(false);
  const [modelReady,    setModelReady]    = useState(false);
  const [detectionCounts, setDetectionCounts] = useState({
    car: 0, bus: 0, truck: 0, bike: 0, person: 0, ambulance: 0, other: 0,
  });
  const [fps, setFps] = useState(0);

  // ── Load YOLOv8 ONNX model (once) ─────────────────────────────────────────

  const loadModel = useCallback(async () => {
    if (modelRef.current) return; // already loaded
    setModelLoading(true);
    try {
      // Use CDN for WASM to avoid vite configuration issues
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
      const session = await ort.InferenceSession.create('/yolov8n.onnx', { executionProviders: ['wasm'] });
      modelRef.current = session;
      setModelReady(true);
    } catch (err) {
      console.error('Failed to load YOLOv8 ONNX model:', err);
      alert('Model load failed. Check console for details. Ensure /yolov8n.onnx exists in the public directory.');
    } finally {
      setModelLoading(false);
    }
  }, []);

  // ── Start Camera ──────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
      await loadModel();
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Camera access denied. Please allow camera access to use this feature.');
    }
  }, [loadModel]);

  // ── Stop Camera ───────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    // Clear canvas
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setCameraActive(false);
    setDetectionCounts({ car: 0, bus: 0, truck: 0, bike: 0, person: 0, ambulance: 0, other: 0 });
    setFps(0);
  }, []);

  // ── Real-time Detection Loop ──────────────────────────────────────────────

  useEffect(() => {
    if (!cameraActive) return;

    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let frameCount = 0;

    const detect = async () => {
      if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      // Sync canvas size to video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
      }

      // Draw current video frame ALWAYS so the user isn't looking at a blank screen
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Run detection when model is ready (skip if previous call still running)
      if (modelReady && !detectingRef.current && modelRef.current) {
        detectingRef.current = true;
        try {
          // Preprocess image
          const { tensorData, scale, xPad, yPad } = preprocessImage(canvas);
          const tensor = new ort.Tensor('float32', tensorData, [1, 3, 640, 640]);

          // Run inference
          const feeds: Record<string, ort.Tensor> = {};
          feeds[modelRef.current.inputNames[0]] = tensor;
          const results = await modelRef.current.run(feeds);
          
          const outputTensor = results[modelRef.current.outputNames[0]];
          const outputData = outputTensor.data as Float32Array;

          // Postprocess
          const predictions = processYoloOutput(outputData, scale, xPad, yPad, 0.25, 0.45);

          // ── Count by traffic category ───────────────────────────────────
          const counts = { car: 0, bus: 0, truck: 0, bike: 0, person: 0, ambulance: 0, other: 0 };

          for (const pred of predictions) {
            const trafficLabel = yoloToTrafficLabel[pred.className] ?? 'other';
            counts[trafficLabel] = (counts[trafficLabel] ?? 0) + 1;

            // ── Draw bounding box ─────────────────────────────────────────
            const { x, y, w, h, prob } = pred;
            const color = LABEL_COLORS[trafficLabel];
            const label = `${trafficLabel} ${(prob * 100).toFixed(0)}%`;

            ctx.strokeStyle = color;
            ctx.lineWidth   = 2.5;
            ctx.strokeRect(x, y, w, h);

            // Label background
            ctx.font = 'bold 13px sans-serif';
            const textW = ctx.measureText(label).width + 8;
            ctx.fillStyle = color;
            ctx.fillRect(x, y > 22 ? y - 22 : y + h, textW, 22);

            // Label text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, x + 4, y > 22 ? y - 6 : y + h + 16);
          }

          setDetectionCounts(counts);
        } catch (e) {
          // Detection error – skip frame silently
          console.error("YOLOv8 Detection Error:", e);
        } finally {
          detectingRef.current = false;
        }
      }

      // ── FPS counter ─────────────────────────────────────────────────────
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime   = now;
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      detectingRef.current = false;
    };
  }, [cameraActive, modelReady]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── CSV Download ──────────────────────────────────────────────────────────

  const handleDownloadCSV = useCallback(() => {
    const csvContent = [
      ['Type', 'Count', 'Timestamp'],
      ['Car',       detectionCounts.car.toString(),       new Date().toISOString()],
      ['Bus',       detectionCounts.bus.toString(),       new Date().toISOString()],
      ['Truck',     detectionCounts.truck.toString(),     new Date().toISOString()],
      ['Bike',      detectionCounts.bike.toString(),      new Date().toISOString()],
      ['Person',    detectionCounts.person.toString(),    new Date().toISOString()],
      ['Ambulance', detectionCounts.ambulance.toString(), new Date().toISOString()],
    ].map(row => row.join(',')).join('\n');

    // Use data URI instead of Blob to guarantee filename enforcement across all browsers
    const dataUri = `data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(csvContent)}`;
    const a = document.createElement('a');
    a.href = dataUri;
    
    // Replace spaces with dashes for safety
    const safeName = intersection?.name.replace(/\s+/g, '-') ?? 'Unknown';
    a.download = `traffic-report-${safeName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // Crucial: delay removing the anchor element! 
    // Synchronous removal causes Chrome to discard the 'download' attribute and generate a UUID filename.
    setTimeout(() => {
      document.body.removeChild(a);
    }, 200);
  }, [detectionCounts, intersection]);

  // ── Control helpers ───────────────────────────────────────────────────────

  const handleActionWithConfirm = (action: string, title: string, message: string) => {
    setConfirmDialog({ open: true, action, title, message });
  };

  const executeAction = () => {
    switch (confirmDialog.action) {
      case 'emergency':
        emergencyOverride();
        setLastAction('🚨 Emergency Override activated — all lanes cleared');
        break;
      case 'ambulance':
        prioritizeAmbulance(ambulanceDirection ?? manualDirection);
        setLastAction(`🚑 Ambulance Priority → ${ambulanceDirection ?? manualDirection} lane GREEN`);
        break;
      case 'extend':
        extendGreenTime(30);
        setLastAction('🟢 Green time extended by +30 seconds');
        break;
      case 'manual':
        manualControl(manualDirection);
        setLastAction(`🖐 Manual Control → ${manualDirection} lane set GREEN`);
        break;
      case 'reset':
        resetToAuto();
        setLastAction('🤖 Reset to Auto — AI optimization active');
        break;
    }
    setConfirmDialog({ open: false, action: '', title: '', message: '' });
    setTimeout(() => setLastAction(''), 5000);
  };

  // ── Tab content renderer ──────────────────────────────────────────────────

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Live':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Traffic Intersection Visualization */}
            <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-8">
                <div className="relative w-full h-80 bg-slate-900 rounded-xl overflow-hidden">
                  {/* Road - Horizontal (with Heatmap capability) */}
                  <div className="absolute top-1/2 left-0 right-0 h-24 bg-slate-700 -translate-y-1/2 overflow-hidden">
                    <div className={cn("absolute inset-y-0 left-0 w-1/2 transition-colors duration-1000", vehicleCounts?.E > 8 ? "bg-red-900/40" : "")} />
                    <div className={cn("absolute inset-y-0 right-0 w-1/2 transition-colors duration-1000", vehicleCounts?.W > 8 ? "bg-red-900/40" : "")} />
                    <div className="absolute top-1/2 left-0 right-0 h-1 border-t-2 border-dashed border-yellow-400 -translate-y-1/2" />
                    {/* Ambulance Incoming Alert - LEFT lane (direction E) */}
                    {ambulanceDetected && ambulanceDirection === 'E' && (
                      <div className="absolute inset-y-0 left-0 w-1/2 animate-pulse bg-red-600/30 flex items-center justify-center">
                        <span className="text-red-300 text-xs font-bold px-2 py-0.5 bg-red-900/70 rounded animate-bounce">🚨 AMBULANCE</span>
                      </div>
                    )}
                    {/* Ambulance Incoming Alert - RIGHT lane (direction W) */}
                    {ambulanceDetected && ambulanceDirection === 'W' && (
                      <div className="absolute inset-y-0 right-0 w-1/2 animate-pulse bg-red-600/30 flex items-center justify-center">
                        <span className="text-red-300 text-xs font-bold px-2 py-0.5 bg-red-900/70 rounded animate-bounce">🚨 AMBULANCE</span>
                      </div>
                    )}
                  </div>
                  {/* Road - Vertical (with Heatmap capability) */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-24 bg-slate-700 -translate-x-1/2 overflow-hidden">
                    <div className={cn("absolute inset-x-0 top-0 h-1/2 transition-colors duration-1000", vehicleCounts?.S > 8 ? "bg-red-900/40" : "")} />
                    <div className={cn("absolute inset-x-0 bottom-0 h-1/2 transition-colors duration-1000", vehicleCounts?.N > 8 ? "bg-red-900/40" : "")} />
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 border-l-2 border-dashed border-yellow-400 -translate-x-1/2" />
                    {/* Ambulance Incoming Alert - TOP lane (direction S) */}
                    {ambulanceDetected && ambulanceDirection === 'S' && (
                      <div className="absolute inset-x-0 top-0 h-1/2 animate-pulse bg-red-600/30 flex items-end justify-center pb-1">
                        <span className="text-red-300 text-[9px] font-bold px-1 py-0.5 bg-red-900/70 rounded animate-bounce">🚨 AMB</span>
                      </div>
                    )}
                    {/* Ambulance Incoming Alert - BOTTOM lane (direction N) */}
                    {ambulanceDetected && ambulanceDirection === 'N' && (
                      <div className="absolute inset-x-0 bottom-0 h-1/2 animate-pulse bg-red-600/30 flex items-start justify-center pt-1">
                        <span className="text-red-300 text-[9px] font-bold px-1 py-0.5 bg-red-900/70 rounded animate-bounce">🚨 AMB</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Intersection Center with Zebra Crossings */}
                  <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-slate-600 -translate-x-1/2 -translate-y-1/2 shadow-inner">
                    <div className="absolute top-0 left-1 right-1 h-3 border-y-4 border-dashed border-slate-300 opacity-50" />
                    <div className="absolute bottom-0 left-1 right-1 h-3 border-y-4 border-dashed border-slate-300 opacity-50" />
                    <div className="absolute left-0 top-1 bottom-1 w-3 border-x-4 border-dashed border-slate-300 opacity-50" />
                    <div className="absolute right-0 top-1 bottom-1 w-3 border-x-4 border-dashed border-slate-300 opacity-50" />
                  </div>

                  {/* Traffic Lights */}
                  {lights.map((light) => (
                    <TrafficLight key={light.direction} direction={light.direction} state={light.state} timer={light.timer} />
                  ))}

                  {/* Moving Vehicles */}
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="absolute transition-all duration-100"
                      style={{ left: `${vehicle.x}%`, top: `${vehicle.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-colors',
                        vehicle.type === 'ambulance' ? 'bg-red-600 animate-pulse shadow-[0_0_15px_#ef4444] border-2 border-white' :
                        vehicle.type === 'bus'       ? 'bg-purple-500' :
                        vehicle.type === 'truck'     ? 'bg-yellow-500' :
                        vehicle.type === 'bike'      ? 'bg-emerald-500' : 'bg-blue-500'
                      )}>
                        <VehicleIcon type={vehicle.type} className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ))}

                  {/* Pedestrians on Zebra Crossings */}
                  {pedestrians.map((ped) => (
                    <div
                      key={ped.id}
                      className="absolute transition-all duration-200"
                      style={{ left: `${ped.x}%`, top: `${ped.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center shadow-md border border-white">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  ))}
                  {/* Status Overlay */}
                  <div className="absolute top-4 left-4 bg-black/50 rounded-lg px-3 py-2">
                    <p className="text-white text-xs">Phase: {activePhase}</p>
                    <p className="text-white text-xs">Mode: {emergencyMode ? 'EMERGENCY' : ambulanceDetected ? 'AMBULANCE PRIORITY' : isAuto ? 'AUTO (Smart Signal)' : 'MANUAL'}</p>
                    {ambulanceDetected && (
                      <p className="text-red-400 text-xs font-bold animate-pulse">
                        🚑 Ambulance → {
                          ambulanceDirection === 'N' ? 'Northbound (Bottom)' :
                          ambulanceDirection === 'S' ? 'Southbound (Top)' :
                          ambulanceDirection === 'E' ? 'Eastbound (Left)' :
                          'Westbound (Right)'
                        } GREEN
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Vehicles</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{intersection?.vehicles.toLocaleString()}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">+12%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Wait Time</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{intersection?.waitTime}m</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">-8%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Efficiency</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{intersection?.efficiency}%</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">+5%</p>
                  </div>
                </div>

                {/* Real-time vehicle type breakdown */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">LIVE VEHICLE TYPES</p>
                  <div className="flex gap-3 flex-wrap">
                    {(['car','bus','truck','bike','person','ambulance'] as const).map(type => {
                      const count = vehicles.filter(v => v.type === type).length;
                      const colors: Record<string, string> = {
                        car: 'bg-blue-500', bus: 'bg-purple-500', truck: 'bg-yellow-500',
                        bike: 'bg-emerald-500', person: 'bg-pink-500', ambulance: 'bg-red-500'
                      };
                      return count > 0 ? (
                        <div key={type} className="flex items-center gap-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${colors[type]}`} />
                          <span className="text-xs text-slate-600 dark:text-slate-300 capitalize">{type}: <strong>{count}</strong></span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Control Panel */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Traffic Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">

                {/* Last Action Status */}
                {lastAction && (
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-medium animate-pulse">
                    {lastAction}
                  </div>
                )}

                {/* 1. Emergency Override */}
                <button
                  id="btn-emergency-override"
                  className="w-full p-4 border border-red-500/50 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all text-left"
                  onClick={() => handleActionWithConfirm('emergency', '🚨 Emergency Override', 'Set all lanes to RED immediately? All vehicles will stop.')}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-400">Emergency Override</p>
                      <p className="text-xs text-red-600/70">Clear all lanes immediately</p>
                    </div>
                    <span className="ml-auto text-red-400 text-xs border border-red-400/50 px-2 py-0.5 rounded">ALL RED</span>
                  </div>
                </button>

                {/* 2. Ambulance Priority */}
                <button
                  id="btn-ambulance-priority"
                  className="w-full p-4 border border-red-500/50 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all text-left"
                  onClick={() => handleActionWithConfirm('ambulance', '🚑 Ambulance Priority', `${ambulanceDirection ? `Give GREEN signal to ambulance on lane ${ambulanceDirection}?` : 'Give GREEN signal to the ambulance lane?'}`)}
                >
                  <div className="flex items-center gap-3">
                    <Ambulance className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-400">Ambulance Priority</p>
                      <p className="text-xs text-red-600/70">Give green to active ambulance</p>
                    </div>
                    {ambulanceDetected && (
                      <span className="ml-auto text-red-400 text-xs border border-red-400/50 px-2 py-0.5 rounded animate-pulse">ACTIVE {ambulanceDirection}</span>
                    )}
                  </div>
                </button>

                {/* 3. Extend Green Time */}
                <button
                  id="btn-extend-green"
                  className="w-full p-4 border border-emerald-500/50 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all text-left"
                  onClick={() => handleActionWithConfirm('extend', '🟢 Extend Green Time', 'Add 30 more seconds to the current green phase?')}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-emerald-700 dark:text-emerald-400">Extend Green Time</p>
                      <p className="text-xs text-emerald-600/70">Add 30 seconds to current phase</p>
                    </div>
                    <span className="ml-auto text-emerald-400 text-xs border border-emerald-400/50 px-2 py-0.5 rounded">+30s</span>
                  </div>
                </button>

                {/* 4. Manual Control with direction picker */}
                <div className="w-full p-4 border border-blue-500/50 rounded-lg bg-blue-500/10">
                  <div className="flex items-center gap-3 mb-3">
                    <Hand className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-400">Manual Control</p>
                      <p className="text-xs text-blue-600/70">Pick a lane and force GREEN</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {(['N','S','E','W'] as const).map(dir => (
                      <button
                        key={dir}
                        id={`btn-manual-dir-${dir}`}
                        onClick={() => setManualDirection(dir)}
                        className={cn(
                          'py-1 text-sm font-bold rounded border transition-all',
                          manualDirection === dir
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-blue-400'
                        )}
                      >{dir}</button>
                    ))}
                  </div>
                  <button
                    id="btn-manual-apply"
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-sm rounded transition-all font-semibold"
                    onClick={() => handleActionWithConfirm('manual', '🖐️ Manual Control', `Switch lane ${manualDirection} to GREEN? All other lanes will turn RED.`)}
                  >
                    Apply → {manualDirection} Lane GREEN
                  </button>
                </div>

                {/* 5. Reset to Auto */}
                <button
                  id="btn-reset-auto"
                  className="w-full p-4 border border-orange-500/50 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 active:scale-95 transition-all text-left"
                  onClick={() => handleActionWithConfirm('reset', '🤖 Reset to Auto', 'Return the system to AI-powered Smart Signal optimization mode?')}
                >
                  <div className="flex items-center gap-3">
                    <RotateCcw className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-orange-700 dark:text-orange-400">Reset to Auto</p>
                      <p className="text-xs text-orange-600/70">Return to AI optimization</p>
                    </div>
                    {isAuto && <span className="ml-auto text-emerald-400 text-xs border border-emerald-400/50 px-2 py-0.5 rounded">ACTIVE</span>}
                  </div>
                </button>

              </CardContent>
            </Card>
          </div>
        );

      case 'Stats':
        return (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Traffic Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{intersection?.vehicles}</p>
                  <p className="text-sm text-slate-500">Total Vehicles</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{intersection?.waitTime}m</p>
                  <p className="text-sm text-slate-500">Avg Wait Time</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{intersection?.efficiency}%</p>
                  <p className="text-sm text-slate-500">Efficiency</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {intersection?.congestionLevel === 'high' ? '85%' : intersection?.congestionLevel === 'medium' ? '65%' : '35%'}
                  </p>
                  <p className="text-sm text-slate-500">Congestion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'History':
        return (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                Signal History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { time: '12:30 PM', action: 'Signal changed to GREEN (North)', type: 'auto' },
                  { time: '12:28 PM', action: 'Signal changed to RED (East)',    type: 'auto' },
                  { time: '12:25 PM', action: 'Ambulance priority activated',    type: 'manual' },
                  { time: '12:20 PM', action: 'Signal changed to GREEN (East)',  type: 'auto' },
                  { time: '12:15 PM', action: 'Green time extended +30s',        type: 'manual' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span className="text-sm text-slate-500 w-20">{item.time}</span>
                    <Badge className={item.type === 'auto' ? 'bg-blue-500' : 'bg-orange-500'}>
                      {item.type === 'auto' ? 'AUTO' : 'MANUAL'}
                    </Badge>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item.action}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Intersection Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{intersection?.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {intersection?.location}, {intersectionStates[selectedIntersection]} • User: Sutha
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-emerald-500 text-white px-4 py-1">ACTIVE</Badge>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-700 dark:text-emerald-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* Ambulance Alert Banner */}
      {ambulanceDetected && (
        <div className="flex items-center gap-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg animate-pulse">
          <Ambulance className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-400">🚑 Ambulance Detected — Priority Mode Active</p>
            <p className="text-xs text-red-400/80">
              Green signal given to <strong>{
                ambulanceDirection === 'N' ? 'Northbound (Bottom)' :
                ambulanceDirection === 'S' ? 'Southbound (Top)' :
                ambulanceDirection === 'E' ? 'Eastbound (Left)' :
                'Westbound (Right)'
              }</strong> direction. All other signals RED. Auto-resume in 60s.
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2">
        {(['Live', 'Stats', 'History'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            className={activeTab === tab ? 'bg-blue-500 hover:bg-blue-600 text-white px-6' : 'text-slate-600 dark:text-slate-400'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Select Intersection & Camera Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Select Intersection */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Select Intersection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {intersections.map((int) => (
              <button
                key={int.id}
                onClick={() => setSelectedIntersection(int.id)}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200',
                  selectedIntersection === int.id
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                <div className="text-left">
                  <p className="font-medium text-slate-900 dark:text-white">{int.name}</p>
                  <p className="text-xs text-slate-500">{intersectionStates[int.id]}</p>
                  <p className={cn(
                    'text-sm',
                    int.congestionLevel === 'high'   ? 'text-red-600 dark:text-red-400' :
                    int.congestionLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                                                       'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {int.congestionLevel === 'high' ? 'Congested' : int.congestionLevel === 'medium' ? 'Moderate' : 'Normal'}
                  </p>
                </div>
                {selectedIntersection === int.id && <Check className="w-5 h-5 text-emerald-500" />}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Camera Feed – YOLOv8 (ONNX)
            </CardTitle>
            <div className="flex items-center gap-2">
              {!cameraActive ? (
                <Button
                  size="sm"
                  onClick={startCamera}
                  disabled={modelLoading}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {modelLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading Model…</>
                  ) : (
                    <><Camera className="w-4 h-4 mr-2" />Start Camera</>
                  )}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={stopCamera}>
                  Stop Camera
                </Button>
              )}
              <Button variant="ghost" size="icon">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Video + Canvas overlay */}
            <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">

              {/* Raw video (hidden behind canvas once camera active) */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: cameraActive ? 0 : 0 }} // canvas draws the frames
              />

              {/* Canvas – renders video frames + real detection boxes */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ display: cameraActive ? 'block' : 'none' }}
              />

              {/* Idle state */}
              {!cameraActive && !modelLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Click "Start Camera" to begin real-time detection</p>
                    <p className="text-slate-500 text-xs mt-1">Powered by ONNX Runtime Web · YOLOv8</p>
                  </div>
                </div>
              )}

              {/* Model loading overlay */}
              {modelLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-spin" />
                    <p className="text-white text-sm">Loading YOLOv8 model…</p>
                    <p className="text-slate-400 text-xs mt-1">First load may take a few seconds</p>
                  </div>
                </div>
              )}

              {/* Detection status badge */}
              {cameraActive && (
                <div className="absolute top-3 left-3 bg-black/70 rounded-lg px-3 py-2">
                  <p className="text-white text-xs font-semibold">YOLOv8 · Real-time</p>
                  <p className={cn(
                    'text-xs mt-0.5',
                    modelReady ? 'text-emerald-400' : 'text-yellow-400'
                  )}>
                    {modelReady ? '● Detecting…' : '● Initialising…'}
                  </p>
                </div>
              )}

              {/* Live detection counts */}
              {cameraActive && (
                <div className="absolute top-3 right-3 bg-black/70 rounded-lg px-3 py-2 space-y-0.5">
                  {(Object.entries(detectionCounts) as [string, number][])
                    .filter(([, v]) => v > 0)
                    .map(([label, count]) => (
                      <p key={label} className="text-xs" style={{ color: LABEL_COLORS[label as keyof typeof LABEL_COLORS] ?? '#fff' }}>
                        {label.charAt(0).toUpperCase() + label.slice(1)}: {count}
                      </p>
                    ))
                  }
                  {Object.values(detectionCounts).every(v => v === 0) && (
                    <p className="text-slate-400 text-xs">No objects detected</p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom stats row */}
            <div className="flex items-center justify-between mt-4">
              <div className="grid grid-cols-3 gap-4 text-center flex-1">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Detected</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {Object.values(detectionCounts).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">FPS</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {cameraActive ? fps : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Model</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">YOLOv8</p>
                </div>
              </div>
              <Button
                onClick={handleDownloadCSV}
                className="ml-4 bg-blue-500 hover:bg-blue-600"
                disabled={!cameraActive}
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, action: '', title: '', message: '' })}>
              Cancel
            </Button>
            <Button onClick={executeAction} className="bg-blue-500 hover:bg-blue-600">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
