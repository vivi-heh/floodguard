
import React, { useState } from 'react';
import { RiskLevel, PredictionOutput, AIReasoning, FloodDataPoint } from '../types';
import { 
  ShieldAlert, 
  BrainCircuit, 
  Activity, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle,
  Radio,
  CloudRain,
  Thermometer,
  Gauge,
  Droplets,
  Wind,
  Layers,
  AlertTriangle,
  Download,
  BarChart3,
  Mountain,
  Waves,
  Building2,
  Calculator,
  Info,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import FeatureImportanceChart from './FeatureImportanceChart';

interface Props {
  currentData?: FloodDataPoint;
  prediction: PredictionOutput;
  reasoning: AIReasoning | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onDownloadReport?: () => void;
  decisionAssistant?: React.ReactNode;
}

const RiskDashboard: React.FC<Props> = ({ 
  currentData, 
  prediction, 
  reasoning, 
  loading, 
  error, 
  onRetry,
  onDownloadReport,
  decisionAssistant
}) => {
  const [decompositionView, setDecompositionView] = useState<'grid' | 'table'>('grid');
  const getStatusColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.CRITICAL: return 'bg-red-700 text-white border-red-800';
      case RiskLevel.HIGH: return 'bg-rose-600 text-white border-rose-700';
      case RiskLevel.MEDIUM: return 'bg-orange-500 text-white border-orange-600';
      case RiskLevel.LOW: return 'bg-emerald-600 text-white border-emerald-700';
      default: return 'bg-slate-500 text-white border-slate-600';
    }
  };

  const subScores = prediction.subScores || {
    meteorologicalHazard: 50,
    topographicVulnerability: 50,
    soilSaturationRunoff: 50,
    hydrologicalStress: 50,
    socioInfrastructureExposure: 50
  };

  const isMountainValley = (currentData?.elevation ?? 0) >= 400;
  const isCloudburst = (currentData?.rainfall ?? 0) >= 180 || ((currentData?.liveWeather?.precipitationRate ?? 0) >= 20);
  const isFlashFloodBonus = isMountainValley && isCloudburst;

  const getFactorSeverity = (val: number) => {
    if (val >= 78) return { label: 'Critical Hazard', badge: 'bg-red-100 text-red-800 border-red-200', bar: 'bg-red-600' };
    if (val >= 62) return { label: 'Elevated Stress', badge: 'bg-rose-100 text-rose-800 border-rose-200', bar: 'bg-rose-500' };
    if (val >= 38) return { label: 'Moderate Load', badge: 'bg-amber-100 text-amber-800 border-amber-200', bar: 'bg-amber-500' };
    return { label: 'Normal / Low', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500' };
  };

  const subScoreItems = [
    {
      id: 'met',
      name: 'Meteorological Hazard',
      val: subScores.meteorologicalHazard,
      weight: 34,
      pts: Math.round(subScores.meteorologicalHazard * 0.34 * 10) / 10,
      desc: '24h precipitation, storm intensity & humidity',
      Icon: CloudRain,
      color: 'bg-blue-600',
      telemetry: [
        { label: 'Rainfall', value: `${currentData?.rainfall ?? 0} mm` },
        { label: 'Rate', value: `${currentData?.liveWeather?.precipitationRate ?? 0} mm/h` },
        { label: 'Humidity', value: `${currentData?.humidity ?? 0}%` }
      ]
    },
    {
      id: 'hydro',
      name: 'Hydrological Riverine Stress',
      val: subScores.hydrologicalStress,
      weight: 20,
      pts: Math.round(subScores.hydrologicalStress * 0.20 * 10) / 10,
      desc: 'Channel discharge velocity & water level stage',
      Icon: Waves,
      color: 'bg-cyan-600',
      telemetry: [
        { label: 'Discharge', value: `${(currentData?.riverDischarge ?? 0).toLocaleString()} m³/s` },
        { label: 'Water Level', value: `${currentData?.waterLevel ?? 0} m` }
      ]
    },
    {
      id: 'topo',
      name: 'Topographic Slope & Elevation',
      val: subScores.topographicVulnerability,
      weight: 20,
      pts: Math.round(subScores.topographicVulnerability * 0.20 * 10) / 10,
      desc: 'Elevation slope concavity & valley funneling',
      Icon: Mountain,
      color: 'bg-indigo-600',
      telemetry: [
        { label: 'Elevation', value: `${currentData?.elevation ?? 0} m` },
        { label: 'Terrain', value: (currentData?.elevation ?? 0) <= 25 ? 'Coastal / Delta' : (currentData?.elevation ?? 0) >= 400 ? 'Valley Funnel' : 'Inland Basin' }
      ]
    },
    {
      id: 'soil',
      name: 'Soil Saturation & Runoff',
      val: subScores.soilSaturationRunoff,
      weight: 16,
      pts: Math.round(subScores.soilSaturationRunoff * 0.16 * 10) / 10,
      desc: 'Pore-water pressure & substrate permeability',
      Icon: Droplets,
      color: 'bg-amber-600',
      telemetry: [
        { label: 'Soil Type', value: currentData?.soilType || 'Alluvial' },
        { label: 'Moisture', value: `${Math.round(((currentData?.liveWeather?.soilMoisture ?? 0.28) / 0.45) * 100)}% cap` }
      ]
    },
    {
      id: 'socio',
      name: 'Socio-Infrastructure Exposure',
      val: subScores.socioInfrastructureExposure,
      weight: 10,
      pts: Math.round(subScores.socioInfrastructureExposure * 0.10 * 10) / 10,
      desc: 'Population density vs. drainage mitigation rating',
      Icon: Building2,
      color: 'bg-purple-600',
      telemetry: [
        { label: 'Density', value: `${(currentData?.populationDensity ?? 0).toLocaleString()}/km²` },
        { label: 'Drainage Score', value: `${currentData?.infrastructureScore ?? 5}/10` }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Live Weather Telemetry Header Bar if active */}
      {currentData?.liveWeather?.isLive && (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Live Weather Telemetry Active</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  {currentData.liveWeather.source}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">
                {currentData.liveWeather.weatherDescription} • <span className="text-slate-400 font-normal">Last updated {currentData.liveWeather.lastUpdated}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold">{currentData.liveWeather.temperature}°C</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <CloudRain className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="font-semibold">{currentData.liveWeather.precipitationRate} mm/h</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-semibold">{currentData.liveWeather.humidity}% RH</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <Gauge className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="font-semibold">{currentData.liveWeather.surfacePressure} hPa</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <Wind className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="font-semibold">{currentData.liveWeather.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Area Score & XAI Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 leading-none">Real-Life Area Score Detection</h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                    <Radio className="w-3 h-3 text-blue-600" /> Multi-Parametric Hydrological Model
                  </span>
                </div>
              </div>
              <div className={`${getStatusColor(prediction.riskLevel)} px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs`}>
                {prediction.riskLevel}
              </div>
            </div>

            {prediction.flashFloodAlert && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 rounded-r-lg flex items-start gap-2.5 text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">Flash Flood & Surge Alert Triggered</p>
                  <p className="text-[11px] text-red-700 mt-0.5 leading-tight">
                    Precipitation rate and topographical runoff gradient mirror recent flash flood trigger thresholds.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center py-3">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72" cy="72" r="64"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="10"
                />
                <circle
                  cx="72" cy="72" r="64"
                  fill="transparent"
                  stroke={
                    prediction.riskLevel === RiskLevel.CRITICAL ? '#b91c1c' :
                    prediction.riskLevel === RiskLevel.HIGH ? '#e11d48' :
                    prediction.riskLevel === RiskLevel.MEDIUM ? '#f97316' : '#059669'
                  }
                  strokeWidth="10"
                  strokeDasharray={402}
                  strokeDashoffset={402 - (402 * Math.min(prediction?.riskScore ?? 0, 100)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 leading-none">{(prediction?.riskScore ?? 0).toFixed(1)}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Area Risk Score</span>
                <span className="text-[9px] font-black text-blue-600 mt-0.5">Scale 0–100</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Verification Basis</span>
              <span className="font-bold text-slate-800">CWC / Multi-Sensor DEM</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Analysis Mode</span>
              <span className="font-bold text-blue-600">Multi-Parametric Ensemble</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-600" />
              <div>
                <h3 className="font-bold text-slate-900 leading-none">Explainable AI (XAI)</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dynamic Factor Weights</span>
              </div>
            </div>
          </div>
          <FeatureImportanceChart data={prediction.featureImportance} />
        </div>
      </div>

      {/* 5-Axis Real-Life Area Score Decomposition */}
      <div className="bg-white p-5 sm:p-6 rounded-xl shadow-xs border border-slate-200 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shrink-0 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">Multi-Factorial Area Score Decomposition</h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  5-Axis Hydrological Synthesis
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-normal">
                Mathematical multi-sensor synthesis mapping atmospheric, riverine, terrain, substrate, and socio-economic variables into the composite area score.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
            {/* View Mode Toggle: Cards vs Table */}
            <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
              <button
                onClick={() => setDecompositionView('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  decompositionView === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="View as 5-Axis Responsive Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card Deck</span>
              </button>
              <button
                onClick={() => setDecompositionView('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  decompositionView === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="View as Hydrological Matrix Table"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Matrix Table</span>
              </button>
            </div>

            {onDownloadReport && (
              <button
                onClick={onDownloadReport}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                title="Download Comprehensive Assessment Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Report</span>
              </button>
            )}

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Composite:</span>
              <span className="text-sm font-black text-slate-900">{(prediction?.riskScore ?? 0).toFixed(1)}/100</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${getStatusColor(prediction.riskLevel)}`}>
                {prediction.riskLevel}
              </span>
            </div>
          </div>
        </div>

        {decompositionView === 'grid' ? (
          /* 5-Factor Detailed Cards (Desktop-Optimized 5-Column Grid) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-stretch">
            {subScoreItems.map((item) => {
              const severity = getFactorSeverity(item?.val ?? 0);
              const { Icon } = item;
              const factorBorderColor = 
                item.id === 'met' ? 'border-t-blue-600' :
                item.id === 'hydro' ? 'border-t-cyan-600' :
                item.id === 'topo' ? 'border-t-indigo-600' :
                item.id === 'soil' ? 'border-t-amber-600' : 'border-t-purple-600';

              return (
                <div 
                  key={item.id} 
                  className={`bg-slate-50/70 p-3.5 lg:p-4 rounded-xl border border-slate-200 border-t-4 ${factorBorderColor} flex flex-col justify-between hover:border-slate-300 hover:bg-white hover:shadow-md transition-all duration-200 h-full`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`p-1.5 rounded-lg ${item.color} text-white shadow-2xs shrink-0`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shadow-2xs whitespace-nowrap">
                          {item.weight}% Wt
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shadow-2xs whitespace-nowrap shrink-0 ${severity.badge}`}>
                        {severity.label}
                      </span>
                    </div>

                    <h4 className="text-xs lg:text-[13px] font-black text-slate-900 leading-snug tracking-tight mt-1">{item.name}</h4>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5 h-8 line-clamp-2">{item.desc}</p>
                  </div>

                  <div className="mt-3 space-y-2 pt-2.5 border-t border-slate-200/90">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Raw Index</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-base font-black text-slate-900">{(item?.val ?? 0).toFixed(0)}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">/100</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Added Pts</span>
                        <span className="text-xs font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 block mt-0.5">
                          +{(item?.pts ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Severity Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full ${severity.bar} rounded-full transition-all duration-500 shadow-xs`} 
                        style={{ width: `${Math.min(item?.val ?? 0, 100)}%` }} 
                      />
                    </div>

                    {/* Real-Life Telemetry Values Driving this factor */}
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Observed Sensors</span>
                        <span className="text-[8px] text-slate-400 font-semibold">Live Feed</span>
                      </div>
                      <div className="flex flex-col divide-y divide-slate-50">
                        {item.telemetry.map((tel, tIdx) => (
                          <div key={tIdx} className="text-[9px] font-medium text-slate-600 flex justify-between items-center py-0.5 gap-1">
                            <span className="text-slate-500 truncate">{tel.label}</span>
                            <span className="text-slate-900 font-bold bg-slate-50 px-1 py-0.2 rounded border border-slate-100 shrink-0">{tel.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Hydrological Matrix Table (High-Density Desktop Table View) */
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Hydrological Axis</th>
                  <th className="py-3 px-3">Model Weight</th>
                  <th className="py-3 px-3">Raw Hazard Index</th>
                  <th className="py-3 px-3">Added Points</th>
                  <th className="py-3 px-4">Driving Sensor Telemetry</th>
                  <th className="py-3 px-3 text-right">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subScoreItems.map((item) => {
                  const severity = getFactorSeverity(item?.val ?? 0);
                  const { Icon } = item;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${item.color} text-white shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.weight}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1">
                            <span className="font-black text-slate-900 text-sm">{(item?.val ?? 0).toFixed(0)}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">/100</span>
                          </div>
                          <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full ${severity.bar}`} style={{ width: `${Math.min(item?.val ?? 0, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-black text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                          +{(item?.pts ?? 0).toFixed(1)} pts
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.telemetry.map((tel, tIdx) => (
                            <span key={tIdx} className="text-[10px] bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded">
                              <span className="text-slate-400 mr-1">{tel.label}:</span>
                              <strong>{tel.value}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md border inline-block ${severity.badge}`}>
                          {severity.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50/90 font-bold border-t border-slate-200 text-slate-800">
                <tr>
                  <td className="py-3 px-4 text-xs font-black uppercase text-slate-700">Total Model Synthesis</td>
                  <td className="py-3 px-3 text-xs font-black text-slate-900">100% Wt</td>
                  <td className="py-3 px-3 text-xs text-slate-500">—</td>
                  <td className="py-3 px-3 text-xs font-black text-blue-700">
                    = {(prediction?.riskScore ?? 0).toFixed(1)} pts
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-right">
                    <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded ${getStatusColor(prediction.riskLevel)}`}>
                      {prediction.riskLevel} COMPOSITE RISK
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Synthesis Equation & Weighted Stack Breakdown */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-none">Mathematical Model Synthesis Formula</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Linear weighted summation of calibrated geospatial hydrology axes</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-xs overflow-x-auto shadow-2xs">
              <span className="font-semibold text-blue-700">Area Score</span> = (Met × 0.34) + (Hydro × 0.20) + (Topo × 0.20) + (Soil × 0.16) + (Socio × 0.10)
              {isFlashFloodBonus && <span className="text-red-600 font-bold ml-1.5 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">+ 12 (Flash Surge Trigger)</span>}
            </div>
          </div>

          {/* Stacked Proportional Score Bar */}
          <div className="space-y-2">
            <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              {subScoreItems.map((item) => (
                <div 
                  key={item.id}
                  className={`${item.color} h-full transition-all duration-500`}
                  style={{ width: `${Math.max(item.pts, 2)}%` }}
                  title={`${item.name}: +${item.pts} pts`}
                />
              ))}
              {isFlashFloodBonus && (
                <div 
                  className="bg-red-600 h-full transition-all duration-500" 
                  style={{ width: '12%' }} 
                  title="Flash Surge Trigger: +12 pts" 
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {subScoreItems.map((item) => (
                  <span key={item.id} className="flex items-center gap-1 font-medium whitespace-nowrap">
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    {item.name.split(' ')[0]}: <strong className="text-slate-800">+{item.pts}</strong>
                  </span>
                ))}
                {isFlashFloodBonus && (
                  <span className="flex items-center gap-1 font-bold text-red-600 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    Surge: +12
                  </span>
                )}
              </div>
              <span className="font-black text-slate-900 text-xs self-end sm:self-auto bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                Sum: {(prediction?.riskScore ?? 0).toFixed(1)} / 100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligent AI Reasoning Card + Emergency Decision Assistant in Computer View */}
      <div className={decisionAssistant ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" : ""}>
        <div className={decisionAssistant ? "lg:col-span-2" : ""}>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Intelligent Risk Reasoning & Action Plan</h3>
              </div>
              <div className="flex items-center gap-3">
                {onDownloadReport && (
                  <button
                    onClick={onDownloadReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors shadow-xs cursor-pointer"
                    title="Download Comprehensive Assessment Report"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Report</span>
                  </button>
                )}
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                    <span className="text-xs text-blue-600 font-medium">Synthesizing meteorological model...</span>
                  </div>
                )}
              </div>
            </div>

            {error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                <p className="text-slate-600 text-sm mb-4 max-w-md">{error}</p>
                <button 
                  onClick={onRetry}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Retry AI Analysis
                </button>
              </div>
            ) : reasoning ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <p className="text-slate-700 text-sm leading-relaxed mb-4">
                    {reasoning.summary}
                  </p>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Drivers</h4>
                    <div className="flex flex-wrap gap-2">
                      {reasoning.contributingFactors.map((factor, idx) => (
                        <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-md flex items-center gap-2">
                          <Activity className="w-3 h-3 text-blue-500" />
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Priority Safety Recommendations</h4>
                  <ul className="space-y-3">
                    {reasoning.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                <BrainCircuit className="w-12 h-12 mb-2 text-slate-300" />
                <p className="text-sm">Initiating AI Reasoning...</p>
              </div>
            )}
          </div>
        </div>

        {decisionAssistant && (
          <div className="lg:col-span-1">
            {decisionAssistant}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskDashboard;
