
export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical Flash Flood'
}

export interface LiveWeatherData {
  temperature: number; // °C
  humidity: number; // %
  precipitationRate: number; // mm/hr current
  precipitation24h: number; // mm 24h accumulated
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number; // km/h
  surfacePressure: number; // hPa
  soilMoisture: number; // volumetric fraction 0-1 (m³/m³)
  elevation: number; // m
  isLive: boolean;
  lastUpdated: string;
  source: string;
}

export interface DailyForecast {
  date: string; // "2026-09-19"
  dayLabel: string; // "Today", "Sun 20", etc.
  formattedDate: string; // "Sep 19"
  weatherCode: number;
  weatherDescription: string;
  tempMax: number; // °C
  tempMin: number; // °C
  precipitationSum: number; // mm
  precipitationProbability: number; // %
  windSpeedMax: number; // km/h
  projectedRiskScore: number; // 0-100
  projectedRiskLevel: RiskLevel;
  flashFloodThreat: boolean;
  contributingFactors: string[];
}

export interface DisasterEvent {
  id: string;
  name: string;
  country: string;
  region: string;
  date: string;
  category: 'Flash Flood' | 'Landslide / Torrent' | 'GLOF' | 'Riverine Overflow' | 'Urban Deluge';
  latitude: number;
  longitude: number;
  rainfall24h: number;
  peakDischarge: number;
  peakWaterLevel: number;
  elevation: number;
  fatalities: string;
  impactSummary: string;
  keyDrivers: string[];
  lessonsLearned: string[];
  badgeColor: string;
  dataPoint: FloodDataPoint;
}

export interface FloodDataPoint {
  id: string;
  locationName: string;
  latitude: number;
  longitude: number;
  rainfall: number; // mm
  temperature: number; // °C
  humidity: number; // %
  riverDischarge: number; // m³/s
  waterLevel: number; // m
  elevation: number; // m
  landCover: string;
  soilType: string;
  populationDensity: number;
  infrastructureScore: number; // 1-10
  historicalFloods: number;
  isDisasterBenchmark?: boolean;
  disasterEventId?: string;
  liveWeather?: LiveWeatherData;
}

export interface PredictionOutput {
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  confidenceScore: number; // Telemetry alignment / data completeness score (0-100)
  flashFloodAlert: boolean;
  subScores: {
    meteorologicalHazard: number;
    topographicVulnerability: number;
    soilSaturationRunoff: number;
    hydrologicalStress: number;
    socioInfrastructureExposure: number;
  };
  featureImportance: { name: string; value: number; importance: number }[];
  disasterComparison?: {
    similarPastEvent: string;
    similarityScore: number;
    peakDisasterRainfall: number;
    percentOfDisasterThreshold: number;
  };
}

export interface AIReasoning {
  summary: string;
  contributingFactors: string[];
  recommendations: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
