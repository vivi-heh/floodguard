
import React from 'react';
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
  Info
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
}

const RiskDashboard: React.FC<Props> = ({ 
  currentData, 
  prediction, 
  reasoning, 
  loading, 
  error, 
  onRetry,
  onDownloadReport
}) => {
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
      name: 'Topographic Runoff Gradient',
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
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 rounded-xl shadow-md border border-blue-900/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Live Weather Telemetry Active</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-800/60 text-blue-200 border border-blue-700">
                  {currentData.liveWeather.source}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-200 mt-0.5">
                {currentData.liveWeather.weatherDescription} • Last updated {currentData.liveWeather.lastUpdated}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span>{currentData.liveWeather.temperature}°C</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <CloudRain className="w-4 h-4 text-blue-400" />
              <span>{currentData.liveWeather.precipitationRate} mm/h</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span>{currentData.liveWeather.humidity}% RH</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Gauge className="w-4 h-4 text-purple-400" />
              <span>{currentData.liveWeather.surfacePressure} hPa</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Wind className="w-4 h-4 text-slate-300" />
              <span>{currentData.liveWeather.windSpeed} km/h</span>
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
                  strokeDashoffset={402 - (402 * prediction.riskScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 leading-none">{prediction.riskScore.toFixed(1)}</span>
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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 leading-none">Multi-Factorial Area Score Decomposition</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  5-Axis Hydrological Synthesis
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Mathematical multi-sensor synthesis mapping atmospheric, riverine, terrain, substrate, and socio-economic variables into the composite area score.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Composite Result:</span>
            <span className="text-sm font-black text-slate-900">{prediction.riskScore.toFixed(1)}/100</span>
            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${getStatusColor(prediction.riskLevel)}`}>
              {prediction.riskLevel}
            </span>
          </div>
        </div>

        {/* 5-Factor Detailed Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {subScoreItems.map((item) => {
            const severity = getFactorSeverity(item.val);
            const { Icon } = item;
            return (
              <div 
                key={item.id} 
                className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${item.color} text-white shadow-2xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                        {item.weight}% Weight
                      </span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${severity.badge}`}>
                      {severity.label}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-slate-900 leading-snug mt-1">{item.name}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
                </div>

                <div className="mt-4 space-y-2.5 pt-3 border-t border-slate-200/70">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Raw Index</span>
                      <span className="text-base font-black text-slate-900">{item.val.toFixed(0)}<span className="text-[10px] text-slate-400 font-medium">/100</span></span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Contribution</span>
                      <span className="text-xs font-black text-blue-600">+{item.pts} pts</span>
                    </div>
                  </div>

                  {/* Severity Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${severity.bar} rounded-full transition-all duration-500`} 
                      style={{ width: `${Math.min(item.val, 100)}%` }} 
                    />
                  </div>

                  {/* Real-Life Telemetry Values Driving this factor */}
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-1">
                    <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider block">Observed Inputs</span>
                    <div className="flex flex-wrap gap-1">
                      {item.telemetry.map((tel, tIdx) => (
                        <span key={tIdx} className="text-[9px] font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                          {tel.label}: <strong className="text-slate-900">{tel.value}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Synthesis Equation & Weighted Stack Breakdown */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-black text-slate-800">Mathematical Model Synthesis</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Score = (Met × 0.34) + (Hydro × 0.20) + (Topo × 0.20) + (Soil × 0.16) + (Socio × 0.10)
              {isFlashFloodBonus ? ' + 12 (Cloudburst Trigger)' : ''}
            </span>
          </div>

          {/* Stacked Proportional Score Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
              {subScoreItems.map((item) => (
                <div 
                  key={item.id}
                  className={`${item.color} h-full transition-all duration-500 relative group`}
                  style={{ width: `${item.pts}%` }}
                  title={`${item.name}: +${item.pts} pts`}
                />
              ))}
              {isFlashFloodBonus && (
                <div 
                  className="bg-red-600 h-full transition-all duration-500" 
                  style={{ width: '12%' }} 
                  title="Cloudburst Valley Trigger: +12 pts" 
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                {subScoreItems.map((item) => (
                  <span key={item.id} className="flex items-center gap-1 font-medium">
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    {item.name.split(' ')[0]}: <strong className="text-slate-800">+{item.pts}</strong>
                  </span>
                ))}
                {isFlashFloodBonus && (
                  <span className="flex items-center gap-1 font-bold text-red-600">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    Cloudburst Surge: +12
                  </span>
                )}
              </div>
              <span className="font-black text-slate-900">
                Sum: {prediction.riskScore.toFixed(1)} / 100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligent AI Reasoning Card */}
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors shadow-xs"
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
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
  );
};

export default RiskDashboard;
