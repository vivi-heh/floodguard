
import React from 'react';
import { FloodDataPoint } from '../types';
import { 
  MapPin, 
  CloudRain, 
  Waves, 
  Info, 
  Radio, 
  Loader2, 
  Sparkles, 
  Thermometer, 
  Droplets, 
  Gauge, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface Props {
  currentData: FloodDataPoint;
  onChange: (newData: FloodDataPoint) => void;
  onDetectLiveWeather?: () => void;
  isDetectingWeather?: boolean;
}

const SimulationPanel: React.FC<Props> = ({ 
  currentData, 
  onChange, 
  onDetectLiveWeather, 
  isDetectingWeather = false 
}) => {
  const handleChange = (field: keyof FloodDataPoint, value: number | string) => {
    onChange({ ...currentData, [field]: value });
  };

  return (
    <div className="bg-white p-6 h-full overflow-y-auto border-r border-slate-200">
      <div className="flex items-center justify-between mb-2 text-slate-900">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold">Hydrometeorology</h2>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4 truncate font-medium">
        Area: <span className="font-bold text-slate-800">{currentData.locationName}</span>
      </p>

      {/* Live Weather Detection Button */}
      <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            Live Atmosphere Telemetry
          </span>
          {currentData.liveWeather?.isLive && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Synced
            </span>
          )}
        </div>

        <button
          onClick={onDetectLiveWeather}
          disabled={isDetectingWeather}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isDetectingWeather ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Detecting Real-Life Weather...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-blue-300" />
              <span>{currentData.liveWeather?.isLive ? 'Refresh Real-Life Weather' : 'Detect Live Weather for Area'}</span>
            </>
          )}
        </button>

        {currentData.liveWeather?.isLive ? (
          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Condition</span>
              <span className="font-extrabold text-slate-800 truncate block mt-0.5">{currentData.liveWeather.weatherDescription}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Current Rain Rate</span>
              <span className="font-extrabold text-blue-600 block mt-0.5">{currentData.liveWeather.precipitationRate} mm/h</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">24h Rain Gauge</span>
              <span className="font-extrabold text-blue-600 block mt-0.5">{currentData.liveWeather.precipitation24h} mm</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Terrain Elevation</span>
              <span className="font-extrabold text-slate-800 block mt-0.5">{currentData.liveWeather.elevation} m</span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-slate-500 mt-2.5 leading-tight">
            Connects to global meteorological radar and digital elevation sensors for this precise latitude and longitude.
          </p>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-blue-600" /> 24h Rainfall (mm)
            </span>
            <span className="text-xs font-black text-blue-600">{currentData.rainfall} mm</span>
          </label>
          <input
            type="range"
            min="0"
            max="1200"
            step="10"
            value={currentData.rainfall}
            onChange={(e) => handleChange('rainfall', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-1 text-[10px] text-slate-500 font-bold">
            <span>0</span>
            <span className="text-slate-400">Flash Flood Alert &gt; 180mm</span>
            <span>1200+</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-cyan-600" /> Gauge Water Level (m)
            </span>
            <span className="text-xs font-black text-cyan-700">{currentData.waterLevel} m</span>
          </label>
          <input
            type="range"
            min="0"
            max="25"
            step="0.5"
            value={currentData.waterLevel}
            onChange={(e) => handleChange('waterLevel', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-1 text-[10px] text-slate-500 font-bold">
            <span>0m</span>
            <span>25m</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-indigo-600" /> Peak River Discharge (m³/s)
            </span>
            <span className="text-xs font-black text-indigo-700">{currentData.riverDischarge.toLocaleString()}</span>
          </label>
          <input
            type="range"
            min="0"
            max="40000"
            step="500"
            value={currentData.riverDischarge}
            onChange={(e) => handleChange('riverDischarge', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-1 text-[10px] text-slate-500 font-bold">
            <span>0</span>
            <span>40k+</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Geospatial Terrain Context</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-tighter">Elevation (m)</label>
              <input 
                type="number" 
                value={currentData.elevation}
                onChange={(e) => handleChange('elevation', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-50 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-tighter">History (Events)</label>
              <input 
                type="number" 
                value={currentData.historicalFloods}
                onChange={(e) => handleChange('historicalFloods', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-50 text-sm font-bold"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-tighter">Primary Soil Profile</label>
            <select 
              value={currentData.soilType}
              onChange={(e) => handleChange('soilType', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-50 text-sm font-bold"
            >
              <option>Alluvial</option>
              <option>Clayey Silt</option>
              <option>Sandy Loam</option>
              <option>Rocky</option>
              <option>Sandy</option>
            </select>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-600 leading-tight font-medium">
              Multi-spectral area risk scoring updates dynamically on each parameter change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPanel;
