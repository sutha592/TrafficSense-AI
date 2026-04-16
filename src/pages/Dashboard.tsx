// Dashboard Component
import { useState, useEffect } from 'react';
import {
  Car, Clock, TrendingUp, Activity,
  AlertTriangle, Sun, Navigation, BarChart3,
  Ambulance, Zap, MapPin, Signal, Camera,
  Leaf, Shield, ChevronRight, Monitor, Database, CloudRain
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTrafficMetrics, usePredictiveAnalytics, useAnalyticsData } from '@/hooks/useRealtimeData';
import { cn } from '@/lib/utils';
import { TrafficMap } from '@/components/TrafficMap';

// ── Static Tirunelveli intersection data ────────────────────────────────────

const JUNCTIONS = [
  { id: 'INT001', name: 'Vannarpettai Signal',    vehicles: 2156, congestion: 89, waitTime: 5.2, efficiency: 85, level: 'high'   as const },
  { id: 'INT002', name: 'Tirunelveli Junction',   vehicles: 1890, congestion: 82, waitTime: 4.3, efficiency: 72, level: 'high'   as const },
  { id: 'INT003', name: 'Murugankurichi Signal',  vehicles: 1567, congestion: 71, waitTime: 3.8, efficiency: 78, level: 'medium' as const },
  { id: 'INT004', name: 'New Bus Stand',          vehicles: 1121, congestion: 55, waitTime: 3.1, efficiency: 92, level: 'medium' as const },
  { id: 'INT005', name: 'Tirunelveli Town',       vehicles: 1980, congestion: 88, waitTime: 4.8, efficiency: 81, level: 'high'   as const },
  { id: 'INT006', name: 'KTC Nagar Intersection', vehicles: 987,  congestion: 42, waitTime: 2.1, efficiency: 88, level: 'low'    as const },
  { id: 'INT007', name: 'Thachanallur Bypass',    vehicles: 876,  congestion: 34, waitTime: 1.8, efficiency: 94, level: 'low'    as const },
  { id: 'INT008', name: 'Palayamkottai Market',   vehicles: 765,  congestion: 28, waitTime: 1.5, efficiency: 96, level: 'low'    as const },
];

function levelColor(level: 'high' | 'medium' | 'low') {
  if (level === 'high')   return { text: 'text-red-500',     bg: 'bg-red-500',     light: 'bg-red-50 dark:bg-red-900/20'     };
  if (level === 'medium') return { text: 'text-amber-500',   bg: 'bg-amber-500',   light: 'bg-amber-50 dark:bg-amber-900/20'   };
  return                         { text: 'text-emerald-500', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20' };
}

const MEDALS = ['🥇', '🥈', '🥉'];

// ── Timeline helpers ─────────────────────────────────────────────────────────
const TIMELINE_HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6AM–10PM
function getTrafficLevel(hour: number): 'high' | 'medium' | 'low' {
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) return 'high';
  if ((hour >= 7 && hour < 8)  || (hour >= 11 && hour <= 13) || (hour >= 16 && hour < 17) || (hour >= 20 && hour <= 21)) return 'medium';
  return 'low';
}

// ── Props ────────────────────────────────────────────────────────────────────
interface DashboardProps { 
  activeFilter?: string; 
  activeTab?: string; 
  onTabChange?: (tab: string) => void;
}

// Filter config: multipliers + labels for each time period
const FILTER_CONFIG: Record<string, {
  vehicleMultiplier: number;
  congestionMult: number;
  ambulanceCount: number;
  greenCycles: number;
  aiDecisions: number;
  waitReduction: string;
  vehicleLabel: string;
  subLabel: string;
  peakNote: string;
  showLive: boolean;
}> = {
  'Real-time': { vehicleMultiplier: 1.00, congestionMult: 1.00, ambulanceCount: 3,   greenCycles: 142,  aiDecisions: 47, waitReduction: '−12%', vehicleLabel: 'Total Vehicles Now',   subLabel: 'Live across 8 junctions', peakNote: 'Live feed',             showLive: true  },
  'Last Hour':  { vehicleMultiplier: 0.08, congestionMult: 0.90, ambulanceCount: 1,   greenCycles: 12,   aiDecisions: 44, waitReduction: '−10%', vehicleLabel: 'Vehicles (Last Hour)', subLabel: 'Past 60 minutes',         peakNote: 'Hourly summary',        showLive: false },
  'Last 6h':    { vehicleMultiplier: 0.48, congestionMult: 0.85, ambulanceCount: 2,   greenCycles: 67,   aiDecisions: 45, waitReduction: '−11%', vehicleLabel: 'Vehicles (Last 6h)',   subLabel: 'Past 6 hours',            peakNote: '6-hour window',         showLive: false },
  'Today':      { vehicleMultiplier: 0.82, congestionMult: 0.92, ambulanceCount: 3,   greenCycles: 118,  aiDecisions: 46, waitReduction: '−12%', vehicleLabel: "Today's Total",        subLabel: 'Since midnight',          peakNote: "Today's data",          showLive: false },
  'Last Week':  { vehicleMultiplier: 5.60, congestionMult: 0.78, ambulanceCount: 19,  greenCycles: 924,  aiDecisions: 43, waitReduction: '−9%',  vehicleLabel: 'Weekly Total',         subLabel: 'Last 7 days',             peakNote: 'Weekly average',        showLive: false },
  'Last Month': { vehicleMultiplier: 24.0, congestionMult: 0.72, ambulanceCount: 74, greenCycles: 3980, aiDecisions: 41, waitReduction: '−8%',  vehicleLabel: 'Monthly Total',        subLabel: 'Last 30 days',            peakNote: 'Monthly average',       showLive: false },
};

export function Dashboard({ 
  activeFilter = 'Real-time', 
  activeTab = 'Overview'
}: DashboardProps) {
  const metrics = useTrafficMetrics();
  const predictions = usePredictiveAnalytics();
  useAnalyticsData(activeFilter);

  const cfg = FILTER_CONFIG[activeFilter] ?? FILTER_CONFIG['Real-time'];

  const [liveJunctions, setLiveJunctions] = useState(JUNCTIONS);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isVipMode, setIsVipMode] = useState(false);
  const [extraVehicles, setExtraVehicles] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  // Backend Integration States
  const [isRaining, setIsRaining] = useState(false);
  const [sosJunction, setSosJunction] = useState<string | null>(null);
  const [healthGrid, setHealthGrid] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  // Fetch Data from Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Logs
        const logsRes = await fetch('http://localhost:8000/api/logs');
        if (logsRes.ok) setSystemLogs(await logsRes.json());
        
        // Fetch Junction Health
        const juncRes = await fetch('http://localhost:8000/api/junctions');
        if (juncRes.ok) setHealthGrid(await juncRes.json());

        // Fetch Global State
        const stateRes = await fetch('http://localhost:8000/api/state');
        if (stateRes.ok) {
           const state = await stateRes.json();
           setIsRaining(state.isRaining);
           setSosJunction(state.sosJunction);
        }
      } catch (err) {
        console.error('Backend connection failed', err);
      }
    };
    
    fetchData(); // Initial load
    const interval = setInterval(fetchData, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const addLog = async (msg: string) => {
    // Send log to Backend
    try {
       await fetch('http://localhost:8000/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ time: new Date().toLocaleTimeString(), msg })
       });
       // Instantly update local state for fast UI response
       setSystemLogs(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 50));
    } catch {
       setSystemLogs(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 50));
    }
  };

  const now         = new Date();
  const currentHour = now.getHours();

  // Only animate live-data when in Real-time mode
  useEffect(() => {
    if (!cfg.showLive) return;
    const t = setInterval(() => {
      setLiveJunctions(prev => prev.map(j => ({
        ...j,
        vehicles:   Math.max(100, j.vehicles   + Math.floor((Math.random() - 0.5) * 40)),
        congestion: Math.max(10,  Math.min(99, j.congestion + Math.floor((Math.random() - 0.5) * 3))),
      })));
    }, 3000);
    return () => clearInterval(t);
  }, [cfg.showLive]);

  // When filter changes, recompute junction snapshot
  const filteredJunctions = JUNCTIONS.map(j => ({
    ...j,
    vehicles:   Math.round(j.vehicles * cfg.vehicleMultiplier),
    congestion: Math.max(5, Math.round(j.congestion * cfg.congestionMult)),
    waitTime:   +(j.waitTime * (0.7 + cfg.congestionMult * 0.3)).toFixed(1),
  }));

  // For real-time mode use the animated state, otherwise use computed snapshot
  const displayJunctions = cfg.showLive ? liveJunctions : filteredJunctions;

  const rankedJunctions = [...displayJunctions].sort((a, b) => b.vehicles - a.vehicles);
  const totalVehicles   = displayJunctions.reduce((s, j) => s + j.vehicles, 0);
  const avgEfficiency   = Math.round(displayJunctions.reduce((s, j) => s + j.efficiency, 0) / displayJunctions.length);
  const highCount       = displayJunctions.filter(j => j.level === 'high').length;
  const mediumCount     = displayJunctions.filter(j => j.level === 'medium').length;
  const lowCount        = displayJunctions.filter(j => j.level === 'low').length;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <>
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Tirunelveli Traffic Overview — {activeFilter}
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Activity className={cn("w-4 h-4 text-emerald-500", cfg.showLive && "animate-pulse")} />
                <span>{cfg.showLive ? "Live monitoring active" : "Historical Data View"}</span>
              </div>
            </div>

            {/* ── 5 Stat Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

              {/* 1 Total Vehicles */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"><Car className="w-6 h-6" /></div>
                    <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400"><TrendingUp className="w-4 h-4" /><span>+8%</span></div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{cfg.vehicleLabel}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{(totalVehicles + extraVehicles).toLocaleString()}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{extraVehicles > 0 ? `Simulating +${extraVehicles} vehicles` : cfg.subLabel}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 2 Most Congested */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"><MapPin className="w-6 h-6" /></div>
                    <span className={cn("text-xs text-white px-2 py-0.5 rounded-full font-semibold", rankedJunctions[0].congestion > 70 ? "bg-red-500" : "bg-amber-500")}>
                      {rankedJunctions[0].congestion > 70 ? "🔴 HIGH" : "🟡 MED"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Most Congested</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-tight">{rankedJunctions[0].name}</p>
                    <p className="text-sm text-red-500 mt-1">{rankedJunctions[0].congestion}% congestion</p>
                  </div>
                </CardContent>
              </Card>

              {/* 3 Ambulance Alerts */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 w-fit"><Ambulance className="w-6 h-6" /></div>
                  <div className="mt-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ambulance Alerts</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">🚑 {cfg.ambulanceCount}</p>
                    <p className="text-sm text-red-500 mt-1">Priority overrides</p>
                  </div>
                </CardContent>
              </Card>

              {/* 4 Signal Efficiency */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"><Signal className="w-6 h-6" /></div>
                    <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400"><TrendingUp className="w-4 h-4" /><span>+5%</span></div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Avg Signal Efficiency</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{avgEfficiency}%</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">AI optimised</p>
                  </div>
                </CardContent>
              </Card>

              {/* 5 Peak Hour Status */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 w-fit"><Sun className="w-6 h-6" /></div>
                  <div className="mt-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Traffic Peak Status</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {activeFilter !== 'Real-time' ? cfg.peakNote : (
                        currentHour >= 8  && currentHour <= 10 ? '🌅 Morning Peak' :
                        currentHour >= 17 && currentHour <= 19 ? '🌆 Evening Peak' : '🟢 Off-Peak'
                      )}
                    </p>
                    <p className="text-sm text-amber-500 mt-1">
                      {activeFilter !== 'Real-time' ? "Filtered view" : (
                        currentHour >= 8  && currentHour <= 10 ? 'High volume now' :
                        currentHour >= 17 && currentHour <= 19 ? 'Rush hour active' : 'Normal flow'
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Live Regional Map Section ── */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
              <CardHeader className="pb-3 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    Live Regional Traffic Flow
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Tirunelveli Central Monitoring Zone</p>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-600">Live Satellite Feed</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <TrafficMap 
                  ambulanceDetected={sosJunction !== null} 
                  selectedId={sosJunction ? (JUNCTIONS.find(j => j.name === sosJunction)?.id || 'INT001') : 'INT001'}
                />
              </CardContent>
            </Card>

            {/* ── Ranking + Smart Signal Summary ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Busiest Junctions Ranking */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">🏆 Junction Statistics</CardTitle>
                  <Badge className={cn("text-white", cfg.showLive ? "bg-blue-500" : "bg-slate-500")}>{cfg.showLive ? "LIVE" : "SUMMARY"}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rankedJunctions.map((j, i) => {
                    const col = levelColor(j.level);
                    const barWidth = Math.round((j.vehicles / rankedJunctions[0].vehicles) * 100);
                    return (
                      <div key={j.id} className={cn('p-3 rounded-xl', col.light)}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl w-7 text-center">{MEDALS[i] ?? `${i + 1}.`}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{j.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Wait: {j.waitTime}m · Eff: {j.efficiency}%</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn('font-bold text-sm', col.text)}>{j.vehicles.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500">vehicles</p>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div className={cn('h-1.5 rounded-full transition-all duration-700', col.bg)} style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Right column: Smart Signal + Congestion distribution */}
              <div className="space-y-4">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" /> AI Smart Signal Summary
                      <Badge className="ml-auto bg-emerald-500 text-white text-xs">ACTIVE</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Green Cycles',  value: `${cfg.greenCycles}`,    color: 'text-emerald-500' },
                      { label: 'Ambulance Overrides', value: `${cfg.ambulanceCount}`, color: 'text-red-500'     },
                      { label: 'AI Decisions / Hour', value: `${cfg.aiDecisions}`,    color: 'text-blue-500'    },
                      { label: 'Avg Wait Reduction',  value: `${cfg.waitReduction}`,  color: 'text-emerald-500' },
                      { label: 'Active Junctions',    value: '8 / 8',             color: 'text-blue-500'    },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
                        <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Congestion Distribution</p>
                    <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                      <div className="bg-red-500 flex items-center justify-center text-white text-xs font-bold rounded-l-lg" style={{ width: `${Math.round(highCount / 8 * 100)}%` }}>
                        {highCount} 🔴
                      </div>
                      <div className="bg-amber-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${Math.round(mediumCount / 8 * 100)}%` }}>
                        {mediumCount} 🟡
                      </div>
                      <div className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold rounded-r-lg" style={{ width: `${Math.round(lowCount / 8 * 100)}%` }}>
                        {lowCount} 🟢
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>High</span><span>Medium</span><span>Low</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── Today's Traffic Timeline ── */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> Hourly Traffic Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 items-end mb-2 mt-4">
                  {TIMELINE_HOURS.map(hour => {
                    const level = getTrafficLevel(hour);
                    const isCurrent = hour === currentHour && activeFilter === 'Real-time';
                    const col = levelColor(level);
                    return (
                      <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={cn('w-full rounded-t-md transition-all duration-500 relative', col.bg, isCurrent ? 'ring-2 ring-offset-1 ring-white dark:ring-slate-800 shadow-lg' : 'opacity-75')}
                          style={{ height: level === 'high' ? 48 : level === 'medium' ? 30 : 16 }}
                        >
                          {isCurrent && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-600 dark:text-blue-300 whitespace-nowrap">▼ NOW</div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400">{hour % 12 || 12}{hour < 12 ? 'a' : 'p'}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-sm inline-block" /> Peak</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-sm inline-block" /> Moderate</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-sm inline-block" /> Low traffic</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Sun className="w-4 h-4 text-yellow-500" /><span className="text-sm text-slate-700 dark:text-slate-300">Morning Rush</span></div>
                      <Badge className="bg-emerald-500 text-white">{predictions.morningRush.probability}%</Badge>
                    </div>
                    <p className="text-xs text-slate-500">Peak starting at {predictions.morningRush.peakTime}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{predictions.morningRush.status}</p>
                    <Progress value={predictions.morningRush.probability} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Sun className="w-4 h-4 text-orange-500" /><span className="text-sm text-slate-700 dark:text-slate-300">Evening Rush</span></div>
                      <Badge className="bg-orange-500 text-white">{predictions.eveningRush.probability}%</Badge>
                    </div>
                    <p className="text-xs text-slate-500">Peak starting at {predictions.eveningRush.peakTime}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{predictions.eveningRush.status}</p>
                    <Progress value={predictions.eveningRush.probability} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        );

      case 'Live Status':
        return (
          <div className="space-y-6">
            {/* ── 1. Top System Health Banner ── */}
            <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute" />
                    <div className="w-3 h-3 bg-emerald-500 rounded-full relative" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900 dark:text-emerald-400">System Core Online</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-500/80">Primary Tirunelveli server (TNY-SRV-01) is operational</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500 text-white border-0">UPTIME: 14D 06H</Badge>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ── 2. AI Server Performance (Left) ── */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CPU/RAM Monitor */}
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" /> AI Server Load
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-slate-500">CPU Usage (Analytic Core)</span><span className="font-mono">{Math.round(metrics.systemHealth / 4)}%</span></div>
                        <Progress value={metrics.systemHealth / 4} className="h-1.5" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Memory Utilization</span><span className="font-mono">84.2%</span></div>
                        <Progress value={84.2} className="h-1.5" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Storage</p>
                          <p className="text-sm font-bold">1.2 TB / 4 TB</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Network IO</p>
                          <p className="text-sm font-bold">115 Gbps</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Response Card */}
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" /> AI Model Latency
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-4">
                      <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                        187<span className="text-sm font-medium text-slate-500 ml-1">ms</span>
                      </div>
                      <p className="text-xs text-emerald-500 font-medium">Faster than avg (210ms)</p>
                      <div className="w-full h-12 mt-4 flex items-end gap-1 px-2">
                        {[40, 60, 30, 80, 50, 90, 40, 70, 60, 50, 40, 80, 50, 30, 40].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-500/20 dark:bg-blue-500/10 rounded-t-sm relative group overflow-hidden h-full">
                            <div className="absolute bottom-0 w-full bg-blue-500 transition-all duration-1000" style={{ height: `${h}%` }} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ── 3. Junction Health Grid ── */}
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Tirunelveli Junction Health Grid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {JUNCTIONS.map(j => {
                        const status = j.level === 'high' ? 'Warning' : j.level === 'medium' ? 'Active' : 'Standby';
                        const dotColor = j.level === 'high' ? 'bg-amber-500' : 'bg-emerald-500';
                        return (
                          <div key={j.id} className="p-3 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn("w-2 h-2 rounded-full", dotColor, "animate-pulse")} />
                              <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{j.name.split(' ')[0]}</p>
                            </div>
                            <div className="flex items-end justify-between">
                              <span className="text-[10px] text-slate-500">{status}</span>
                              <span className="text-[10px] font-mono text-slate-400">0.0{Math.floor(Math.random()*9)}ms</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── 4. Live Activity Log (Right) ── */}
              <div className="space-y-6">

                {/* Camera Sensors Breakdown */}
                <Card className="bg-slate-900 border-slate-800 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-slate-400">CAMERA SENSORS (HD-PRO)</p>
                      <Navigation className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-bold">24</span>
                      <span className="text-emerald-500 text-sm font-bold mb-1">/ 24</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]"><span className="text-slate-500">Optical Sensors</span><span>16 / 16</span></div>
                      <div className="flex justify-between text-[10px]"><span className="text-slate-500">Thermal Overlays</span><span>8 / 8</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case 'Quick Actions': {
        const handleSimulate = () => {
          setIsSimulating(true);
          setExtraVehicles(250);
          addLog('Traffic Simulation: Peak hour load injected (+250 vehicles)');
          setTimeout(() => {
            setIsSimulating(false);
            setExtraVehicles(0);
            addLog('Traffic Simulation: Test completed. Load neutralized.');
          }, 5000);
          toast.info('Traffic Simulation: Peak hour load injected (+250 vehicles)');
        };

        const toggleVipMode = () => {
          const nextState = !isVipMode;
          setIsVipMode(nextState);
          const msg = nextState ? 'VIP Convoy Mode: Activated (Route: Airport to Collector Office)' : 'VIP Convoy Mode: Deactivated';
          addLog(msg);
          if (nextState) toast.warning(msg);
          else toast.success(msg);
        };

        const updateBackendState = async (updates: any) => {
          try {
            await fetch('http://localhost:8000/api/state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
            });
          } catch(e) { console.error('Failed to update state', e); }
        };

        const toggleWeather = () => {
          const nextState = !isRaining;
          setIsRaining(nextState);
          updateBackendState({ isRaining: nextState });
          
          if (nextState) {
            addLog('Weather Anomaly: Heavy rain detected. Target metrics adjusting via FastAPI.');
            toast.info('Heavy Rain Detected: Adjusting signals...', { icon: <CloudRain className="w-4 h-4 text-blue-500" /> });
          } else {
            addLog('Weather Update: Conditions cleared. Restoring optimal baseline.');
            toast.success('Weather Cleared: Optimizing flow');
          }
        };

        const triggerSos = () => {
          setSosJunction('Vannarpettai');
          updateBackendState({ sosJunction: 'Vannarpettai' });
          addLog('CRITICAL: Collision detected at Vannarpettai. FastAPI backend auto-rerouting active.');
          toast.error('SOS/Collision Detected: Vannarpettai', { 
            style: { background: '#ef4444', color: 'white', border: 'none' },
            duration: 8000 
          });
          
          setTimeout(() => {
            setSosJunction(null);
            updateBackendState({ sosJunction: null });
            addLog('Update: Vannarpettai junction cleared. Flow restoring.');
            toast.success('Incident resolved. Flow restored.');
          }, 10000);
        };

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* ── LEFT COLUMN: COMMANDS & STATUS (70%) ── */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* 1. Main Action Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Traffic Commands */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <Signal className="w-3 h-3" /> Traffic Command
                  </h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        setIsBroadcasting(true);
                        addLog('VMS Alert: "Tirunelveli Bypass - Use Alternate Route" Broadcasted.');
                        toast.success('Broadcast updated successully');
                        setTimeout(() => setIsBroadcasting(false), 2000);
                      }}
                      disabled={isBroadcasting}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 border rounded-2xl transition-all active:scale-[0.98] group",
                        isBroadcasting ? "bg-blue-500 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-lg"
                      )}
                    >
                      <div className={cn("p-2.5 rounded-xl transition-colors", isBroadcasting ? "bg-white/20 text-white" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 group-hover:bg-blue-100")}>
                        <Signal className={cn("w-5 h-5", isBroadcasting && "animate-pulse")} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-sm">{isBroadcasting ? 'BROADCASTING...' : 'Broadcast Public Alert'}</p>
                        <p className={cn("text-[10px]", isBroadcasting ? "text-blue-100" : "text-slate-500")}>Update roadside LED boards</p>
                      </div>
                      {!isBroadcasting && <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>

                    <button 
                      onClick={handleSimulate}
                      disabled={isSimulating}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all group",
                        isSimulating ? "bg-amber-500 border-amber-600 text-white shadow-amber-500/20 shadow-lg" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:shadow-lg"
                      )}
                    >
                      <div className={cn("p-2.5 rounded-xl transition-colors", isSimulating ? "bg-white/20 text-white" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 group-hover:bg-amber-100")}>
                        <Car className={cn("w-5 h-5", isSimulating && "animate-bounce")} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-sm">{isSimulating ? 'SIMULATION ACTIVE' : 'Simulate Peak Hour'}</p>
                        <p className={cn("text-[10px]", isSimulating ? "text-amber-100" : "text-slate-500")}>Inject +250 vehicle load</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* System Management */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> System Management
                  </h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        setIsSyncing(true);
                        addLog('AI Core: Model weights resynced (YOLOv8.1-PRO).');
                        toast.success('AI Weights Resynced');
                        setTimeout(() => setIsSyncing(false), 1500);
                      }}
                      disabled={isSyncing}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 border rounded-2xl transition-all active:scale-[0.98] group",
                        isSyncing ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-lg"
                      )}
                    >
                      <div className={cn("p-2.5 rounded-xl transition-colors", isSyncing ? "bg-white/20 text-white" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 group-hover:bg-emerald-100")}>
                        <Zap className={cn("w-5 h-5", isSyncing && "animate-spin")} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-sm">{isSyncing ? 'SYNCING...' : 'Force AI Model Sync'}</p>
                        <p className={cn("text-[10px]", isSyncing ? "text-emerald-100" : "text-slate-500")}>Sync with central Tirunelveli node</p>
                      </div>
                    </button>

                    <button 
                      onClick={toggleWeather}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 border rounded-2xl transition-all active:scale-[0.98] group",
                        isRaining ? "bg-blue-600 border-blue-700 text-white shadow-blue-500/20 shadow-lg" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-lg"
                      )}
                    >
                      <div className={cn("p-2.5 rounded-xl transition-colors", isRaining ? "bg-white/20 text-white" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 group-hover:bg-blue-100")}>
                        <CloudRain className={cn("w-5 h-5", isRaining && "animate-bounce")} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-sm">{isRaining ? 'RAIN IMPACT ACTIVE' : 'Simulate Heavy Rain'}</p>
                        <p className={cn("text-[10px]", isRaining ? "text-blue-100" : "text-slate-500")}>AI adjusts baseline buffers</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        setIsRecalibrating(true);
                        addLog('Camera Core: Recalibrating 24 sensors...');
                        toast.success('Calibration Initiated');
                        setTimeout(() => setIsRecalibrating(false), 2000);
                      }}
                      disabled={isRecalibrating}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 border rounded-2xl transition-all active:scale-[0.98] group",
                        isRecalibrating ? "bg-purple-500 border-purple-600 text-white" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:shadow-lg"
                      )}
                    >
                      <div className={cn("p-2.5 rounded-xl transition-colors", isRecalibrating ? "bg-white/20 text-white" : "bg-purple-50 dark:bg-purple-900/20 text-purple-600 group-hover:bg-purple-100")}>
                        <Camera className={cn("w-5 h-5", isRecalibrating && "animate-pulse")} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-sm">{isRecalibrating ? 'CALIBRATING...' : 'Recalibrate Cameras'}</p>
                        <p className={cn("text-[10px]", isRecalibrating ? "text-purple-100" : "text-slate-500")}>Reset all 24 optical sensor feeds</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Active Mode Monitor & VMS Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* VIP Mode Control */}
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Special Operations</h3>
                    <button 
                      onClick={toggleVipMode}
                      className={cn(
                        "w-full flex items-center gap-4 p-5 rounded-3xl border transition-all relative overflow-hidden group",
                        isVipMode ? "bg-red-600 border-red-700 text-white shadow-red-500/40 shadow-xl" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-500"
                      )}
                    >
                      {isVipMode && <div className="absolute inset-0 bg-red-500 animate-pulse opacity-20" />}
                      <div className={cn("p-3 rounded-2xl relative z-10", isVipMode ? "bg-white text-red-600" : "bg-red-50 dark:bg-red-900/20 text-red-600 group-hover:bg-red-100")}>
                        <Ambulance className={cn("w-6 h-6", isVipMode && "animate-bounce")} />
                      </div>
                      <div className="text-left relative z-10 flex-1">
                        <div className="flex items-center gap-2">
                           <p className="font-black text-base italic uppercase tracking-tighter">VIP Convoy Mode</p>
                           {isVipMode && <Badge className="bg-white/20 text-white border-0 text-[10px] h-4">PRIORITY 1</Badge>}
                        </div>
                        <p className={cn("text-[10px] font-bold", isVipMode ? "text-red-100" : "text-slate-500")}>
                          {isVipMode ? 'ACTIVE: Clearing Airport -> Junction' : 'Toggle emergency green corridor'}
                        </p>
                      </div>
                    </button>

                    <button 
                      onClick={triggerSos}
                      disabled={sosJunction !== null}
                      className="w-full flex items-center gap-4 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group disabled:opacity-50"
                    >
                      <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 group-hover:bg-orange-100 transition-colors">
                        <AlertTriangle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                           <p className="font-black text-base italic uppercase tracking-tighter text-slate-900 dark:text-white">Trigger SOS Alert</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500">
                          {sosJunction ? 'INCIDENT ACTIVE' : 'Simulate collision/blockade'}
                        </p>
                      </div>
                    </button>
                 </div>

                 {/* VMS Broadcast Preview */}
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                       <Monitor className="w-3 h-3" /> Digital Signage Preview
                    </h3>
                    <div className="p-4 bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-inner flex flex-col justify-center items-center h-[94px]">
                       <p className="text-amber-500 font-mono text-xs animate-pulse tracking-widest text-center uppercase">
                          {isVipMode ? '!! CAUTION: VIP CONVOY !!\nMOVE TO LEFT LANE' : 'SMART TRAFFIC AI ACTIVE\nDRIVE SAFE NELLAI'}
                       </p>
                       <div className="flex gap-1 mt-2">
                          <div className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
                          <p className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Live Broadcast</p>
                       </div>
                    </div>
                 </div>
              </div>

               {/* 3. Intersection Health Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Intersection Status Grid</h3>
                   {isRaining && <Badge className="bg-blue-500 text-white text-[9px] h-4">WEATHER OFFSET +15s</Badge>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {healthGrid.map((j, i) => {
                    const isSos = j.name === sosJunction;
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "p-4 rounded-2xl border transition-all duration-500",
                          isSos 
                            ? "bg-red-500 border-red-600 text-white animate-pulse shadow-lg shadow-red-500/30" 
                            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                        )}
                      >
                        <p className={cn("text-[10px] font-bold uppercase truncate", isSos ? "text-red-100" : "text-slate-500")}>
                          {j.name}
                        </p>
                        <div className="flex items-end justify-between mt-1">
                          <span className={cn("text-lg font-black tracking-widest", isSos ? "text-white" : "text-slate-900 dark:text-white")}>
                            {isSos ? '---' : `${j.currentWait}s`}
                          </span>
                          <div className="flex flex-col items-end">
                            <span className={cn("text-[8px] font-bold uppercase mb-0.5", isSos ? "text-white" : "text-slate-400")}>
                              {j.status}
                            </span>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              isSos ? "bg-white animate-ping" : 
                              j.status === 'Optimal' ? "bg-emerald-500" : 
                              j.status === 'Caution' ? "bg-blue-500" : 
                              j.status === 'Smooth' ? "bg-blue-500" : "bg-amber-500"
                            )} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Emergency Override (Relocated) */}
              <button 
                onClick={() => {
                  addLog('CRITICAL: Emergency Override Triggered. All signals manual.');
                  toast.error('System Emergency Override Triggered!', {
                    duration: 5000,
                    style: { background: '#ef4444', color: 'white', border: 'none' }
                  });
                }}
                className="w-full p-4 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-600/20 group"
              >
                <AlertTriangle className="w-5 h-5 group-hover:animate-bounce" />
                <span className="font-black uppercase tracking-widest text-xs">System Emergency Override</span>
              </button>
            </div>

            {/* ── RIGHT COLUMN: LOGS & DIAGNOSTICS (30%) ── */}
            <div className="space-y-6">
              
              {/* 1. Diagnostic Hub */}
              <Card className="border-slate-200 dark:border-slate-700 shadow-sm bg-blue-50/30 dark:bg-blue-900/10">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Diagnostic Hub</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">AI Core Load</span>
                    <span className="text-xs font-bold text-emerald-500">14% - STABLE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Network Latency</span>
                    <span className="text-xs font-bold text-blue-500">24ms - ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Camera Sync</span>
                    <span className="text-xs font-bold text-emerald-500">24/24 - ONLINE</span>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Live Command Log */}
              <Card className="border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 flex flex-col h-[400px]">
                <CardHeader className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Live Command Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-auto flex-1">
                  <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {systemLogs.slice(0, 10).map((log, i) => (
                      <div key={i} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                           <p className="text-[10px] font-mono text-blue-500 font-bold shrink-0">{log.time}</p>
                           <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight flex-1">{log.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {systemLogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 grayscale">
                       <Database className="w-8 h-8 opacity-20" />
                       <p className="text-[10px] font-bold uppercase tracking-widest">No Commands Sent</p>
                    </div>
                  )}
                </CardContent>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-[10px] uppercase font-bold text-slate-400 hover:text-blue-500" 
                    onClick={() => {
                      toast.info('Fetching extended history...', { icon: <Activity className="w-4 h-4 animate-spin" /> });
                      setTimeout(() => {
                        addLog('System: Archive request processed. 24h history available in Analytics.');
                      }, 1000);
                    }}
                   >
                      View Extended Activity
                   </Button>
                </div>
              </Card>

            </div>

          </div>
        );
      }

      case 'Insights':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* ── 1. Bottle-Neck Analysis ── */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-500" /> Current Bottle-Neck: Tirunelveli Town Arch
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-6 p-4">
                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      AI detection indicates slow heavy vehicle movements at Town Arch. To mitigate congestion, AI recommends extending the East Phase timing by an additional 12 seconds.
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800/30">
                        <p className="text-[10px] uppercase text-orange-600 font-bold tracking-tight">Queue Length</p>
                        <p className="text-lg font-black text-orange-700 dark:text-orange-400">145m</p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <p className="text-[10px] uppercase text-blue-600 font-bold tracking-tight">AI Confidence</p>
                        <p className="text-lg font-black text-blue-700 dark:text-blue-400">92%</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-32 h-32 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 relative overflow-hidden group">
                     {/* Simulated mini heatmap */}
                     <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-blue-500/10" />
                     <MapPin className="w-8 h-8 text-slate-400 group-hover:scale-110 transition-transform" />
                     <div className="absolute bottom-1 right-1 text-[8px] bg-white/80 dark:bg-black/50 px-1 rounded">JUNC_02</div>
                  </div>
                </CardContent>
              </Card>

              {/* ── 2. Road Safety Rank ── */}
              <Card className="bg-slate-900 border-slate-800 text-white overflow-hidden relative">
                <CardHeader className="pb-0">
                   <CardTitle className="text-xs uppercase tracking-widest text-slate-400 font-bold">Safety Rank (City)</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6">
                  <div className="text-5xl font-black mb-2 text-emerald-400">9.4<span className="text-lg text-slate-500 font-medium ml-1">/10</span></div>
                  <Badge className="bg-emerald-500 hover:bg-emerald-500 border-0 text-white">LEVEL: VERY SAFE</Badge>
                  <div className="w-full mt-6 space-y-2">
                    <div className="flex justify-between text-[10px] text-slate-400 uppercase"><span>Congestion potential</span><span>LOW</span></div>
                    <Progress value={94} className="h-1 bg-slate-800" />
                  </div>
                </CardContent>
                {/* Visual Accent */}
                <Shield className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 rotate-12" />
              </Card>

              {/* ── 3. Nellai Green Metric ── */}
              <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Leaf className="w-4 h-4 animate-bounce" /> Nellai Green Impact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex justify-between items-end border-b border-emerald-100 dark:border-emerald-800 py-2">
                      <div>
                        <p className="text-[10px] uppercase text-emerald-600/70 font-bold">Fuel Saved (Today)</p>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">412 L</p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-emerald-500 mb-1" />
                   </div>
                   <div className="flex justify-between items-end py-1">
                      <div>
                        <p className="text-[10px] uppercase text-emerald-600/70 font-bold">CO2 Reduction</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">0.92 Tons</p>
                      </div>
                      <p className="text-[10px] font-mono text-emerald-600/50">Simulated Estimate</p>
                   </div>
                </CardContent>
              </Card>

              {/* ── 4. AI 2-Hour Forecast ── */}
              <Card className="bg-blue-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" /> AI Future Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <p className="text-xs text-blue-100 leading-relaxed font-medium">
                      Traffic congestion is predicted to shift toward the **Collector Office** route over the next 2 hours (82% probability). Rerouting alerts are recommended.
                   </p>
                   <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                      <p className="text-[10px] uppercase font-bold opacity-70">Likely Peak Window</p>
                      <p className="text-lg font-bold">18:00 PM — 19:30 PM</p>
                   </div>
                </CardContent>
              </Card>

              {/* ── 5. Trend Analysis ── */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" /> Flow vs Last Week
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="text-3xl font-black text-emerald-500">+12%</div>
                      <div className="text-xs text-slate-500">Peak hour wait time reduction in Nellai Junction area.</div>
                   </div>
                   <div className="w-full h-8 flex items-end gap-1">
                     {[20, 35, 45, 60, 50, 40, 70, 85, 90, 75, 40].map((h, i) => (
                       <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-t-sm h-full relative overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-blue-500/30" style={{ height: `${h}%` }} />
                          {i === 9 && <div className="absolute bottom-0 w-full bg-emerald-500" style={{ height: '75%' }} />}
                       </div>
                     ))}
                   </div>
                   <p className="text-[10px] text-center text-slate-400 font-mono">Real-time Performance Comparison</p>
                </CardContent>
              </Card>

            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {renderTabContent()}
    </div>
  );
}
