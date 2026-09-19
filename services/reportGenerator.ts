import { FloodDataPoint, PredictionOutput, AIReasoning } from '../types';
import { predictFloodRisk } from './mlEngine';

export interface ReportData {
  point: FloodDataPoint;
  prediction: PredictionOutput;
  reasoning: AIReasoning | null;
}

/**
 * Generates and downloads a complete QGIS 3.x compatible GeoJSON package
 * containing spatial vector points, 3D elevation coordinates, and calibrated
 * hydrological and flood risk attributes. Works 100% locally and independently.
 */
export function downloadQgisPackage(points: FloodDataPoint[], selectedPoint?: FloodDataPoint) {
  const targetPoints = points && points.length > 0 ? points : (selectedPoint ? [selectedPoint] : []);
  
  const geojson = {
    type: "FeatureCollection",
    name: "FloodGuard_Hydrological_Catchments_2026",
    crs: {
      type: "name",
      properties: {
        name: "urn:ogc:def:crs:OGC:1.3:CRS84"
      }
    },
    metadata: {
      description: "FloodGuard AI Geospatial Hydrometeorological Catchment Layer Package for QGIS / ArcGIS",
      generatedAt: new Date().toISOString(),
      software: "QGIS 3.x / ArcGIS Pro Compatible GeoJSON",
      datum: "WGS 84 (EPSG:4326)",
      featuresCount: targetPoints.length,
      mode: "Local Offline Geospatial Export"
    },
    features: targetPoints.map(p => {
      const pred = predictFloodRisk(p);
      return {
        type: "Feature",
        id: p.id,
        geometry: {
          type: "Point",
          coordinates: [
            Number(p.longitude.toFixed(6)),
            Number(p.latitude.toFixed(6)),
            Number(p.elevation)
          ]
        },
        properties: {
          id: p.id,
          location_name: p.locationName,
          risk_level: pred.riskLevel,
          risk_score: Number(pred.riskScore.toFixed(1)),
          confidence_pct: Number(pred.confidenceScore.toFixed(1)),
          rainfall_mm: p.rainfall,
          river_discharge_m3s: p.riverDischarge,
          water_level_m: p.waterLevel,
          elevation_m: p.elevation,
          soil_type: p.soilType,
          land_cover: p.landCover,
          population_density: p.populationDensity,
          infrastructure_score: p.infrastructureScore,
          historical_floods: p.historicalFloods,
          meteorological_hazard: Number((pred.subScores?.meteorologicalHazard ?? 0).toFixed(1)),
          topographic_gradient: Number((pred.subScores?.topographicVulnerability ?? 0).toFixed(1)),
          soil_saturation: Number((pred.subScores?.soilSaturationRunoff ?? 0).toFixed(1)),
          hydrological_stress: Number((pred.subScores?.hydrologicalStress ?? 0).toFixed(1)),
          socio_exposure: Number((pred.subScores?.socioInfrastructureExposure ?? 0).toFixed(1)),
          is_selected: selectedPoint ? p.id === selectedPoint.id : false,
          is_disaster_benchmark: Boolean(p.isDisasterBenchmark)
        }
      };
    })
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fileName = selectedPoint 
    ? `QGIS_Package_${selectedPoint.locationName.replace(/[^a-zA-Z0-9]/g, '_')}_2026.geojson`
    : `QGIS_Package_All_Catchments_2026.geojson`;
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateMarkdownReport(data: ReportData): string {
  const { point, prediction, reasoning } = data;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const sub = prediction.subScores || {
    meteorologicalHazard: 50,
    topographicVulnerability: 50,
    soilSaturationRunoff: 50,
    hydrologicalStress: 50,
    socioInfrastructureExposure: 50
  };

  const metPts = (sub.meteorologicalHazard * 0.34).toFixed(1);
  const topoPts = (sub.topographicVulnerability * 0.20).toFixed(1);
  const hydroPts = (sub.hydrologicalStress * 0.20).toFixed(1);
  const soilPts = (sub.soilSaturationRunoff * 0.16).toFixed(1);
  const socioPts = (sub.socioInfrastructureExposure * 0.10).toFixed(1);

  return `================================================================================
FLOODGUARD AI • OFFICIAL GEOSPATIAL HYDROMETEOROLOGICAL ASSESSMENT REPORT
================================================================================
Report Issued:      ${dateStr}
System Version:     FloodGuard AI Catchment Analytics Engine v3.2
Analytical Model:   Multi-Parametric Geospatial Ensemble (2021–2026 Telemetry)
Audit ID:           FGAI-${Math.random().toString(36).substring(2, 9).toUpperCase()}

--------------------------------------------------------------------------------
1. MONITORED CATCHMENT & GEOGRAPHIC IDENTIFIERS
--------------------------------------------------------------------------------
Location Name:          ${point.locationName}
Geographic Coordinates: ${point.latitude.toFixed(4)}° N, ${point.longitude.toFixed(4)}° E
Mean Basin Elevation:   ${point.elevation} m MSL
Soil Pedology:          ${point.soilType}
Land Surface Cover:     ${point.landCover}
Demographic Density:    ${point.populationDensity.toLocaleString()} residents/km²
Drainage Infrastructure:${point.infrastructureScore} / 10 rating
Historical Inundation:  ${point.historicalFloods} documented flood events

--------------------------------------------------------------------------------
2. COMPOSITE AREA RISK DETECTION & CLASSIFICATION
--------------------------------------------------------------------------------
Overall Risk Score:     ${prediction.riskScore.toFixed(1)} / 100
Assigned Hazard Rating: [${prediction.riskLevel}] RISK
Flash Flood / Surge:    ${prediction.flashFloodAlert ? 'CRITICAL ALERT (Sudden Runoff Trigger)' : 'STABLE (Below Flash Threshold)'}
Model Confidence:       ${prediction.confidenceScore.toFixed(1)}%

MULTI-FACTORIAL AREA SCORE DECOMPOSITION (5-AXIS SYNTHESIS):
• Meteorological Hazard (34% Weight):
    Raw Index: ${sub.meteorologicalHazard.toFixed(1)}/100 | Score Contribution: +${metPts} pts
    Description: 24h precipitation rate, storm cell kinetics, and atmospheric moisture.
• Hydrological Riverine Stress (20% Weight):
    Raw Index: ${sub.hydrologicalStress.toFixed(1)}/100 | Score Contribution: +${hydroPts} pts
    Description: Channel discharge velocity and river gauge height relative to bankfull mark.
• Topographic Slope & Elevation Profile (20% Weight):
    Raw Index: ${sub.topographicVulnerability.toFixed(1)}/100 | Score Contribution: +${topoPts} pts
    Description: Catchment slope concavity, terrain gradient, and valley funneling dynamics.
• Soil Saturation & Runoff Ratio (16% Weight):
    Raw Index: ${sub.soilSaturationRunoff.toFixed(1)}/100 | Score Contribution: +${soilPts} pts
    Description: Substrate pore-water retention and infiltration capacity threshold.
• Socio-Infrastructure Exposure (10% Weight):
    Raw Index: ${sub.socioInfrastructureExposure.toFixed(1)}/100 | Score Contribution: +${socioPts} pts
    Description: Residential density vulnerability vs. civil drainage defense capacity.

Synthesis Formula: Score = (Met × 0.34) + (Hydro × 0.20) + (Topo × 0.20) + (Soil × 0.16) + (Socio × 0.10)

--------------------------------------------------------------------------------
3. HYDROMETEOROLOGICAL SENSOR TELEMETRY
--------------------------------------------------------------------------------
24-Hour Rainfall:       ${point.rainfall} mm
River Flow Discharge:   ${point.riverDischarge.toLocaleString()} m³/s
Basin Water Gauge Level:${point.waterLevel} m
Ambient Temperature:    ${point.temperature} °C
Relative Air Humidity:  ${point.humidity} %
${point.liveWeather?.isLive ? `Live Weather Source:    ${point.liveWeather.source}
Live Precipitation Rate:${point.liveWeather.precipitationRate} mm/h
Atmospheric Pressure:   ${point.liveWeather.surfacePressure} hPa
Current Weather State:  ${point.liveWeather.weatherDescription}
Telemetry Timestamp:    ${point.liveWeather.lastUpdated}` : `Telemetry Mode:         Calibrated In-Situ Hydrological Basin Sensor Station`}

--------------------------------------------------------------------------------
4. EXPLAINABLE AI (XAI) - KEY HAZARD ATTRIBUTIONS
--------------------------------------------------------------------------------
${prediction.featureImportance.map((f, i) => `[${i + 1}] ${f.name.padEnd(28)}: ${f.importance.toFixed(1)}% contribution`).join('\n')}

--------------------------------------------------------------------------------
5. CIVIL DEFENSE DIRECTIVES & AI MITIGATION STRATEGY
--------------------------------------------------------------------------------
EXECUTIVE OVERVIEW:
${reasoning?.summary || 'Standard hydrological monitoring recommended based on continuous elevation profile and catchment telemetry.'}

PRIMARY VULNERABILITY DRIVERS:
${reasoning?.factors?.map((fact, idx) => `  [!] ${fact}`).join('\n') || '  - Standard hydrological profile with moderate drainage buffer.'}

CIVIL DEFENSE ACTION RECOMMENDATIONS:
${reasoning?.recommendations?.map((rec, idx) => `  [${idx + 1}] ${rec}`).join('\n') || '  - Continue continuous gauge telemetry logging and inspect storm retention gates.'}

================================================================================
Notice: This document is an automated intelligence assessment intended for civil
hazard preparedness, resource mobilization, and disaster risk reduction.
================================================================================
`;
}

export function downloadTextReport(data: ReportData) {
  const content = generateMarkdownReport(data);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = data.point.locationName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  a.href = url;
  a.download = `FloodGuard_Report_${safeName}_2026.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJsonReport(data: ReportData) {
  const sub = data.prediction.subScores || {
    meteorologicalHazard: 50,
    topographicVulnerability: 50,
    soilSaturationRunoff: 50,
    hydrologicalStress: 50,
    socioInfrastructureExposure: 50
  };

  const jsonContent = JSON.stringify({
    report_metadata: {
      system_name: "FloodGuard AI Geospatial Early Warning System",
      version: "3.2",
      report_generated_at: new Date().toISOString(),
      evaluation_model: "Multi-Parametric Geospatial Hydrology Ensemble",
      baseline_dataset: "Historical & Active Catchment Hydrology (2021–2026)"
    },
    catchment_geography: {
      location_name: data.point.locationName,
      coordinates: {
        latitude: data.point.latitude,
        longitude: data.point.longitude,
        elevation_meters_msl: data.point.elevation
      },
      basin_characteristics: {
        soil_pedology: data.point.soilType,
        land_cover: data.point.landCover,
        population_density_per_km2: data.point.populationDensity,
        drainage_infrastructure_rating_10: data.point.infrastructureScore,
        recorded_historical_flood_events: data.point.historicalFloods
      }
    },
    risk_assessment: {
      overall_risk_score: Number(data.prediction.riskScore.toFixed(1)),
      risk_level: data.prediction.riskLevel,
      flash_flood_alert: data.prediction.flashFloodAlert,
      model_confidence_percent: Number(data.prediction.confidenceScore.toFixed(1))
    },
    multi_factorial_area_decomposition: {
      weights_and_contributions: [
        {
          axis: "Meteorological Hazard",
          weight_percent: 34,
          raw_score: Number(sub.meteorologicalHazard.toFixed(1)),
          points_contributed: Number((sub.meteorologicalHazard * 0.34).toFixed(1)),
          inputs: {
            rainfall_24h_mm: data.point.rainfall,
            live_rain_rate_mm_h: data.point.liveWeather?.precipitationRate ?? 0,
            humidity_percent: data.point.humidity
          }
        },
        {
          axis: "Hydrological Riverine Stress",
          weight_percent: 20,
          raw_score: Number(sub.hydrologicalStress.toFixed(1)),
          points_contributed: Number((sub.hydrologicalStress * 0.20).toFixed(1)),
          inputs: {
            river_discharge_m3_s: data.point.riverDischarge,
            water_level_m: data.point.waterLevel
          }
        },
        {
          axis: "Topographic Slope & Elevation Profile",
          weight_percent: 20,
          raw_score: Number(sub.topographicVulnerability.toFixed(1)),
          points_contributed: Number((sub.topographicVulnerability * 0.20).toFixed(1)),
          inputs: {
            elevation_m: data.point.elevation
          }
        },
        {
          axis: "Soil Saturation & Runoff Ratio",
          weight_percent: 16,
          raw_score: Number(sub.soilSaturationRunoff.toFixed(1)),
          points_contributed: Number((sub.soilSaturationRunoff * 0.16).toFixed(1)),
          inputs: {
            soil_type: data.point.soilType,
            soil_moisture_ratio: data.point.liveWeather?.soilMoisture ?? 0.28
          }
        },
        {
          axis: "Socio-Infrastructure Exposure",
          weight_percent: 10,
          raw_score: Number(sub.socioInfrastructureExposure.toFixed(1)),
          points_contributed: Number((sub.socioInfrastructureExposure * 0.10).toFixed(1)),
          inputs: {
            population_density: data.point.populationDensity,
            infrastructure_score: data.point.infrastructureScore
          }
        }
      ],
      synthesis_formula: "Score = (Met * 0.34) + (Hydro * 0.20) + (Topo * 0.20) + (Soil * 0.16) + (Socio * 0.10)"
    },
    sensor_telemetry: {
      rainfall_24h_mm: data.point.rainfall,
      river_discharge_m3_s: data.point.riverDischarge,
      water_level_meters: data.point.waterLevel,
      temperature_celsius: data.point.temperature,
      relative_humidity_percent: data.point.humidity,
      live_telemetry_active: Boolean(data.point.liveWeather?.isLive),
      live_weather: data.point.liveWeather || null
    },
    explainable_ai_feature_attributions: data.prediction.featureImportance.map(f => ({
      feature: f.name,
      contribution_percent: Number(f.importance.toFixed(1))
    })),
    mitigation_and_reasoning: {
      executive_summary: data.reasoning?.summary || "Automated multi-factor geospatial assessment completed.",
      vulnerability_factors: data.reasoning?.factors || [],
      action_recommendations: data.reasoning?.recommendations || []
    }
  }, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = data.point.locationName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  a.href = url;
  a.download = `FloodGuard_Telemetry_${safeName}_2026.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printExecutiveReport(data: ReportData) {
  const { point, prediction, reasoning } = data;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const sub = prediction.subScores || {
    meteorologicalHazard: 50,
    topographicVulnerability: 50,
    soilSaturationRunoff: 50,
    hydrologicalStress: 50,
    socioInfrastructureExposure: 50
  };

  const printWindow = window.open('', '_blank', 'width=950,height=850');
  if (!printWindow) {
    downloadTextReport(data);
    return;
  }

  const riskColor = 
    prediction.riskLevel === 'CRITICAL' ? '#dc2626' :
    prediction.riskLevel === 'HIGH' ? '#e11d48' :
    prediction.riskLevel === 'MEDIUM' ? '#d97706' : '#059669';

  const riskBg = 
    prediction.riskLevel === 'CRITICAL' ? '#fef2f2' :
    prediction.riskLevel === 'HIGH' ? '#fff1f2' :
    prediction.riskLevel === 'MEDIUM' ? '#fffbeb' : '#ecfdf5';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Flood Risk Report - ${point.locationName}</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            color: #0f172a; 
            margin: 32px; 
            font-size: 13px; 
            line-height: 1.5; 
            background: #ffffff;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            border-bottom: 2px solid #0f172a; 
            padding-bottom: 16px; 
            margin-bottom: 20px; 
          }
          .title { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
          .subtitle { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: 900; color: white; font-size: 12px; letter-spacing: 0.5px; }
          .score-card { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 16px 20px; 
            margin-bottom: 20px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
          }
          .score-num { font-size: 38px; font-weight: 900; line-height: 1; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
          th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          th { background: #f1f5f9; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
          .section-title { 
            font-size: 12px; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 0.8px; 
            color: #0f172a; 
            margin: 22px 0 8px 0; 
            border-bottom: 1px solid #cbd5e1; 
            padding-bottom: 4px; 
          }
          .bar-container { background: #e2e8f0; height: 7px; border-radius: 4px; overflow: hidden; margin-top: 4px; }
          .bar-fill { height: 100%; background: #2563eb; border-radius: 4px; }
          .rec-box { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 14px; 
            margin-bottom: 16px; 
          }
          .rec-item { margin-bottom: 6px; padding-left: 14px; position: relative; font-size: 12px; }
          .rec-item::before { content: "•"; position: absolute; left: 0; color: #2563eb; font-weight: bold; }
          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
          @media print {
            body { margin: 16px; font-size: 12px; }
            .no-print { display: none !important; }
            .score-card, table, .rec-box { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 18px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 800; color: #0f172a;">FloodGuard AI • Official Assessment Audit Document</span>
          <button onclick="window.print()" style="background: #0f172a; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 800; font-size: 12px; cursor: pointer;">
            Print / Save to PDF
          </button>
        </div>

        <div class="header">
          <div>
            <div class="title">FloodGuard AI • Geospatial Hydrology Audit</div>
            <div class="subtitle">Real-Life Area Risk Detection & Early Warning System</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 12px;">${dateStr}</div>
            <div style="font-size: 11px; color: #64748b;">Dataset: 2021–2026 Historical Hydrology</div>
          </div>
        </div>

        <div class="score-card" style="border-left: 6px solid ${riskColor};">
          <div>
            <div style="font-size: 17px; font-weight: 900; margin-bottom: 4px; color: #0f172a;">${point.locationName}</div>
            <div style="font-size: 12px; color: #64748b;">Coordinates: ${point.latitude.toFixed(4)}° N, ${point.longitude.toFixed(4)}° E • Mean Basin Elevation: ${point.elevation} m MSL</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">Soil: ${point.soilType} • Land Cover: ${point.landCover} • Historical Floods: ${point.historicalFloods} events</div>
          </div>
          <div style="text-align: right;">
            <div class="score-num" style="color: ${riskColor};">${prediction.riskScore.toFixed(1)}<span style="font-size: 16px; color: #64748b; font-weight: 600;">/100</span></div>
            <span class="badge" style="background: ${riskColor};">${prediction.riskLevel} RISK</span>
          </div>
        </div>

        <div class="section-title">1. Multi-Factorial Area Score Decomposition (5-Axis Synthesis)</div>
        <table>
          <tr>
            <th>Assessment Axis</th>
            <th>Weight</th>
            <th>Raw Index</th>
            <th>Points Added</th>
            <th>Observed Driving Parameter</th>
          </tr>
          <tr>
            <td><strong>Meteorological Hazard</strong></td>
            <td>34%</td>
            <td>${sub.meteorologicalHazard.toFixed(1)}/100</td>
            <td><strong style="color: #2563eb;">+${(sub.meteorologicalHazard * 0.34).toFixed(1)} pts</strong></td>
            <td>24h Rain: ${point.rainfall} mm ${point.liveWeather ? `(${point.liveWeather.precipitationRate} mm/h)` : ''}</td>
          </tr>
          <tr>
            <td><strong>Hydrological Riverine Stress</strong></td>
            <td>20%</td>
            <td>${sub.hydrologicalStress.toFixed(1)}/100</td>
            <td><strong style="color: #2563eb;">+${(sub.hydrologicalStress * 0.20).toFixed(1)} pts</strong></td>
            <td>Discharge: ${point.riverDischarge.toLocaleString()} m³/s | Gauge: ${point.waterLevel} m</td>
          </tr>
          <tr>
            <td><strong>Topographic Slope & Elevation</strong></td>
            <td>20%</td>
            <td>${sub.topographicVulnerability.toFixed(1)}/100</td>
            <td><strong style="color: #2563eb;">+${(sub.topographicVulnerability * 0.20).toFixed(1)} pts</strong></td>
            <td>Elevation: ${point.elevation} m MSL | Concavity Profile</td>
          </tr>
          <tr>
            <td><strong>Soil Saturation & Runoff Ratio</strong></td>
            <td>16%</td>
            <td>${sub.soilSaturationRunoff.toFixed(1)}/100</td>
            <td><strong style="color: #2563eb;">+${(sub.soilSaturationRunoff * 0.16).toFixed(1)} pts</strong></td>
            <td>Pedology: ${point.soilType} | Field Saturation Capacity</td>
          </tr>
          <tr>
            <td><strong>Socio-Infrastructure Exposure</strong></td>
            <td>10%</td>
            <td>${sub.socioInfrastructureExposure.toFixed(1)}/100</td>
            <td><strong style="color: #2563eb;">+${(sub.socioInfrastructureExposure * 0.10).toFixed(1)} pts</strong></td>
            <td>Density: ${point.populationDensity.toLocaleString()}/km² | Defense Score: ${point.infrastructureScore}/10</td>
          </tr>
        </table>

        <div class="section-title">2. In-Situ Hydrometeorological Sensor Telemetry</div>
        <table>
          <tr>
            <th>Telemetry Metric</th>
            <th>Observed Telemetry</th>
            <th>Operational Threshold</th>
            <th>Status Evaluation</th>
          </tr>
          <tr>
            <td>24-Hour Rainfall</td>
            <td><strong>${point.rainfall} mm</strong></td>
            <td>50–120 mm</td>
            <td style="color: ${point.rainfall > 180 ? '#dc2626' : point.rainfall > 120 ? '#d97706' : '#059669'}; font-weight: 700;">
              ${point.rainfall > 200 ? 'Severe Cloudburst' : point.rainfall > 120 ? 'Heavy Inundation' : 'Normal Range'}
            </td>
          </tr>
          <tr>
            <td>River Discharge Volume</td>
            <td><strong>${point.riverDischarge.toLocaleString()} m³/s</strong></td>
            <td>1,500–5,000 m³/s</td>
            <td style="color: ${point.riverDischarge > 12000 ? '#dc2626' : '#0f172a'}; font-weight: 700;">
              ${point.riverDischarge > 12000 ? 'Severe Channel Overflow' : 'Controlled Flow'}
            </td>
          </tr>
          <tr>
            <td>Water Level Gauge</td>
            <td><strong>${point.waterLevel} m</strong></td>
            <td>2.0–5.0 m</td>
            <td style="color: ${point.waterLevel > 7.5 ? '#dc2626' : '#0f172a'}; font-weight: 700;">
              ${point.waterLevel > 7.5 ? 'Bankfull Mark Exceeded' : 'Safe Operating Stage'}
            </td>
          </tr>
          <tr>
            <td>Atmospheric State</td>
            <td><strong>${point.temperature}°C, ${point.humidity}% RH</strong></td>
            <td>Convective Index</td>
            <td>${point.liveWeather?.weatherDescription || 'Calibrated Station Baseline'}</td>
          </tr>
        </table>

        <div class="section-title">3. Explainable AI (XAI) Attribution Breakdown</div>
        <table>
          <tr>
            <th>Model Parameter</th>
            <th>Risk Attribution</th>
            <th>Proportional Influence</th>
          </tr>
          ${prediction.featureImportance.map(f => `
            <tr>
              <td><strong>${f.name}</strong></td>
              <td>${f.importance.toFixed(1)}%</td>
              <td style="width: 50%;">
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${f.importance}%;"></div>
                </div>
              </td>
            </tr>
          `).join('')}
        </table>

        <div class="section-title">4. Civil Defense Action Directives & AI Intelligence</div>
        <div class="rec-box">
          <div style="font-weight: 800; margin-bottom: 4px; color: #0f172a;">Executive Synthesis:</div>
          <p style="margin: 0; color: #334155; line-height: 1.6;">${reasoning?.summary || 'Standard hydrological monitoring advised.'}</p>
        </div>

        <div class="two-col">
          <div class="rec-box" style="margin-bottom: 0;">
            <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; color: #dc2626; margin-bottom: 6px;">Critical Vulnerabilities:</div>
            ${(reasoning?.factors || []).map(f => `<div class="rec-item">${f}</div>`).join('')}
          </div>
          <div class="rec-box" style="margin-bottom: 0;">
            <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; color: #059669; margin-bottom: 6px;">Recommended Mitigations:</div>
            ${(reasoning?.recommendations || []).map(r => `<div class="rec-item">${r}</div>`).join('')}
          </div>
        </div>

        <div style="margin-top: 28px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; display: flex; justify-content: space-between;">
          <span>Audit ID: FGAI-${Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
          <span>FloodGuard AI System • Official Environmental Hydrology Audit</span>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
