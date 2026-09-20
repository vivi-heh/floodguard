
import React from 'react';
import { FloodDataPoint, RiskLevel } from '../types';
import { predictFloodRisk } from '../services/mlEngine';
import { MapPin, ChevronRight, Radio, CloudRain } from 'lucide-react';

interface Props {
  locations: FloodDataPoint[];
  selectedId: string;
  onSelect: (point: FloodDataPoint) => void;
}

const LocationSelector: React.FC<Props> = ({ locations, selectedId, onSelect }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs h-[460px] flex flex-col">
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          Locations
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
          {locations.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {locations.map((loc) => {
          const pred = predictFloodRisk(loc);
          const isSelected = loc.id === selectedId;

          const riskColor =
            pred.riskLevel === RiskLevel.CRITICAL
              ? 'text-red-700 bg-red-50 border-red-200'
              : pred.riskLevel === RiskLevel.HIGH
              ? 'text-rose-600 bg-rose-50 border-rose-200'
              : pred.riskLevel === RiskLevel.MEDIUM
              ? 'text-orange-600 bg-orange-50 border-orange-200'
              : 'text-emerald-600 bg-emerald-50 border-emerald-200';

          return (
            <button
              key={loc.id}
              onClick={() => onSelect(loc)}
              className={`w-full text-left p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0 pr-2">
                <div className="mt-0.5 shrink-0">
                  {loc.liveWeather?.isLive ? (
                    <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-600 animate-pulse">
                      <Radio className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className={`p-1.5 rounded-md ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                    {loc.locationName}
                  </p>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${riskColor}`}>
                      {pred?.riskLevel ?? 'Low'} ({(pred?.riskScore ?? 0).toFixed(0)})
                    </span>

                    {loc.liveWeather?.isLive && (
                      <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-1">
                        <CloudRain className="w-2.5 h-2.5" /> {loc.liveWeather.temperature}°C
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LocationSelector;
