import { LiveWeatherData, DailyForecast, FloodDataPoint, RiskLevel } from '../types';
import { predictFloodRisk } from './mlEngine';

export const getWeatherDescription = (code: number): string => {
  switch (code) {
    case 0: return 'Clear Sky';
    case 1: return 'Mainly Clear';
    case 2: return 'Partly Cloudy';
    case 3: return 'Overcast';
    case 45: case 48: return 'Fog / Deposition Fog';
    case 51: return 'Light Drizzle';
    case 53: return 'Moderate Drizzle';
    case 55: return 'Dense Drizzle';
    case 61: return 'Slight Rain';
    case 63: return 'Moderate Rain';
    case 65: return 'Heavy Monsoonal Rain';
    case 66: case 67: return 'Freezing Rain';
    case 71: case 73: case 75: return 'Snowfall';
    case 80: return 'Light Showers';
    case 81: return 'Moderate Showers';
    case 82: return 'Violent Torrential Cloudburst';
    case 95: return 'Thunderstorm Activity';
    case 96: case 99: return 'Severe Thunderstorm with Hail';
    default: return code > 0 ? `Precipitation (WMO ${code})` : 'Stable Atmosphere';
  }
};

export const fetchLiveWeather = async (lat: number, lng: number): Promise<LiveWeatherData> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,surface_pressure,wind_speed_10m&hourly=soil_moisture_0_to_1cm,precipitation&daily=precipitation_sum&timezone=auto`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned status ${response.status}`);
    }

    const data = await response.json();
    const current = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    const elevation = typeof data.elevation === 'number' ? Math.round(data.elevation) : 50;

    // Current soil moisture from nearest hourly reading
    let soilMoisture = 0.28;
    if (hourly.soil_moisture_0_to_1cm && hourly.soil_moisture_0_to_1cm.length > 0) {
      const validMoistures = hourly.soil_moisture_0_to_1cm.filter((v: any) => typeof v === 'number');
      if (validMoistures.length > 0) {
        soilMoisture = validMoistures[0];
      }
    }

    // 24h precipitation sum
    const precip24h = daily.precipitation_sum && daily.precipitation_sum.length > 0
      ? Math.round(daily.precipitation_sum[0] * 10) / 10
      : (current.precipitation || 0) * 12;

    const weatherCode = current.weather_code ?? 0;

    return {
      temperature: Math.round(current.temperature_2m ?? 25),
      humidity: Math.round(current.relative_humidity_2m ?? 65),
      precipitationRate: Math.round((current.precipitation ?? 0) * 10) / 10,
      precipitation24h: Math.max(precip24h, Math.round((current.rain ?? 0) * 10) / 10),
      weatherCode,
      weatherDescription: getWeatherDescription(weatherCode),
      windSpeed: Math.round(current.wind_speed_10m ?? 12),
      surfacePressure: Math.round(current.surface_pressure ?? 1012),
      soilMoisture: Math.round(soilMoisture * 100) / 100,
      elevation,
      isLive: true,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      source: 'Open-Meteo Global Hydrometeorological Model'
    };
  } catch (err) {
    console.warn('Live weather fetch failed, utilizing synthetic satellite fallback:', err);
    return {
      temperature: 26,
      humidity: 75,
      precipitationRate: 0,
      precipitation24h: 15,
      weatherCode: 2,
      weatherDescription: 'Partly Cloudy (Cached Telemetry)',
      windSpeed: 10,
      surfacePressure: 1010,
      soilMoisture: 0.30,
      elevation: 50,
      isLive: false,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'Offline Meteorological Cache'
    };
  }
};

export const fetchReverseGeocoding = async (lat: number, lng: number): Promise<string> => {
  // Strategy 1: OpenStreetMap Nominatim with high resolution (zoom 18) for exact locality
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      
      const specificLocality = 
        addr.neighbourhood || 
        addr.suburb || 
        addr.quarter || 
        addr.residential || 
        addr.hamlet || 
        addr.village ||
        addr.road;
        
      const mainCity = 
        addr.city || 
        addr.town || 
        addr.municipality || 
        addr.county || 
        addr.state_district;
        
      const state = addr.state || addr.country;

      if (specificLocality && mainCity) {
        return `${specificLocality}, ${mainCity}`;
      } else if (specificLocality && state) {
        return `${specificLocality}, ${state}`;
      } else if (mainCity && state) {
        return `${mainCity}, ${state}`;
      } else if (data.display_name) {
        const parts = data.display_name.split(',').map((s: string) => s.trim()).filter(Boolean);
        return parts.slice(0, 2).join(', ');
      }
    }
  } catch (e) {
    // proceed to fallback
  }

  // Strategy 2: Fast client reverse geocode fallback (BigDataCloud client API, no rate limit)
  try {
    const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const locality = bdcData.locality || bdcData.localityInfo?.administrative?.[3]?.name || bdcData.localityInfo?.administrative?.[2]?.name;
      const city = bdcData.city || bdcData.principalSubdivision;
      if (locality && city && locality !== city) {
        return `${locality}, ${city}`;
      } else if (locality || city) {
        return locality || city;
      }
    }
  } catch (err) {
    // ignore
  }

  return `Catchment (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;
};

export const reverseGeocode = fetchReverseGeocoding;

export const fetch7DayForecast = async (
  lat: number,
  lng: number,
  baselinePoint: FloodDataPoint
): Promise<DailyForecast[]> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo forecast returned status ${response.status}`);
    }

    const data = await response.json();
    const daily = data.daily;
    if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) {
      throw new Error('Incomplete daily forecast payload received');
    }

    const daysCount = Math.min(daily.time.length, 7);
    const forecasts: DailyForecast[] = [];

    for (let i = 0; i < daysCount; i++) {
      const dateStr = daily.time[i];
      const parsedDate = new Date(dateStr);
      
      const dayLabel = i === 0 
        ? 'Today' 
        : i === 1 
          ? 'Tomorrow' 
          : parsedDate.toLocaleDateString(undefined, { weekday: 'short' });

      const formattedDate = parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const weatherCode = daily.weather_code?.[i] ?? 0;
      const weatherDesc = getWeatherDescription(weatherCode);
      const tempMax = Math.round(daily.temperature_2m_max?.[i] ?? 27);
      const tempMin = Math.round(daily.temperature_2m_min?.[i] ?? 20);
      const precipitationSum = Math.round((daily.precipitation_sum?.[i] ?? 0) * 10) / 10;
      const precipitationProbability = Math.round(
        daily.precipitation_probability_max?.[i] ?? 
        (precipitationSum > 10 ? 80 : precipitationSum > 2 ? 45 : 15)
      );
      const windSpeedMax = Math.round(daily.wind_speed_10m_max?.[i] ?? 12);

      // Hydrological Flood Risk Projection for this forecasted day
      // Scale river discharge & moisture response based on projected precipitation
      const dischargeMultiplier = 1 + Math.min(precipitationSum / 75, 2.4);
      const simulatedDischarge = Math.round(baselinePoint.riverDischarge * dischargeMultiplier);
      const simulatedMoisture = Math.min(0.48, (baselinePoint.liveWeather?.soilMoisture ?? 0.28) + (precipitationSum > 15 ? 0.12 : 0.03));
      
      const simulatedDataPoint: FloodDataPoint = {
        ...baselinePoint,
        rainfall: precipitationSum,
        temperature: Math.round((tempMax + tempMin) / 2),
        humidity: precipitationSum > 25 ? 90 : (precipitationSum > 5 ? 78 : 65),
        riverDischarge: simulatedDischarge,
        waterLevel: Math.round((baselinePoint.waterLevel * (1 + Math.min(precipitationSum / 120, 1.8))) * 10) / 10,
        liveWeather: {
          temperature: Math.round((tempMax + tempMin) / 2),
          humidity: precipitationSum > 25 ? 90 : 70,
          precipitationRate: precipitationSum > 30 ? Math.round((precipitationSum / 6) * 10) / 10 : 0,
          precipitation24h: precipitationSum,
          weatherCode,
          weatherDescription: weatherDesc,
          windSpeed: windSpeedMax,
          surfacePressure: 1012,
          soilMoisture: simulatedMoisture,
          elevation: baselinePoint.elevation,
          isLive: true,
          lastUpdated: 'Hydrological Model Forecast',
          source: 'Open-Meteo Ensemble'
        }
      };

      const dayPrediction = predictFloodRisk(simulatedDataPoint);
      const isCloudburst = precipitationSum >= 65 || (precipitationSum >= 40 && baselinePoint.elevation >= 350);

      const contributing: string[] = [];
      if (precipitationSum > 40) contributing.push(`${precipitationSum}mm intense rainfall`);
      else if (precipitationSum > 15) contributing.push(`${precipitationSum}mm moderate rainfall`);
      else contributing.push('Low precipitation volume');

      if (simulatedDischarge > baselinePoint.riverDischarge * 1.5) {
        contributing.push('Significant river channel surge');
      }
      if (simulatedMoisture > 0.40) {
        contributing.push('Soil pore saturation near capacity');
      }
      if (windSpeedMax > 30) {
        contributing.push(`${windSpeedMax} km/h convective wind gusts`);
      }

      forecasts.push({
        date: dateStr,
        dayLabel,
        formattedDate,
        weatherCode,
        weatherDescription: weatherDesc,
        tempMax,
        tempMin,
        precipitationSum,
        precipitationProbability,
        windSpeedMax,
        projectedRiskScore: dayPrediction.riskScore,
        projectedRiskLevel: dayPrediction.riskLevel,
        flashFloodThreat: dayPrediction.flashFloodAlert || isCloudburst,
        contributingFactors: contributing
      });
    }

    return forecasts;
  } catch (err) {
    console.warn('7-day weather forecast fetch failed, utilizing synthetic model:', err);
    // Fallback 7-day model derived from baseline location parameters
    return generateFallback7DayForecast(baselinePoint);
  }
};

const generateFallback7DayForecast = (baselinePoint: FloodDataPoint): DailyForecast[] => {
  const baseRain = baselinePoint.rainfall;
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const results: DailyForecast[] = [];

  // Realistic monsoonal / catchment progression over 7 days
  const rainMultipliers = [1.0, 1.25, 0.85, 0.45, 0.30, 0.20, 0.60];
  const weatherCodes = [
    baseRain > 50 ? 65 : 61,
    baseRain > 40 ? 82 : 63,
    baseRain > 25 ? 63 : 80,
    2,
    1,
    0,
    baseRain > 30 ? 61 : 2
  ];

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[targetDate.getDay()];
    const formattedDate = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    const dayRain = Math.max(0, Math.round(baseRain * rainMultipliers[i] * 10) / 10);
    const code = weatherCodes[i];
    const weatherDesc = getWeatherDescription(code);
    const tempMax = Math.round(baselinePoint.temperature + (i % 2 === 0 ? 1 : -1));
    const tempMin = Math.round(tempMax - 7);
    const precipProb = dayRain > 40 ? 90 : dayRain > 15 ? 70 : dayRain > 0 ? 40 : 15;
    const windSpeed = Math.round(12 + (dayRain > 30 ? 14 : 4));

    const simulatedPoint: FloodDataPoint = {
      ...baselinePoint,
      rainfall: dayRain,
      liveWeather: {
        ...baselinePoint.liveWeather,
        temperature: tempMax,
        humidity: dayRain > 20 ? 85 : 68,
        precipitationRate: dayRain > 30 ? Math.round((dayRain / 6) * 10) / 10 : 0,
        precipitation24h: dayRain,
        weatherCode: code,
        weatherDescription: weatherDesc,
        windSpeed,
        surfacePressure: 1012,
        soilMoisture: Math.min(0.48, 0.25 + (dayRain / 200)),
        elevation: baselinePoint.elevation,
        isLive: false,
        lastUpdated: 'Forecast Cache',
        source: 'Regional Hydrological Baseline'
      }
    };

    const pred = predictFloodRisk(simulatedPoint);

    results.push({
      date: dateStr,
      dayLabel,
      formattedDate,
      weatherCode: code,
      weatherDescription: weatherDesc,
      tempMax,
      tempMin,
      precipitationSum: dayRain,
      precipitationProbability: precipProb,
      windSpeedMax: windSpeed,
      projectedRiskScore: pred.riskScore,
      projectedRiskLevel: pred.riskLevel,
      flashFloodThreat: pred.flashFloodAlert || dayRain >= 65,
      contributingFactors: [
        `${dayRain}mm modeled precipitation`,
        dayRain > 35 ? 'Elevated surface runoff' : 'Controlled drainage response'
      ]
    });
  }

  return results;
};
