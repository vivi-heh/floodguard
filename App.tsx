
import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_DATA } from './constants';
import { FloodDataPoint, PredictionOutput, AIReasoning, DailyForecast } from './types';
import { predictFloodRisk } from './services/mlEngine';
import { getAIInsights } from './services/geminiService';
import { fetchLiveWeather, reverseGeocode, fetch7DayForecast } from './services/weatherService';
import { downloadJsonReport } from './services/reportGenerator';
import SimulationPanel from './components/SimulationPanel';
import RiskDashboard from './components/RiskDashboard';
import MapContainer from './components/MapContainer';
import LocationSelector from './components/LocationSelector';
import DecisionAssistant from './components/DecisionAssistant';
import ReportModal from './components/ReportModal';
import WeatherForecast7Day from './components/WeatherForecast7Day';
import { 
  Share2, 
  AlertTriangle, 
  Radio, 
  Loader2, 
  CheckCircle2,
  Calendar,
  SlidersHorizontal,
  X
} from 'lucide-react';

const App: React.FC = () => {
  const [dataPoints, setDataPoints] = useState<FloodDataPoint[]>(INITIAL_DATA);
  const [selectedPoint, setSelectedPoint] = useState<FloodDataPoint>(INITIAL_DATA[0]);
  const [prediction, setPrediction] = useState<PredictionOutput>(predictFloodRisk(INITIAL_DATA[0]));
  const [reasoning, setReasoning] = useState<AIReasoning | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isDetectingWeather, setIsDetectingWeather] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [forecast7Day, setForecast7Day] = useState<DailyForecast[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);

  // Core ML Update Logic
  useEffect(() => {
    const result = predictFloodRisk(selectedPoint);
    setPrediction(result);
  }, [selectedPoint]);

  // Fetch 7-Day Forecast
  const loadForecast = useCallback(async (point: FloodDataPoint) => {
    setLoadingForecast(true);
    try {
      const data = await fetch7DayForecast(point.latitude, point.longitude, point);
      setForecast7Day(data);
    } catch (err) {
      console.warn("Failed to load 7-day forecast:", err);
    } finally {
      setLoadingForecast(false);
    }
  }, []);

  useEffect(() => {
    loadForecast(selectedPoint);
  }, [selectedPoint.latitude, selectedPoint.longitude, selectedPoint.rainfall, loadForecast]);

  const fetchAIReasoning = useCallback(async () => {
    setLoadingAI(true);
    setAiError(null);
    try {
      const aiData = await getAIInsights(selectedPoint, prediction);
      setReasoning(aiData);
    } catch (error: any) {
      if (error.message === "QUOTA_EXHAUSTED") {
        setAiError("API rate limit reached. Please wait a moment before retrying.");
      } else {
        setAiError("Failed to fetch AI insights. Check your connection.");
      }
    } finally {
      setLoadingAI(false);
    }
  }, [selectedPoint, prediction.riskLevel]);

  // AI Reasoning Debounced Update
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    timer = setTimeout(fetchAIReasoning, 800);
    return () => clearTimeout(timer);
  }, [fetchAIReasoning]);

  const handleDataChange = useCallback((newData: FloodDataPoint) => {
    setSelectedPoint(newData);
    setDataPoints(prev => prev.map(p => p.id === newData.id ? newData : p));
  }, []);

  // Live Weather Telemetry Detection handler
  const handleDetectLiveWeather = useCallback(async (targetPoint?: FloodDataPoint) => {
    const point = targetPoint || selectedPoint;
    setIsDetectingWeather(true);
    try {
      const live = await fetchLiveWeather(point.latitude, point.longitude);
      const updatedPoint: FloodDataPoint = {
        ...point,
        // Use live precipitation if available or maintain high baseline if ongoing event
        rainfall: live.precipitation24h > 0 
          ? live.precipitation24h 
          : (live.precipitationRate > 0 ? Math.round(live.precipitationRate * 6) : point.rainfall),
        temperature: live.temperature,
        humidity: live.humidity,
        elevation: live.elevation > 0 ? live.elevation : point.elevation,
        liveWeather: live
      };

      setSelectedPoint(updatedPoint);
      setDataPoints(prev => prev.map(p => p.id === point.id ? updatedPoint : p));
      loadForecast(updatedPoint);
    } catch (err) {
      console.error("Live weather detection failed:", err);
    } finally {
      setIsDetectingWeather(false);
    }
  }, [selectedPoint]);

  const handleMapClick = useCallback(async (lat: number, lng: number, placeNameHint?: string) => {
    const newId = `custom-${Date.now()}`;
    setIsDetectingWeather(true);

    const initialPoint: FloodDataPoint = {
      id: newId,
      locationName: placeNameHint || `Catchment (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      latitude: lat,
      longitude: lng,
      rainfall: 45,
      temperature: 24,
      humidity: 70,
      riverDischarge: 1200,
      waterLevel: 2.2,
      elevation: 120,
      landCover: 'Catchment',
      soilType: 'Alluvial',
      populationDensity: 320,
      infrastructureScore: 6,
      historicalFloods: 1
    };

    setDataPoints(prev => [...prev, initialPoint]);
    setSelectedPoint(initialPoint);

    try {
      const [live, placeName] = await Promise.all([
        fetchLiveWeather(lat, lng),
        placeNameHint ? Promise.resolve(placeNameHint) : reverseGeocode(lat, lng)
      ]);

      const enrichedPoint: FloodDataPoint = {
        ...initialPoint,
        locationName: placeName || placeNameHint || initialPoint.locationName,
        rainfall: live.precipitation24h > 0 ? live.precipitation24h : (live.precipitationRate > 0 ? Math.round(live.precipitationRate * 6) : 25),
        temperature: live.temperature,
        humidity: live.humidity,
        elevation: live.elevation > 0 ? live.elevation : 120,
        liveWeather: live
      };

      setSelectedPoint(enrichedPoint);
      setDataPoints(prev => prev.map(p => p.id === newId ? enrichedPoint : p));
      loadForecast(enrichedPoint);
    } catch (err) {
      console.warn("Could not enrich clicked location with live weather:", err);
    } finally {
      setIsDetectingWeather(false);
    }
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Desktop Sidebar Controls (xl+) */}
      <aside className="hidden xl:block w-80 shrink-0 h-full border-r border-slate-200 overflow-y-auto">
        <SimulationPanel
          currentData={selectedPoint}
          onChange={handleDataChange}
          onDetectLiveWeather={() => handleDetectLiveWeather(selectedPoint)}
          isDetectingWeather={isDetectingWeather}
        />
      </aside>

      {/* Mobile & Tablet Drawer Modal (< xl) */}
      {isMobileControlsOpen && (
        <div className="fixed inset-0 z-50 xl:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsMobileControlsOpen(false)} 
          />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span className="font-black text-sm text-slate-900">Hydrological Controls</span>
              </div>
              <button 
                onClick={() => setIsMobileControlsOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Close Controls"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SimulationPanel
                currentData={selectedPoint}
                onChange={handleDataChange}
                onDetectLiveWeather={() => handleDetectLiveWeather(selectedPoint)}
                isDetectingWeather={isDetectingWeather}
              />
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-40 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile Controls Trigger Button */}
            <button
              onClick={() => setIsMobileControlsOpen(true)}
              className="xl:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title="Open Parameter Controls"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Controls</span>
            </button>

            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-xs">
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-none">FloodGuard AI</h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-blue-600" /> Real-Life Model
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 hidden xs:block">
                Area Score & Telemetry System
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Live Weather Trigger */}
            <button
              onClick={() => handleDetectLiveWeather(selectedPoint)}
              disabled={isDetectingWeather}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDetectingWeather ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              )}
              <span className="hidden sm:inline">{isDetectingWeather ? 'Detecting Live...' : 'Detect Live Weather'}</span>
              <span className="sm:hidden">{isDetectingWeather ? 'Live...' : 'Live Weather'}</span>
            </button>

            {/* Quick 7-Day Forecast anchor button */}
            <a
              href="#weather-7day-prediction-section"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Jump to 7-Day Weather & Flood Risk Prediction"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>7-Day Forecast</span>
            </a>

            {/* Export Report Button */}
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 cursor-pointer"
              title="Export Formatted Assessment Report (PDF, Markdown, JSON)"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-700" />
              <span>Export Report</span>
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <LocationSelector
                locations={dataPoints}
                selectedId={selectedPoint.id}
                onSelect={setSelectedPoint}
              />
            </div>
            <div className="lg:col-span-3">
              <MapContainer
                data={dataPoints}
                selectedPoint={selectedPoint}
                onSelectPoint={setSelectedPoint}
                onMapClick={handleMapClick}
              />
            </div>
          </div>

          {/* Dedicated 7-Day Weather & Hydrological Flood Risk Prediction Area */}
          <section id="weather-7day-prediction-section" className="scroll-mt-20">
            <WeatherForecast7Day
              forecasts={forecast7Day}
              locationName={selectedPoint.locationName}
              loading={loadingForecast}
              onRefresh={() => loadForecast(selectedPoint)}
            />
          </section>

          {/* Real-Life Area Score, 5-Axis Multi-Factorial Decomposition & AI Reasoning */}
          <RiskDashboard
            currentData={selectedPoint}
            prediction={prediction}
            reasoning={reasoning}
            loading={loadingAI}
            error={aiError}
            onRetry={fetchAIReasoning}
            onDownloadReport={() => setIsReportModalOpen(true)}
            decisionAssistant={
              <DecisionAssistant
                currentData={selectedPoint}
                prediction={prediction}
              />
            }
          />

          <footer className="pt-8 border-t border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs font-medium">
              <p>© 2026 AI-Enabled Geospatial Flood Risk & Real-Life Detection System</p>
              <div className="flex gap-6">
                <button onClick={() => setIsReportModalOpen(true)} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Download Assessment Report
                </button>
                <span className="text-slate-400">Hydrological Catchment Grid</span>
                <button onClick={() => setIsReportModalOpen(true)} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Model Calibration & Parameters Report
                </button>
              </div>
            </div>
          </footer>
        </div>
      </main>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        data={selectedPoint}
        prediction={prediction}
        reasoning={reasoning}
      />
    </div>
  );
};

export default App;
