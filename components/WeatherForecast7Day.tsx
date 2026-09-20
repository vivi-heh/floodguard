import React, { useState } from 'react';
import { DailyForecast, RiskLevel } from '../types';
import { 
  CloudRain, 
  Sun, 
  CloudSun, 
  CloudLightning, 
  Cloud, 
  Wind, 
  Droplets, 
  AlertTriangle, 
  Calendar, 
  RefreshCw, 
  ArrowUpRight, 
  Waves, 
  CheckCircle2,
  Info
} from 'lucide-react';

interface Props {
  forecasts: DailyForecast[];
  locationName: string;
  loading: boolean;
  onRefresh: () => void;
}

export const WeatherForecast7Day: React.FC<Props> = ({
  forecasts,
  locationName,
  loading,
  onRefresh
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-6 h-6 text-amber-500" />;
    if (code === 1 || code === 2) return <CloudSun className="w-6 h-6 text-amber-400" />;
    if (code === 3 || code === 45 || code === 48) return <Cloud className="w-6 h-6 text-slate-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-6 h-6 text-blue-500" />;
    if (code >= 80 && code <= 82) return <CloudRain className="w-6 h-6 text-blue-600" />;
    if (code >= 95) return <CloudLightning className="w-6 h-6 text-purple-600" />;
    return <CloudRain className="w-6 h-6 text-blue-500" />;
  };

  const getRiskBadgeColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-300';
      case RiskLevel.HIGH:
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case RiskLevel.MEDIUM:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case RiskLevel.LOW:
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  const getRiskBarColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.CRITICAL: return 'bg-red-600';
      case RiskLevel.HIGH: return 'bg-rose-500';
      case RiskLevel.MEDIUM: return 'bg-amber-500';
      case RiskLevel.LOW:
      default: return 'bg-emerald-500';
    }
  };

  if (!forecasts || forecasts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
        <p className="text-sm text-slate-500 font-medium">Fetching 7-day meteorological forecast...</p>
      </div>
    );
  }

  const selectedDay = forecasts[selectedDayIndex] || forecasts[0];

  // Aggregated 7-day summary metrics
  const total7DayRain = Math.round(forecasts.reduce((acc, f) => acc + f.precipitationSum, 0) * 10) / 10;
  const peakRainDay = [...forecasts].sort((a, b) => b.precipitationSum - a.precipitationSum)[0];
  const maxRiskDay = [...forecasts].sort((a, b) => b.projectedRiskScore - a.projectedRiskScore)[0];
  const maxRainVal = Math.max(...forecasts.map(f => f.precipitationSum), 40);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Header & Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              7-Day Weather & Hydrological Flood Risk Forecast
            </h2>
            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Lookahead Ensemble
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Predictive precipitation sequencing and projected catchment flood hazard for <span className="font-semibold text-slate-700">{locationName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 bg-slate-50 border border-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Update 7-day atmospheric telemetry forecast"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Forecast'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">7-Day Cumulative Rain</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-slate-900">{total7DayRain}</span>
            <span className="text-xs font-bold text-slate-500">mm total</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Peak Inundation Day</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-slate-900">{peakRainDay.dayLabel}</span>
            <span className="text-xs font-bold text-blue-600">({peakRainDay.precipitationSum} mm)</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Maximum Projected Hazard</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-slate-900">{(maxRiskDay?.projectedRiskScore ?? 0).toFixed(0)}/100</span>
            <span className={`text-xs font-black uppercase ${maxRiskDay?.projectedRiskLevel === RiskLevel.CRITICAL ? 'text-red-600' : maxRiskDay?.projectedRiskLevel === RiskLevel.HIGH ? 'text-rose-600' : maxRiskDay?.projectedRiskLevel === RiskLevel.MEDIUM ? 'text-amber-600' : 'text-emerald-600'}`}>
              • {maxRiskDay?.projectedRiskLevel ?? 'Low'}
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Interactive Card Carousel / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {forecasts.map((day, idx) => {
          const isSelected = selectedDayIndex === idx;
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDayIndex(idx)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-black text-slate-900">{day.dayLabel}</span>
                  <span className="text-[10px] font-medium text-slate-400">{day.formattedDate}</span>
                </div>

                <div className="my-2 flex items-center justify-between">
                  <div className="p-1 rounded-lg bg-white/80 shadow-2xs">
                    {getWeatherIcon(day.weatherCode)}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">{day.tempMax}°</span>
                    <span className="text-[10px] font-medium text-slate-400 block">{day.tempMin}°</span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-600 font-medium line-clamp-1 mb-2" title={day.weatherDescription}>
                  {day.weatherDescription}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-blue-700 font-bold">
                    <Droplets className="w-3 h-3 text-blue-500 shrink-0" />
                    {day.precipitationSum} mm
                  </span>
                  <span className="text-slate-400 font-medium">
                    {day.precipitationProbability}%
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[9px] font-bold mb-1">
                    <span className="text-slate-500">Risk Score</span>
                    <span className="text-slate-900 font-black">{(day?.projectedRiskScore ?? 0).toFixed(0)}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getRiskBarColor(day.projectedRiskLevel)} rounded-full`}
                      style={{ width: `${Math.min(day?.projectedRiskScore ?? 0, 100)}%` }}
                    />
                  </div>
                </div>

                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded block text-center border ${getRiskBadgeColor(day.projectedRiskLevel)}`}>
                  {day.projectedRiskLevel === RiskLevel.CRITICAL ? 'Critical' : day.projectedRiskLevel}
                </span>

                {day.flashFloodThreat && (
                  <div className="flex items-center justify-center gap-1 text-[9px] font-black text-red-600 bg-red-50 py-0.5 rounded border border-red-200">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Cloudburst Threat</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Detailed Breakdown & 7-Day Trajectory Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Selected Day Inspection */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Day Details</span>
                <h3 className="text-sm font-black text-slate-900">
                  {selectedDay.dayLabel} ({selectedDay.formattedDate})
                </h3>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getRiskBadgeColor(selectedDay.projectedRiskLevel)}`}>
                {selectedDay.projectedRiskLevel} Flood Risk
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Atmospheric state: <strong className="text-slate-800">{selectedDay.weatherDescription}</strong> with {selectedDay.precipitationSum} mm anticipated precipitation.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs mb-4">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block">Rain Accumulation</span>
                <span className="text-sm font-black text-blue-600">{selectedDay.precipitationSum} mm</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block">Precipitation Chance</span>
                <span className="text-sm font-black text-slate-800">{selectedDay.precipitationProbability}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block">Temperature Range</span>
                <span className="text-sm font-black text-slate-800">{selectedDay.tempMin}°C - {selectedDay.tempMax}°C</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block">Wind Speed Gusts</span>
                <span className="text-sm font-black text-slate-800">{selectedDay.windSpeedMax} km/h</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Hydrological Drivers for this Day</span>
              <ul className="space-y-1 text-xs text-slate-600">
                {selectedDay.contributingFactors.map((factor, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Select any card above to examine that day's hydrological projection.</span>
          </div>
        </div>

        {/* Visual 7-Day Rainfall & Risk Trajectory Chart */}
        <div className="lg:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">7-Day Trajectory Graph</span>
                <h3 className="text-sm font-black text-slate-900">Precipitation Volume & Projected Flood Hazard</h3>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                  Precipitation (mm)
                </span>
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                  Projected Risk Score (0-100)
                </span>
              </div>
            </div>

            {/* Custom High-Contrast SVG / HTML Chart */}
            <div className="mt-4">
              <div className="h-44 w-full flex items-end gap-3 px-2 pb-6 pt-2 relative border-b border-slate-200">
                {/* Reference line for Critical Risk (78) */}
                <div 
                  className="absolute left-0 right-0 border-b border-dashed border-red-300 pointer-events-none z-10 flex items-center justify-end pr-2"
                  style={{ bottom: `${(78 / 100) * 140}px` }}
                >
                  <span className="text-[9px] font-bold text-red-500 bg-white/90 px-1 rounded shadow-2xs">
                    Critical Flood Threshold (78)
                  </span>
                </div>

                {/* Reference line for High Risk (62) */}
                <div 
                  className="absolute left-0 right-0 border-b border-dashed border-amber-300 pointer-events-none z-10 flex items-center justify-end pr-2"
                  style={{ bottom: `${(62 / 100) * 140}px` }}
                >
                  <span className="text-[9px] font-bold text-amber-500 bg-white/90 px-1 rounded shadow-2xs">
                    High Threshold (62)
                  </span>
                </div>

                {forecasts.map((day, idx) => {
                  const rainHeightPercent = Math.min((day.precipitationSum / maxRainVal) * 100, 100);
                  const riskHeightPercent = Math.min(day.projectedRiskScore, 100);
                  const isCurrent = selectedDayIndex === idx;

                  return (
                    <div 
                      key={day.date} 
                      className={`flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group ${isCurrent ? 'opacity-100' : 'opacity-85 hover:opacity-100'}`}
                      onClick={() => setSelectedDayIndex(idx)}
                    >
                      <div className="w-full flex justify-center items-end gap-1.5 h-36">
                        {/* Rainfall Bar */}
                        <div 
                          className="w-1/2 bg-blue-500 rounded-t transition-all duration-300 group-hover:bg-blue-600 relative"
                          style={{ height: `${Math.max(rainHeightPercent, 4)}%` }}
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-800 bg-blue-100 px-1 rounded whitespace-nowrap z-20">
                            {day.precipitationSum}mm
                          </span>
                        </div>

                        {/* Risk Score Indicator Bar */}
                        <div 
                          className={`w-1/2 ${getRiskBarColor(day.projectedRiskLevel)} rounded-t transition-all duration-300 relative`}
                          style={{ height: `${Math.max(riskHeightPercent, 4)}%` }}
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-800 bg-white px-1 rounded shadow-xs whitespace-nowrap z-20">
                            {(day?.projectedRiskScore ?? 0).toFixed(0)}/100
                          </span>
                        </div>
                      </div>

                      {/* Day Label Bottom */}
                      <span className={`text-[10px] mt-2 font-bold whitespace-nowrap ${isCurrent ? 'text-blue-700 underline font-black' : 'text-slate-500'}`}>
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2">
            <span>Hydrological dynamic model integrates projected precipitation with current catchment saturation.</span>
            <span className="font-semibold text-slate-700">Source: Open-Meteo High-Resolution Ensemble</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherForecast7Day;
