import { useState, useCallback, useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  Download, 
  FileText, 
  Share2, 
  Database,
  TrendingUp,
  Sun,
  AlertTriangle,
  Filter,
  Check,
  Copy,
  Code,
  Leaf,
  Shield,
  Activity,
  Clock,
  BarChart3,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAnalyticsData, usePredictiveAnalytics } from '@/hooks/useRealtimeData';
import { peakAnalysisData, vehicleTypes } from '@/data/indianTrafficData';
import { cn } from '@/lib/utils';

const timeRanges = ['Last Hour', 'Last 6h', 'Last 24h', 'Last Week', 'Last Month'];
const peakTabs = ['Today', 'Tomorrow', 'This Week'];

// Generate different data based on time range
const generateDataForRange = (range: string) => {
  const baseData = {
    'Last Hour': { morningRush: 94, eveningRush: 91, peakLevel: 89, multiplier: 1, fuel: 4.2, safety: 9.4 },
    'Last 6h': { morningRush: 88, eveningRush: 85, peakLevel: 82, multiplier: 6, fuel: 28, safety: 9.2 },
    'Last 24h': { morningRush: 82, eveningRush: 79, peakLevel: 75, multiplier: 24, fuel: 115, safety: 9.1 },
    'Last Week': { morningRush: 76, eveningRush: 73, peakLevel: 70, multiplier: 168, fuel: 740, safety: 8.9 },
    'Last Month': { morningRush: 70, eveningRush: 67, peakLevel: 65, multiplier: 720, fuel: 3200, safety: 8.8 },
  };
  return baseData[range as keyof typeof baseData] || baseData['Last Hour'];
};

export function Analytics() {
  const [selectedRange, setSelectedRange] = useState('Last Hour');
  const [selectedPeakTab, setSelectedPeakTab] = useState('Today');
  const { data, currentVolume, congestion } = useAnalyticsData(selectedRange);
  const basePredictions = usePredictiveAnalytics();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Get adjusted predictions based on selected range
  const rangeData = generateDataForRange(selectedRange);
  const predictions = {
    morningRush: { ...basePredictions.morningRush, probability: rangeData.morningRush },
    eveningRush: { ...basePredictions.eveningRush, probability: rangeData.eveningRush },
  };

  // Adjusted peak analysis based on range
  const adjustedPeakData = peakAnalysisData.map(peak => ({
    ...peak,
    congestionLevel: Math.round(peak.congestionLevel * (rangeData.peakLevel / 89))
  }));

  // Scaled and normalized vehicle type distribution
  const scaledVehicleTypes = useMemo(() => {
    const totalProp = vehicleTypes.reduce((acc, curr) => acc + curr.percentage, 0);
    return vehicleTypes.map(v => ({
      ...v,
      count: Math.round((v.percentage / totalProp) * currentVolume)
    }));
  }, [currentVolume]);

  const handleExportCSV = useCallback(() => {
    const csvContent = [
      ['Time', 'Volume', 'Congestion'],
      ...data.map(d => [d.time, d.volume, d.congestion])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-data-${selectedRange.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [data, selectedRange]);

  const handleGeneratePDF = useCallback(() => {
    const reportData = {
      title: 'Traffic Analytics Report',
      generatedAt: new Date().toISOString(),
      range: selectedRange,
      summary: {
        currentVolume,
        congestion,
        totalDataPoints: data.length,
      },
      data,
      predictions,
      peakAnalysis: adjustedPeakData,
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-report-${selectedRange.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('Report downloaded successfully!');
  }, [data, selectedRange, currentVolume, congestion, predictions, adjustedPeakData]);

  const handleShareDashboard = useCallback(() => {
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const url = `${window.location.origin}/shared/${uniqueId}`;
    setShareUrl(url);
    setShareDialogOpen(true);
  }, []);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  }, [shareUrl]);

  // Enhanced data for comparison line (mocked comparison)
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      prevVolume: Math.round(d.volume * (0.85 + Math.random() * 0.15))
    }));
  }, [data]);

  return (
    <div className="p-6 space-y-8">
      {/* ── 1. Top Performance Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Volume</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{currentVolume.toLocaleString()}</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                 <TrendingUp className="w-3 h-3" /> +8.2% vs prev
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fuel Saved (EST)</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{rangeData.fuel} L</p>
              <p className="text-[10px] text-slate-400">Based on AI optimization</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Peak Intensity</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{rangeData.peakLevel}%</p>
              <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${rangeData.peakLevel}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Safety Rank</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{rangeData.safety}<span className="text-xs text-slate-400">/10</span></p>
              <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-0 h-4 px-1.5 uppercase font-black">Stable</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant={selectedRange === range ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedRange(range)}
              className={selectedRange === range 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'text-slate-600 dark:text-slate-400'
              }
            >
              {range}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-500 dark:text-slate-400">{selectedRange}</span>
        </div>
      </div>

      {/* ── 2. Detailed Performance Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Trend Chart */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-slate-500">
              <TrendingUp className="w-4 h-4" /> Traffic Volume Trend
            </CardTitle>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tight">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Current</div>
               <div className="flex items-center gap-1.5 text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-300" /> Previous</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorVolume)" 
                    name="Current Period"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="prevVolume" 
                    stroke="#cbd5e1" 
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    fillOpacity={0} 
                    name="Previous Period"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI Forecast Card */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> AI Forecast Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-5 flex-1">
            {[
              { label: 'Morning Rush Prediction', prob: predictions.morningRush.probability, time: '07:30 - 09:30', color: 'bg-emerald-500' },
              { label: 'Evening Rush Prediction', prob: predictions.eveningRush.probability, time: '17:30 - 19:30', color: 'bg-orange-500' },
              { label: 'Incident Probability', prob: 12, time: 'Low risk expected', color: 'bg-blue-500' }
            ].map((p, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{p.label}</p>
                    <p className="text-[10px] text-slate-400">{p.time}</p>
                  </div>
                  <Badge className={cn("text-[10px] py-0 h-4 border-0", p.prob > 80 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                    {p.prob}%
                  </Badge>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-1000", p.color)} style={{ width: `${p.prob}%` }} />
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-2">
              <Button 
                variant="outline" 
                onClick={() => setForecastDialogOpen(true)}
                className="w-full h-8 text-[10px] gap-2 border-dashed border-slate-300 dark:border-slate-600"
              >
                 View Full Forecasting Model <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Distribution & Analysis Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-slate-500">
              <Filter className="w-4 h-4" /> Vehicle Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={scaledVehicleTypes}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis dataKey="type" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} width={80} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {scaledVehicleTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-slate-500">
              <Activity className="w-4 h-4" /> Adaptive Peak Analysis
            </CardTitle>
            <Tabs value={selectedPeakTab} onValueChange={setSelectedPeakTab}>
              <TabsList className="bg-slate-100 dark:bg-slate-900 h-8 p-1">
                {peakTabs.map(tab => (
                  <TabsTrigger key={tab} value={tab} className="text-[10px] h-6 px-3">{tab}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {adjustedPeakData.map((peak, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">{peak.period}</p>
                    <p className="text-[10px] text-slate-500">{peak.timeRange}</p>
                  </div>
                  <span className="text-xs font-black text-slate-600 dark:text-slate-400">{peak.congestionLevel}%</span>
                </div>
                <Progress value={peak.congestionLevel} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName={cn(peak.congestionLevel > 80 ? "bg-red-500" : "bg-blue-500")} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Junction Leaderboard & System Report ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-700 shadow-sm">
           <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" /> Junction Efficiency Ranking
              </CardTitle>
           </CardHeader>
           <CardContent className="p-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-3 font-bold">Junction Name</th>
                    <th className="px-6 py-3 font-bold">Flow Status</th>
                    <th className="px-6 py-3 font-bold">AI Improvement</th>
                    <th className="px-6 py-3 font-bold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Vannarpettai', status: 'Optimal', improvement: '+14.2%', score: 9.6, color: 'text-emerald-500' },
                    { name: 'Town Arch', status: 'Congested', improvement: '+2.1%', score: 7.2, color: 'text-amber-500' },
                    { name: 'Murugankurichi', status: 'Smooth', improvement: '+11.8%', score: 9.4, color: 'text-emerald-500' },
                    { name: 'Nellai Junction', status: 'High Volume', improvement: '+8.5%', score: 8.8, color: 'text-blue-500' },
                  ].map((j, i) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold">{j.name}</td>
                      <td className="px-6 py-4"><Badge variant="outline" className="text-[9px] h-4 font-bold">{j.status}</Badge></td>
                      <td className="px-6 py-4 text-xs font-black text-emerald-500">{j.improvement}</td>
                      <td className="px-6 py-4 font-mono text-xs font-bold">{j.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-slate-800 shadow-xl relative overflow-hidden">
           <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-400 font-black">Performance Review</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                 <p className="text-[11px] leading-relaxed text-slate-300">
                    The {selectedRange} analysis shows a sustained **8.2% reduction** in peak-hour wait times. Fuel savings estimate: **{rangeData.fuel}L**.
                 </p>
                 <p className="text-[11px] leading-relaxed text-emerald-400 font-bold">
                    AI Analysis: Efficiency holding stable at {rangeData.safety}/10. No manual intervention required.
                 </p>
              </div>
              <Button onClick={handleGeneratePDF} className="w-full bg-blue-600 hover:bg-blue-700 text-[11px] font-bold h-10 mt-2 gap-2 shadow-lg shadow-blue-500/20 uppercase tracking-tighter">
                 <FileText className="w-4 h-4" /> Export JSON Report
              </Button>
           </CardContent>
           <BarChart3 className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5" />
        </Card>
      </div>

      {/* ── 5. Page Actions Footer ── */}
      <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
         <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-[10px] h-8 gap-2 border-slate-200 dark:border-slate-700">
               <Download className="w-3 h-3 text-blue-500" /> EXPORT CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareDashboard} className="text-[10px] h-8 gap-2 border-slate-200 dark:border-slate-700">
               <Share2 className="w-3 h-3 text-purple-500" /> SHARE VIEW
            </Button>
            <Button variant="outline" size="sm" onClick={() => setApiDialogOpen(true)} className="text-[10px] h-8 gap-2 border-slate-200 dark:border-slate-700">
               <Code className="w-3 h-3 text-amber-500" /> API ACCESS
            </Button>
         </div>
         <div className="flex flex-col items-end">
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 uppercase font-bold tracking-tighter">
               <Check className="w-3 h-3 text-emerald-500" /> System Cloud Sync Active
            </p>
            <p className="text-[9px] text-slate-400 font-mono">Last Sync: {new Date().toLocaleTimeString()}</p>
         </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Live Dashboard</DialogTitle>
            <DialogDescription>
              Anyone with this link can view your live dashboard in real-time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 border rounded-lg bg-slate-50 text-sm"
            />
            <Button onClick={copyToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-emerald-700">Link is active and ready to share</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* API Info Dialog */}
      <Dialog open={apiDialogOpen} onOpenChange={setApiDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              API Data Access
            </DialogTitle>
            <DialogDescription>
              Use these RESTful endpoints to access traffic data programmatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-slate-900 rounded-lg">
              <p className="text-emerald-400 text-sm font-mono">GET /api/v1/traffic/current</p>
              <p className="text-slate-400 text-xs mt-1">Get current traffic data for all intersections</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detailed Forecast Model Dialog ── */}
      <Dialog open={forecastDialogOpen} onOpenChange={setForecastDialogOpen}>
        <DialogContent className="max-w-3xl bg-slate-50 dark:bg-slate-900 border-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-xl">
                 <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">AI Traffic Forecast Model</DialogTitle>
                <DialogDescription className="text-xs">Model Version: TNY-CNN-v8.43 (Optimized for Nellai Core)</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {/* 24-Hour Forecast Chart */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-4 tracking-widest">24-Hour Traffic Load Prediction (%)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { t: '12 AM', v: 12 }, { t: '2 AM', v: 8 }, { t: '4 AM', v: 15 },
                    { t: '6 AM', v: 45 }, { t: '8 AM', v: 92 }, { t: '10 AM', v: 75 },
                    { t: '12 PM', v: 62 }, { t: '2 PM', v: 68 }, { t: '4 PM', v: 85 },
                    { t: '6 PM', v: 94 }, { t: '8 PM', v: 65 }, { t: '10 PM', v: 35 },
                  ]}>
                    <defs>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: '#0f172a', color: 'white', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={3} fill="url(#colorForecast)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Confidence & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                 <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Confidence Score</p>
                 <p className="text-2xl font-black text-slate-900 dark:text-white">99.4%</p>
                 <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">High Accuracy Delta</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                 <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Data Sources</p>
                 <p className="text-2xl font-black text-slate-900 dark:text-white">124</p>
                 <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">Active IoT Sensors</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                 <p className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Model State</p>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                    <p className="text-2xl font-black text-slate-900 dark:text-white">Learning</p>
                 </div>
                 <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">Real-time training ON</p>
              </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
               <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Architectural Logic Summary</p>
               <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                 "Our CNN-based recurrent model analyzes historical patterns from the last 14 days and integrates real-time feed from Tirunelveli core junctions. The model currently predicts a high probability of bottlenecking at Vannarpettai Bridge around 6:30 PM due to seasonal shift in evening peak flow."
               </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
