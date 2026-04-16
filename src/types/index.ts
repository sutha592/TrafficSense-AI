export interface TrafficMetric {
  label: string;
  value: string;
  subValue: string;
  status: 'healthy' | 'warning' | 'critical' | 'good';
  icon: string;
}

export interface SystemStatus {
  cpu: number;
  memory: number;
  network: number;
}

export interface Intersection {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  vehicles: number;
  waitTime: number;
  efficiency: number;
  congestionLevel: 'low' | 'medium' | 'high';
}

export interface TrafficLight {
  direction: 'N' | 'S' | 'E' | 'W';
  state: 'red' | 'yellow' | 'green';
  timer: number;
}

export interface Vehicle {
  id: string;
  type: 'car' | 'bus' | 'truck' | 'bike' | 'person' | 'ambulance' | 'other';
  x: number;
  y: number;
  direction: 'N' | 'S' | 'E' | 'W';
  speed: number;
  detected: boolean;
  confidence: number;
}

export interface CameraFeed {
  id: string;
  name: string;
  location: string;
  isLive: boolean;
  vehiclesDetected: number;
  fps: number;
  device: string;
  detections: Detection[];
}

export interface Detection {
  id: string;
  type: 'car' | 'bus' | 'truck' | 'bike' | 'person' | 'ambulance' | 'other';
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface AnalyticsData {
  time: string;
  volume: number;
  congestion: number;
}

export interface PredictiveAnalytics {
  morningRush: {
    probability: number;
    peakTime: string;
    status: string;
  };
  weatherImpact: {
    impact: number;
    condition: string;
    status: string;
  };
  incidentProbability: {
    probability: number;
    status: string;
  };
}

export interface PeakAnalysis {
  period: string;
  timeRange: string;
  congestionLevel: number;
}

export interface IndianStateTraffic {
  state: string;
  city: string;
  activeIntersections: number;
  avgCongestion: number;
  totalVehicles: number;
  peakHours: string[];
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  avatar: string;
  verified: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: Date;
  read: boolean;
}

export interface DataExport {
  id: string;
  type: 'csv' | 'pdf' | 'api';
  name: string;
  timestamp: Date;
  size: string;
  url: string;
}
