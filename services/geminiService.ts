
import { FloodDataPoint, PredictionOutput, AIReasoning, ChatMessage, RiskLevel } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-20b';

type GroqMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const getApiKey = () => {
  const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) || {};
  return (
    (typeof process !== 'undefined' ? (process.env.GROQ_API_KEY as string | undefined) : undefined) ||
    env.VITE_GROQ_API_KEY
  );
};

const requestGroqCompletion = async (
  apiKey: string,
  messages: GroqMessage[],
  options: { jsonMode?: boolean; maxTokens?: number } = {}
): Promise<string> => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: options.maxTokens ?? 800,
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {})
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody?.error?.message || `Groq request failed with status ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const result = await response.json();
  const text = result?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from Groq');
  return text;
};

export const getAIInsights = async (
  data: FloodDataPoint,
  prediction: PredictionOutput,
  maxRetries = 2
): Promise<AIReasoning> => {
  const apiKey = getApiKey();
  
  if (apiKey) {
    const prompt = `
      Analyze the following flood risk data for ${data.locationName}:
      - Risk Level: ${prediction.riskLevel} (Score: ${prediction.riskScore.toFixed(1)}/100)
      - Rainfall: ${data.rainfall}mm
      - River Discharge: ${data.riverDischarge}m³/s
      - Water Level: ${data.waterLevel}m
      - Elevation: ${data.elevation}m
      - Soil Type: ${data.soilType}
      - Historical Floods: ${data.historicalFloods}
      
      Identify the top 3 contributing factors and provide 3 actionable emergency recommendations.
    `;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const text = await requestGroqCompletion(apiKey, [
          {
            role: 'system',
            content: 'Return only valid JSON with string fields summary, contributingFactors (array of strings), and recommendations (array of strings).'
          },
          { role: 'user', content: prompt }
        ], { jsonMode: true });

        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.summary) {
            return {
              summary: parsed.summary,
              contributingFactors: parsed.contributingFactors || parsed.factors || [],
              recommendations: parsed.recommendations || []
            };
          }
        } catch {
          // fallback to local reasoning if JSON parsing fails
        }
      } catch (error: any) {
        if (i < maxRetries) {
          await sleep(500);
          continue;
        }
      }
      break;
    }
  }

  // High-fidelity independent deterministic reasoning engine (100% offline & API-free)
  const isHighRisk = prediction.riskLevel === RiskLevel.CRITICAL || prediction.riskLevel === RiskLevel.HIGH;
  const isFlash = prediction.flashFloodAlert || data.rainfall >= 180;
  
  const factors: string[] = [];
  if (data.rainfall >= 100) {
    factors.push(`Severe precipitation event (${data.rainfall}mm in 24h) exceeding standard drainage infiltration capacity.`);
  } else if (data.rainfall >= 50) {
    factors.push(`Moderate rainfall (${data.rainfall}mm) with sustained catchment saturation.`);
  } else {
    factors.push(`Residual catchment runoff under baseline rainfall (${data.rainfall}mm).`);
  }

  if (data.elevation <= 50) {
    factors.push(`Low-lying coastal or delta elevation (${data.elevation}m MSL) severely restricting gravity drainage.`);
  } else if (data.elevation >= 800) {
    factors.push(`High terrain slope gradient (${data.elevation}m MSL) accelerating kinetic torrential runoff.`);
  } else {
    factors.push(`Moderate alluvial terrain (${data.elevation}m MSL) receiving upstream tributary discharge.`);
  }

  if (data.riverDischarge >= 5000) {
    factors.push(`Extreme riverine discharge (${data.riverDischarge.toLocaleString()} m³/s) threatening mainstem levee breach.`);
  } else {
    factors.push(`Hydrological discharge gauge recorded at ${data.riverDischarge.toLocaleString()} m³/s.`);
  }

  const recommendations: string[] = [];
  if (isHighRisk) {
    recommendations.push("Initiate immediate priority vertical evacuation for residents in low-lying quadrants.");
    recommendations.push("Deploy flood barriers along vulnerable embankment breaches and inspect pump stations.");
    recommendations.push("Issue civil defense flash flood sirens and maintain open emergency evacuation corridors.");
  } else if (prediction.riskLevel === RiskLevel.MEDIUM) {
    recommendations.push("Place district emergency rescue teams on 30-minute standby notification.");
    recommendations.push("Clear secondary drainage sluice gates and secure loose riverside infrastructure.");
    recommendations.push("Broadcast hourly hydrological bulletins and advise citizens to avoid riverbanks.");
  } else {
    recommendations.push("Maintain routine automated sensor telemetry and standard rainfall monitoring.");
    recommendations.push("Verify operational status of automated river gauge telemetry loggers.");
    recommendations.push("Review local municipal disaster preparedness inventory and culvert clearance.");
  }

  const summary = isHighRisk
    ? `Critical hydrological surge detected in ${data.locationName}. Area risk index has escalated to ${prediction.riskScore.toFixed(1)}/100 (${prediction.riskLevel} RISK) due to ${isFlash ? 'torrential flash runoff' : 'severe hydraulic load'} and saturated ${data.soilType} substrata.`
    : `Stable baseline monitoring for ${data.locationName}. Current composite risk score is calibrated at ${prediction.riskScore.toFixed(1)}/100 (${prediction.riskLevel} RISK) with manageable river discharge (${data.riverDischarge.toLocaleString()} m³/s).`;

  return {
    summary,
    contributingFactors: factors,
    recommendations
  };
};

export const getAssistantChatResponse = async (
  message: string,
  currentContext: { data: FloodDataPoint, prediction: PredictionOutput },
  history: ChatMessage[]
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('No API key found; using local fallback for assistant responses.');
    const fallback = [];
    if (currentContext.prediction.riskLevel === RiskLevel.HIGH) {
      fallback.push(`⚠️ HIGH RISK ALERT for ${currentContext.data.locationName}: water level ${currentContext.data.waterLevel}m, rainfall ${currentContext.data.rainfall}mm.`);
      fallback.push('Move to the highest safe place immediately and avoid driving through flooded roads.');
      fallback.push('If trapped, call emergency services and signal with lights/noise.');
    } else {
      fallback.push(`Monitor ${currentContext.data.locationName} closely. Current risk is ${currentContext.prediction.riskLevel}.`);
      fallback.push('Prepare go-bags, secure valuables, and identify safe evacuation routes to higher ground.');
      fallback.push('Avoid standing water and keep updated with local flood alerts.');
    }
    return fallback.join(' ');
  }

  const systemInstruction = `
    You are the "FloodGuard Life-Safety Assistant". You are a specialized AI expert in disaster response and humanitarian safety.
    Your PRIMARY GOAL is to keep the user and their family alive during dangerous flood events.
    
    CRITICAL SAFETY RULES:
    1. NEVER advise walking or driving through moving water. (6 inches of water can knock a person down; 12 inches can sweep away a car).
    2. ALWAYS prioritize "Vertical Evacuation" (moving to high ground or upper floors) if water is rising fast.
    3. Advise turning off main power and gas if time permits before water enters.
    4. If someone is trapped, tell them to call 112/100 (Emergency) and signal for help (whistle, flashlight).
    
    CURRENT SITUATION IN ${currentContext.data.locationName.toUpperCase()}:
    - Risk: ${currentContext.prediction.riskLevel} (${currentContext.prediction.riskScore.toFixed(0)}/100)
    - Rain/Discharge: ${currentContext.data.rainfall}mm / ${currentContext.data.riverDischarge}m3/s.
    - Elevation: ${currentContext.data.elevation}m (Very relevant for low-lying areas).
    
    TONE:
    - Calm, authoritative, and direct.
    - No fluff. Use bullet points for checklists.
    - If the risk is HIGH, start your response with a clear warning.
  `;

  try {
    const responseText = await requestGroqCompletion(apiKey, [
      { role: 'system', content: systemInstruction },
      ...history.map(h => ({
        role: h.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: h.content
      })),
      { role: 'user', content: message }
    ]);

    const output = sanitizeAssistantOutput(responseText);
    if (output) return output;
    return generateAssistantFallbackMessage(currentContext, message);
  } catch (error) {
    return generateAssistantFallbackMessage(currentContext, message);
  }
};

const sanitizeAssistantOutput = (text?: string): string => {
  if (!text) return '';
  const lower = text.toLowerCase();
  if (lower.includes('permission denied') || lower.includes('not authorized') || lower.includes('forbidden')) {
    return '';
  }
  return text;
};

const generateAssistantFallbackMessage = (
  currentContext: { data: FloodDataPoint; prediction: PredictionOutput },
  userMessage: string
): string => {
  const { data, prediction } = currentContext;
  const query = userMessage.toLowerCase();

  if (query.includes('evacuat') || query.includes('route') || query.includes('leave') || query.includes('plan')) {
    return `🚨 EVACUATION & SAFETY GUIDANCE for ${data.locationName} (Elevation: ${data.elevation}m, Risk: ${prediction.riskLevel}):
• Identify routes to terrain above ${data.elevation + 20}m MSL heading away from active river discharge channels (${data.riverDischarge.toLocaleString()} m³/s).
• Avoid underpasses, depressed river valleys, and low-lying bridge crossings.
• If water covers the roadway, turn around immediately ("Turn Around, Don't Drown").
• If ground escape is cut off, conduct vertical evacuation to the highest structural floor or reinforced rooftop.`;
  }

  if (query.includes('home') || query.includes('secure') || query.includes('protect')) {
    return `🏠 PROPERTY PROTECTION DIRECTIVES for ${data.locationName}:
• Shut off main electrical breakers and municipal gas lines if floodwater enters the premises.
• Elevate critical appliances, official documents, and emergency medical kits to upper shelving or the top floor.
• Deploy sandbags or temporary water barriers at ground-level door thresholds.
• Anchor outdoor tanks and secure loose objects that could become kinetic hazards in floodwaters.`;
  }

  if (prediction.riskLevel === RiskLevel.CRITICAL || prediction.riskLevel === RiskLevel.HIGH) {
    return `⚠️ PRIORITY LIFE-SAFETY ALERT for ${data.locationName}:
• 24-Hour Rainfall is currently ${data.rainfall}mm with river gauge at ${data.waterLevel}m (${prediction.riskScore.toFixed(0)}/100 risk).
• Do NOT attempt to walk, swim, or drive through moving water. 6 inches of rapid water sweeps adults; 12 inches sweeps vehicles.
• Keep mobile communication devices charged and dial 112/100 if stranded. Signal emergency personnel from upper levels.`;
  }

  return `📍 HYDROLOGICAL MONITORING STATUS for ${data.locationName}:
• Current condition: ${prediction.riskLevel} Risk (Composite Score: ${prediction.riskScore.toFixed(1)}/100).
• Monitored parameters: 24h Rain ${data.rainfall}mm, River Discharge ${data.riverDischarge.toLocaleString()} m³/s, Gauge Level ${data.waterLevel}m.
• Preparedness: Keep monitoring local emergency bulletins and maintain a standard 72-hour family emergency kit.`;
};
