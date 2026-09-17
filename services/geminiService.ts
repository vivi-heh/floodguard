
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
  maxRetries = 3
): Promise<AIReasoning> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('No API key found; using local fallback AI reasoning.');
    return {
      summary: `Local analysis indicates ${prediction.riskLevel} risk in ${data.locationName} using fallback reasoning.`,
      contributingFactors: [
        `Rainfall ${data.rainfall}mm`,
        `High water level ${data.waterLevel}m`,
        `Elevation ${data.elevation}m`
      ],
      recommendations: [
        'Move to high ground immediately',
        'Avoid floodwater and do not drive in standing water',
        'Stay tuned to local emergency broadcasts'
      ]
    };
  }

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

  let lastError: any;
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
        return JSON.parse(text);
      } catch (parseError) {
        console.warn('Failed JSON parse from Groq reasoning output, falling back to simple parse', parseError);
        return {
          summary: text,
          contributingFactors: ["Flood hazard indicators", "Hydrology trends", "Local site context"],
          recommendations: ["Stay alert", "Prepare evacuation", "Follow local authority instructions"]
        };
      }

    } catch (error: any) {
      lastError = error;
      const isRetryable = error?.message?.includes('429') || error?.message?.includes('500') || error?.status === 429;

      if (isRetryable && i < maxRetries) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  if (lastError?.message?.includes('429') || lastError?.status === 429) {
    throw new Error("QUOTA_EXHAUSTED");
  }

  if (lastError?.message?.includes('MISSING_API_KEY')) {
    throw new Error('MISSING_API_KEY');
  }

  return {
    summary: `Local analysis indicates a ${prediction.riskLevel} risk zone at ${data.locationName} based on current hydrological parameters.`,
    contributingFactors: ["Excessive hydrological discharge", "Elevation profile", "Saturated soil metrics"],
    recommendations: ["Refer to local government flood manuals", "Check river embankments", "Monitor weather stations"]
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
    return generateAssistantFallbackMessage(currentContext, message, 'No text returned from model.');
  } catch (error) {
    console.error("Assistant Error:", error);
    const reason = sanitizeReason(error?.message || 'Model call failed.');
    return generateAssistantFallbackMessage(currentContext, message, reason);
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

const sanitizeReason = (reason: string): string => {
  if (!reason) return 'service unavailable';

  const clean = reason
    .replace(/\{.*\}/s, '')
    .replace(/\[.*\]/s, '')
    .replace(/(\"[^\"]*\")/g, '')
    .trim();

  const lower = clean.toLowerCase();
  if (lower.includes('permission denied') || lower.includes('not authorized') || lower.includes('forbidden') || lower.includes('leaked') || lower.includes('reported as leaked')) {
    return 'service access restricted';
  }

  return clean || 'service unavailable';
};

const generateAssistantFallbackMessage = (
  currentContext: { data: FloodDataPoint; prediction: PredictionOutput },
  userMessage: string,
  reason: string
): string => {
  const location = currentContext.data.locationName;
  const risk = currentContext.prediction.riskLevel;
  const base = [
    `Fallback local assistant for ${location} (risk: ${risk}) due to ${reason}.`,
    `User asked: "${userMessage}".`
  ];

  if (risk === RiskLevel.HIGH) {
    base.push('⚠️ High-risk protocol: move to upper floors or high ground immediately.');
    base.push('Do not walk or drive through water.');
    base.push('If you are trapped, call emergency services and signal for help.');
  } else {
    base.push('Prepare evacuation supplies and monitor local alerts.');
    base.push('Avoid standing water and secure valuables.');
  }

  return base.join(' ');
};
