import type { IndianStateTraffic, Intersection, AnalyticsData, PeakAnalysis, Vehicle, Detection } from '@/types';

export const indianStatesTrafficData: IndianStateTraffic[] = [
  { state: 'Tirunelveli Bypass', city: 'Vannarpettai', activeIntersections: 12, avgCongestion: 78, totalVehicles: 15000, peakHours: ['08:00-10:00', '18:00-20:00'] },
  { state: 'Railway Station Zone', city: 'Tirunelveli Junction', activeIntersections: 8, avgCongestion: 82, totalVehicles: 13000, peakHours: ['08:30-10:30', '17:30-19:30'] },
  { state: 'Palayamkottai Hub', city: 'Murugankurichi', activeIntersections: 15, avgCongestion: 85, totalVehicles: 18000, peakHours: ['07:30-09:30', '16:00-18:00'] },
  { state: 'Vaeinthaankulam Zone', city: 'New Bus Stand', activeIntersections: 7, avgCongestion: 72, totalVehicles: 12000, peakHours: ['08:00-10:00', '19:00-21:00'] },
  { state: 'Nellai Town Zone', city: 'Town Arch', activeIntersections: 10, avgCongestion: 88, totalVehicles: 14000, peakHours: ['09:00-11:00', '17:00-20:00'] },
  { state: 'Old Bus Stand Zone', city: 'VVD Signal', activeIntersections: 6, avgCongestion: 65, totalVehicles: 9000, peakHours: ['08:30-10:30', '17:30-19:30'] },
  { state: 'Madurai Highway', city: 'KTC Nagar', activeIntersections: 9, avgCongestion: 55, totalVehicles: 11000, peakHours: ['08:00-10:00', '17:00-19:00'] },
  { state: 'Tirunelveli Bypass', city: 'Thachanallur Bypass', activeIntersections: 5, avgCongestion: 48, totalVehicles: 7000, peakHours: ['09:00-11:00', '18:00-20:00'] },
];

export const intersections: Intersection[] = [
  { id: 'INT001', name: 'Vannarpettai Signal', location: 'Tirunelveli Bypass Road', status: 'active', vehicles: 2156, waitTime: 5.2, efficiency: 85, congestionLevel: 'high' },
  { id: 'INT002', name: 'Tirunelveli Junction', location: 'Railway Station', status: 'active', vehicles: 1890, waitTime: 4.3, efficiency: 72, congestionLevel: 'high' },
  { id: 'INT003', name: 'Murugankurichi Signal', location: 'Palayamkottai', status: 'active', vehicles: 1567, waitTime: 3.8, efficiency: 78, congestionLevel: 'medium' },
  { id: 'INT004', name: 'New Bus Stand', location: 'Vaeinthaankulam', status: 'active', vehicles: 1121, waitTime: 3.1, efficiency: 92, congestionLevel: 'medium' },
  { id: 'INT005', name: 'Tirunelveli Town', location: 'Nellai Town', status: 'active', vehicles: 1980, waitTime: 4.8, efficiency: 81, congestionLevel: 'high' },
  { id: 'INT006', name: 'KTC Nagar Intersection', location: 'Madurai Highway', status: 'active', vehicles: 987, waitTime: 2.1, efficiency: 88, congestionLevel: 'low' },
  { id: 'INT007', name: 'Thachanallur Bypass', location: 'Madurai Road', status: 'active', vehicles: 876, waitTime: 1.8, efficiency: 94, congestionLevel: 'low' },
  { id: 'INT008', name: 'Palayamkottai Market', location: 'Samathanapuram', status: 'active', vehicles: 765, waitTime: 1.5, efficiency: 96, congestionLevel: 'low' },
];

export const generateHourlyTrafficData = (range: string = 'Last Hour'): AnalyticsData[] => {
  const data: AnalyticsData[] = [];
  const baseTime = new Date();
  let hours = 15;
  let interval = 1;
  
  switch(range) {
    case 'Last Hour':
      hours = 12;
      interval = 5;
      break;
    case 'Last 6h':
      hours = 18;
      interval = 20;
      break;
    case 'Last 24h':
      hours = 24;
      interval = 60;
      break;
    case 'Last Week':
      hours = 7;
      interval = 1440;
      break;
    case 'Last Month':
      hours = 30;
      interval = 1440;
      break;
  }
  
  for (let i = 0; i < hours; i++) {
    const time = new Date(baseTime.getTime() - (hours - i) * interval * 60 * 1000);
    const hour = time.getHours();
    let baseVolume = 400;
    
    if (hour >= 8 && hour <= 10) baseVolume = 1100 + Math.random() * 200;
    else if (hour >= 17 && hour <= 19) baseVolume = 1200 + Math.random() * 200;
    else if (hour >= 11 && hour <= 16) baseVolume = 700 + Math.random() * 150;
    else baseVolume = 300 + Math.random() * 100;
    
    const timeLabel = range === 'Last Week' || range === 'Last Month' 
      ? time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : `${hour.toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    
    data.push({
      time: timeLabel,
      volume: Math.round(baseVolume),
      congestion: Math.round((baseVolume / 1500) * 100),
    });
  }
  return data;
};

export const peakAnalysisData: PeakAnalysis[] = [
  { period: 'Morning Rush', timeRange: '07:00 - 10:00', congestionLevel: 89 },
  { period: 'Evening Rush', timeRange: '16:00 - 20:00', congestionLevel: 94 },
];

export const vehicleTypes = [
  { type: 'Car', count: 15678, percentage: 45 },
  { type: 'Motorcycle', count: 8923, percentage: 26 },
  { type: 'Bus', count: 2134, percentage: 6 },
  { type: 'Truck', count: 3456, percentage: 10 },
  { type: 'Auto Rickshaw', count: 4567, percentage: 13 },
];

export const generateVehicles = (): Vehicle[] => {
  const vehicles: Vehicle[] = [];
  const types: Array<'car' | 'bus' | 'truck' | 'bike' | 'person' | 'ambulance' | 'other'> = 
    ['car', 'car', 'car', 'bike', 'bike', 'bus', 'truck', 'person', 'person', 'ambulance'];
  
  for (let i = 0; i < 15; i++) {
    const direction = ['N', 'S', 'E', 'W'][Math.floor(Math.random() * 4)] as 'N' | 'S' | 'E' | 'W';
    let x = 50, y = 50;
    
    if (direction === 'N') { x = 48 + Math.random() * 4; y = 80 + Math.random() * 15; }
    else if (direction === 'S') { x = 48 + Math.random() * 4; y = 5 + Math.random() * 15; }
    else if (direction === 'E') { x = 5 + Math.random() * 15; y = 48 + Math.random() * 4; }
    else { x = 80 + Math.random() * 15; y = 48 + Math.random() * 4; }
    
    vehicles.push({
      id: `veh-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      x,
      y,
      direction,
      speed: 0.3 + Math.random() * 0.4,
      detected: true,
      confidence: 0.6 + Math.random() * 0.35,
    });
  }
  return vehicles;
};

export const generateDetections = (): Detection[] => {
  const types: Array<'car' | 'bus' | 'truck' | 'bike' | 'person' | 'ambulance' | 'other'> = 
    ['car', 'car', 'car', 'bike', 'bike', 'bus', 'truck', 'person', 'person'];
  const detections: Detection[] = [];
  
  for (let i = 0; i < 12; i++) {
    detections.push({
      id: `det-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      confidence: 0.65 + Math.random() * 0.3,
      bbox: {
        x: 10 + Math.random() * 70,
        y: 10 + Math.random() * 60,
        width: 40 + Math.random() * 40,
        height: 30 + Math.random() * 30,
      },
    });
  }
  return detections;
};

export const getTrafficPrediction = (hour: number) => {
  if (hour >= 7 && hour <= 10) return { level: 'High', probability: 94, status: 'critical' };
  if (hour >= 17 && hour <= 20) return { level: 'High', probability: 91, status: 'critical' };
  if (hour >= 11 && hour <= 16) return { level: 'Medium', probability: 52, status: 'warning' };
  return { level: 'Low', probability: 28, status: 'good' };
};

export const defaultUserProfile = {
  firstName: 'Sutha',
  lastName: '',
  email: 'sutha@traffical.com',
  organization: 'Traffic Control Department',
  avatar: '',
  verified: true,
};

export const defaultNotifications = [
  { id: '1', title: 'High Congestion Alert', message: 'Vannarpettai Signal experiencing 89% congestion', type: 'warning' as const, timestamp: new Date(), read: false },
  { id: '2', title: 'Emergency Vehicle Detected', message: 'Ambulance approaching Tirunelveli Junction', type: 'critical' as const, timestamp: new Date(Date.now() - 300000), read: false },
  { id: '3', title: 'System Update', message: 'YOLOv8 AI traffic model updated successfully', type: 'info' as const, timestamp: new Date(Date.now() - 600000), read: true },
];
