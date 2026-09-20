
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { FloodDataPoint, RiskLevel } from '../types';
import { predictFloodRisk } from '../services/mlEngine';
import { Search, Loader2, MapPin, Navigation, LocateFixed, Target, X, Building2, Compass, Sparkles } from 'lucide-react';

export interface PlaceSuggestion {
  id: string;
  name: string;        // Locality / small area name (e.g. "Koramangala", "Rohini Sector 7")
  cityName: string;    // Parent city / town (e.g. "Bengaluru", "Delhi")
  fullName: string;    // Clean combined label (e.g. "Koramangala, Bengaluru")
  fullAddress: string; // Regional context (e.g. "Bengaluru, Karnataka, India")
  lat: number;
  lng: number;
  type: string;        // 'locality' | 'suburb' | 'neighbourhood' | 'village' | 'city'
  bbox?: number[];
}

const QUICK_SUGGESTIONS: PlaceSuggestion[] = [
  {
    id: 'quick-1',
    name: 'Koramangala',
    cityName: 'Bengaluru',
    fullName: 'Koramangala, Bengaluru',
    fullAddress: 'Bengaluru, Karnataka, India',
    lat: 12.9352,
    lng: 77.6245,
    type: 'neighbourhood'
  },
  {
    id: 'quick-2',
    name: 'Andheri West',
    cityName: 'Mumbai',
    fullName: 'Andheri West, Mumbai',
    fullAddress: 'Mumbai, Maharashtra, India',
    lat: 19.1197,
    lng: 72.8464,
    type: 'suburb'
  },
  {
    id: 'quick-3',
    name: 'Mayur Vihar Phase 1',
    cityName: 'Delhi',
    fullName: 'Mayur Vihar, Delhi',
    fullAddress: 'East Delhi, Delhi, India',
    lat: 28.6094,
    lng: 77.2952,
    type: 'residential'
  },
  {
    id: 'quick-4',
    name: 'Paltan Bazaar',
    cityName: 'Guwahati',
    fullName: 'Paltan Bazaar, Guwahati',
    fullAddress: 'Guwahati, Assam, India',
    lat: 26.1804,
    lng: 91.7539,
    type: 'commercial'
  },
  {
    id: 'quick-5',
    name: 'Kankarbagh',
    cityName: 'Patna',
    fullName: 'Kankarbagh, Patna',
    fullAddress: 'Patna, Bihar, India',
    lat: 25.5977,
    lng: 85.1588,
    type: 'locality'
  },
  {
    id: 'quick-6',
    name: 'Velachery',
    cityName: 'Chennai',
    fullName: 'Velachery, Chennai',
    fullAddress: 'Chennai, Tamil Nadu, India',
    lat: 12.9756,
    lng: 80.2206,
    type: 'suburb'
  },
  {
    id: 'quick-7',
    name: 'Salt Lake Sector V',
    cityName: 'Kolkata',
    fullName: 'Sector V, Kolkata',
    fullAddress: 'Bidhannagar, Kolkata, West Bengal',
    lat: 22.5802,
    lng: 88.4328,
    type: 'suburb'
  },
  {
    id: 'quick-8',
    name: 'Banjara Hills',
    cityName: 'Hyderabad',
    fullName: 'Banjara Hills, Hyderabad',
    fullAddress: 'Hyderabad, Telangana, India',
    lat: 17.4156,
    lng: 78.4350,
    type: 'neighbourhood'
  },
  {
    id: 'quick-9',
    name: 'Aluva',
    cityName: 'Kochi',
    fullName: 'Aluva, Kochi',
    fullAddress: 'Ernakulam, Kochi, Kerala',
    lat: 10.1076,
    lng: 76.3516,
    type: 'municipality'
  },
  {
    id: 'quick-10',
    name: 'Rajbagh',
    cityName: 'Srinagar',
    fullName: 'Rajbagh, Srinagar',
    fullAddress: 'Srinagar, Jammu & Kashmir',
    lat: 34.0682,
    lng: 74.8211,
    type: 'locality'
  }
];

// Helper to extract the most granular locality and its parent city/town
export function parseNominatimResult(item: any): PlaceSuggestion {
  const addr = item.address || {};
  
  // 1. Identify the smallest locality/neighborhood/colony/village/street
  const smallestLocality = 
    addr.neighbourhood || 
    addr.suburb || 
    addr.quarter || 
    addr.residential || 
    addr.hamlet || 
    addr.village || 
    addr.road || 
    addr.commercial || 
    addr.industrial ||
    addr.isolated_dwelling ||
    addr.allotments ||
    item.name;

  // 2. Identify the parent city / town / district
  const city = 
    addr.city || 
    addr.town || 
    addr.municipality || 
    addr.county || 
    addr.state_district ||
    addr.subdistrict;

  const state = addr.state;
  const country = addr.country;

  let name = '';
  let cityName = '';
  let fullName = '';

  if (smallestLocality && city && smallestLocality.toLowerCase() !== city.toLowerCase()) {
    name = smallestLocality;
    cityName = city;
    fullName = `${smallestLocality}, ${city}`;
  } else if (smallestLocality && state && smallestLocality.toLowerCase() !== state.toLowerCase()) {
    name = smallestLocality;
    cityName = state;
    fullName = `${smallestLocality}, ${state}`;
  } else if (city) {
    name = city;
    cityName = state || country || '';
    fullName = state ? `${city}, ${state}` : city;
  } else {
    const parts = (item.display_name || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    name = parts[0] || 'Unknown Area';
    cityName = parts[1] || '';
    fullName = cityName ? `${name}, ${cityName}` : name;
  }

  const contextParts = [
    cityName && cityName !== name ? cityName : null,
    state && state !== cityName ? state : null,
    country
  ].filter(Boolean);

  const rawType = item.type || item.addresstype || (addr.neighbourhood ? 'neighbourhood' : addr.suburb ? 'suburb' : addr.village ? 'village' : 'locality');

  return {
    id: item.place_id ? String(item.place_id) : `nom-${item.lat}-${item.lon}`,
    name,
    cityName: cityName || (contextParts[0] || ''),
    fullName,
    fullAddress: contextParts.join(', ') || item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    type: rawType,
    bbox: item.boundingbox ? item.boundingbox.map(Number) : undefined
  };
}

// Fallback parser using Photon (Komoot / OSM API) for high-speed autocomplete
export function parsePhotonFeature(feat: any): PlaceSuggestion {
  const p = feat.properties || {};
  const [lng, lat] = feat.geometry?.coordinates || [0, 0];

  const locality = p.locality || p.district || p.suburb || p.neighbourhood || p.street || p.name;
  const city = p.city || p.town || p.county || p.state;
  const state = p.state;
  const country = p.country;

  let name = p.name || locality || 'Locality';
  let cityName = city || state || '';
  let fullName = '';

  if (name && cityName && name.toLowerCase() !== cityName.toLowerCase()) {
    fullName = `${name}, ${cityName}`;
  } else {
    fullName = cityName ? `${name}, ${cityName}` : name;
  }

  const context = [city !== name ? city : null, state, country].filter(Boolean).join(', ');

  return {
    id: `photon-${p.osm_id || lat + '-' + lng}`,
    name,
    cityName,
    fullName,
    fullAddress: context || p.name,
    lat,
    lng,
    type: p.osm_value || 'locality'
  };
}

interface Props {
  data: FloodDataPoint[];
  selectedPoint: FloodDataPoint;
  onSelectPoint: (point: FloodDataPoint) => void;
  onMapClick?: (lat: number, lng: number, nameHint?: string) => void;
}

const MapContainer: React.FC<Props> = ({ data, selectedPoint, onSelectPoint, onMapClick }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const onMapClickRef = useRef(onMapClick);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real-time place suggestions with locality & city resolution
  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    setSearchError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length === 0) {
      setSuggestions(QUICK_SUGGESTIONS);
      setShowSuggestions(true);
      setIsLoadingSuggestions(false);
      return;
    }

    if (trimmed.length < 2) {
      setSuggestions(QUICK_SUGGESTIONS.filter(q => 
        q.name.toLowerCase().includes(trimmed.toLowerCase()) || 
        q.cityName.toLowerCase().includes(trimmed.toLowerCase())
      ));
      setShowSuggestions(true);
      return;
    }

    setIsLoadingSuggestions(true);
    setShowSuggestions(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Strategy 1: OpenStreetMap Nominatim with granular address details
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&addressdetails=1&limit=6`,
          { headers: { Accept: 'application/json' } }
        );

        if (response.ok) {
          const results = await response.json();
          if (Array.isArray(results) && results.length > 0) {
            const parsed = results.map(parseNominatimResult);
            setSuggestions(parsed);
            setIsLoadingSuggestions(false);
            return;
          }
        }

        // Strategy 2: Fast Photon API fallback for typo-tolerant autocomplete
        const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6`);
        if (photonRes.ok) {
          const photonData = await photonRes.json();
          if (photonData.features && photonData.features.length > 0) {
            const photonParsed = photonData.features.map(parsePhotonFeature);
            setSuggestions(photonParsed);
            setIsLoadingSuggestions(false);
            return;
          }
        }

        setSuggestions([]);
      } catch (err) {
        // Filter quick suggestions as offline fallback
        const fallbackFiltered = QUICK_SUGGESTIONS.filter(q => 
          q.name.toLowerCase().includes(trimmed.toLowerCase()) || 
          q.cityName.toLowerCase().includes(trimmed.toLowerCase())
        );
        setSuggestions(fallbackFiltered);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 280);
  };

  // Select a suggestion and analyze it with exact locality & city name
  const handleSelectSuggestion = (item: PlaceSuggestion) => {
    if (!mapRef.current) return;
    setSearchError(null);
    setShowSuggestions(false);
    setSearchQuery('');

    // Small localities get detailed zoom (level 16) for street & basin drainage assessment
    if (item.bbox && item.bbox.length === 4) {
      mapRef.current.flyToBounds([[item.bbox[0], item.bbox[2]], [item.bbox[1], item.bbox[3]]], {
        duration: 1.5,
        padding: [40, 40]
      });
    } else {
      mapRef.current.flyTo([item.lat, item.lng], 16, { duration: 1.5 });
    }

    if (onMapClickRef.current) {
      onMapClickRef.current(item.lat, item.lng, item.fullName);
    }
  };

  // Keep ref updated to avoid re-binding map events too often
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([20.5937, 78.9629], 5);

    // Clean, high-performance basemaps with NO API key requirement and zero watermarks
    const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    });

    const topoLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, USGS, NPS',
      maxZoom: 19
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
      maxZoom: 18
    });

    // Add clean default OpenStreetMap layer
    osmLayer.addTo(mapRef.current);

    const baseLayers = {
      "OpenStreetMap": osmLayer,
      "Topographic Terrain": topoLayer,
      "Satellite Imagery": satelliteLayer
    };

    L.control.layers(baseLayers, {}, { position: 'topleft' }).addTo(mapRef.current);

    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.closePopup();
    
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    data.forEach(point => {
      const pred = predictFloodRisk(point);
      const isSelected = point.id === selectedPoint.id;
      const isCustom = point.id.startsWith('custom-');

      const color = isSelected ? '#2563eb' : 
                    pred.riskLevel === RiskLevel.CRITICAL ? '#991b1b' :
                    pred.riskLevel === RiskLevel.HIGH ? '#ef4444' : 
                    pred.riskLevel === RiskLevel.MEDIUM ? '#f97316' : '#10b981';

      const riskClass = pred.riskLevel === RiskLevel.CRITICAL ? 'color: #991b1b;' :
                        pred.riskLevel === RiskLevel.HIGH ? 'color: #dc2626;' : 
                        pred.riskLevel === RiskLevel.MEDIUM ? 'color: #ea580c;' : 'color: #059669;';

      const safeRiskScore = Number(pred?.riskScore ?? 0).toFixed(0);
      const safeLat = (typeof point.latitude === 'number' ? point.latitude : 0).toFixed(3);
      const safeLng = (typeof point.longitude === 'number' ? point.longitude : 0).toFixed(3);

      const liveBadge = point.liveWeather?.isLive ? `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 4px 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase;">📡 Live Weather Synced</span>
          <span style="font-size: 10px; font-weight: 800; color: #047857;">${point.liveWeather.temperature}°C • ${point.liveWeather.precipitationRate} mm/h</span>
        </div>
      ` : '';

      const popupContent = `
        <div style="min-width: 220px; max-width: 280px; font-family: sans-serif; padding: 2px;">
          ${liveBadge}
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            <h3 style="margin: 0; font-size: 13px; font-weight: 800; color: #0f172a;">
              ${point.locationName} ${isCustom ? '<span style="font-size: 9px; color: #64748b;">(Custom)</span>' : ''}
            </h3>
          </div>

          <div style="margin-bottom: 10px; background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Area Risk Score</span>
              <span style="${riskClass} font-size: 12px; font-weight: 900; text-transform: uppercase;">
                ${pred.riskLevel} (${safeRiskScore}/100)
              </span>
            </div>
            <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: ${pred?.riskScore ?? 0}%; background: ${color};"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <span style="font-size: 9px; color: #64748b;">Assessment Mode:</span>
              <span style="font-size: 9px; font-weight: 700; color: #334155;">Multi-Sensor Synthesis</span>
            </div>
          </div>

          <table style="width: 100%; font-size: 10.5px; border-collapse: collapse; margin-bottom: 6px;">
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Coordinates</td>
              <td style="text-align: right; font-weight: 600; color: #334155;">${safeLat}, ${safeLng}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">24h Rainfall</td>
              <td style="text-align: right; font-weight: 700; color: #0284c7;">${point.rainfall} mm</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Elevation</td>
              <td style="text-align: right; font-weight: 600; color: #334155;">${point.elevation} m</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Soil Type</td>
              <td style="text-align: right; font-weight: 600; color: #334155;">${point.soilType}</td>
            </tr>
          </table>

          <div style="text-align: center; font-size: 9px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 4px; border-radius: 4px;">
            Click to inspect full AI & hydrology telemetry
          </div>
        </div>
      `;

      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: isSelected ? 12 : 7,
        fillColor: color,
        color: isSelected ? '#1e40af' : '#fff',
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: 0.85
      });

      marker.addTo(mapRef.current!)
        .on('mousedown', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectPoint(point);
        })
        .bindPopup(popupContent, {
          className: 'flood-risk-popup',
          closeButton: true,
          offset: [0, -5]
        });

      if (isSelected) {
        setTimeout(() => {
          if (marker && mapRef.current && mapRef.current.hasLayer(marker)) {
            marker.openPopup();
          }
        }, 100);
      }

      markersRef.current.push(marker);
    });

  }, [data, selectedPoint.id, onSelectPoint]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;

    // If suggestions are currently populated, pick the top result
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      // Enhanced geocoding query to favor local administrative areas & small localities
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=3`);
      const results = await response.json();

      if (results && results.length > 0) {
        const topResult = parseNominatimResult(results[0]);
        handleSelectSuggestion(topResult);
      } else {
        // Fallback to Photon
        const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=3`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.features && pData.features.length > 0) {
            const pParsed = parsePhotonFeature(pData.features[0]);
            handleSelectSuggestion(pParsed);
            return;
          }
        }
        setSearchError('Locality not found. Try adding a city name (e.g. Koramangala, Bengaluru).');
      }
    } catch (err) {
      setSearchError('Search offline or rate-limited.');
    } finally {
      setIsSearching(false);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) {
      setSearchError('Geolocation not supported by browser.');
      return;
    }
    setIsLocating(true);
    setSearchError(null);
    setShowSuggestions(false);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Full zoomed in view to the exact area (level 17 for full street and drainage detail)
        mapRef.current?.flyTo([latitude, longitude], 17, { 
          duration: 1.5,
          easeLinearity: 0.25 
        });

        if (onMapClickRef.current) {
          onMapClickRef.current(latitude, longitude);
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setSearchError('Location access denied or unavailable.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Automatically center and zoom map to full area when selectedPoint changes
  useEffect(() => {
    if (!mapRef.current) return;
    const isCustom = selectedPoint.id.startsWith('custom-');
    // Full zoom in: level 17 for located/clicked locations, level 14+ for regional catchments
    const targetZoom = isCustom ? 17 : Math.max(mapRef.current.getZoom(), 14);
    mapRef.current.flyTo([selectedPoint.latitude, selectedPoint.longitude], targetZoom, {
      duration: 1.2
    });
  }, [selectedPoint.id]);

  return (
    <div className="relative w-full h-[460px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      <style>
        {`
          .flood-risk-popup .leaflet-popup-content-wrapper { border-radius: 12px; padding: 8px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
          .flood-risk-popup .leaflet-popup-tip { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
          .leaflet-control-layers { border: 1px solid #e2e8f0 !important; border-radius: 8px !important; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important; font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase; padding: 4px; }
        `}
      </style>
      
      {/* Precision Search Console with Autocomplete Suggestions */}
      <div className="absolute top-4 left-14 right-4 z-[1000] flex justify-end pointer-events-none">
        <div ref={searchContainerRef} className="flex gap-2 w-full max-w-lg pointer-events-auto relative">
          <form onSubmit={handleSearch} className="flex-1 relative group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length === 0) {
                  setSuggestions(QUICK_SUGGESTIONS);
                }
                setShowSuggestions(true);
              }}
              placeholder="Search small locality, colony, or city (e.g. Koramangala, Bengaluru)..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pl-10 pr-9 text-xs font-bold text-slate-900 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400"
            />
            <div className="absolute left-3 top-2.5">
              {isSearching || isLoadingSuggestions ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              )}
            </div>

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions(QUICK_SUGGESTIONS);
                  setShowSuggestions(true);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {searchError && (
              <div className="absolute top-full mt-2 w-full bg-red-600 text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-xl">
                {searchError.toUpperCase()}
              </div>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[1050] max-h-[320px] flex flex-col">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
                  <span className="flex items-center gap-1.5">
                    {searchQuery.trim().length >= 2 ? (
                      <>
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        Locality & City Matches
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Suggested Localities & Cities
                      </>
                    )}
                  </span>
                  {isLoadingSuggestions ? (
                    <span className="text-blue-600 flex items-center gap-1 lowercase font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" /> searching...
                    </span>
                  ) : (
                    <span className="text-slate-400">{suggestions.length} places</span>
                  )}
                </div>

                <div className="overflow-y-auto divide-y divide-slate-100">
                  {isLoadingSuggestions && suggestions.length === 0 ? (
                    <div className="p-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      Searching localities & cities...
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      <p className="font-bold text-slate-700">No locality found for "{searchQuery}"</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Try adding the parent city or district name (e.g. "Rohini, Delhi" or "Indiranagar, Bengaluru")
                      </p>
                    </div>
                  ) : (
                    suggestions.map((item) => {
                      const isCityType = item.type === 'city' || item.type === 'administrative' || item.type === 'town';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/80 flex items-start gap-2.5 transition-colors group cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-600 text-slate-500 shrink-0 mt-0.5 transition-colors">
                            {isCityType ? (
                              <Building2 className="w-3.5 h-3.5" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-blue-900 truncate">
                                {item.name}
                              </span>
                              {item.cityName && item.cityName.toLowerCase() !== item.name.toLowerCase() && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 uppercase tracking-wider shrink-0">
                                  {item.cityName}
                                </span>
                              )}
                              {item.type && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase ml-auto shrink-0">
                                  {item.type}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {item.fullAddress || item.fullName}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </form>

          <button 
            onClick={locateMe}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center border border-blue-500"
            title="Locate Me"
          >
            {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-full cursor-crosshair" />
      
      {/* Interface Feedback */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-[1000]">
        <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-[10px] font-black text-slate-700 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          <span>REAL-TIME GEOSPATIAL ANALYSIS ENABLED</span>
        </div>
      </div>

      {/* Professional Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-200 z-[1000] text-[10px] min-w-[160px]">
        <h4 className="font-black mb-3 uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Navigation className="w-3 h-3" /> Risk Layers
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-900 font-bold">Severe Hazard</span>
            <span className="w-3 h-3 rounded-full bg-red-500 border border-red-700 shadow-sm shadow-red-200"></span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-900 font-bold">Moderate Alert</span>
            <span className="w-3 h-3 rounded-full bg-orange-500 border border-orange-700 shadow-sm shadow-orange-200"></span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-900 font-bold">Stable Zone</span>
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-700 shadow-sm shadow-emerald-200"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapContainer;
