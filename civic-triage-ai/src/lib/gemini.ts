import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({});

export const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    issue_category: {
      type: Type.STRING,
      enum: ["Pothole", "Water Leak", "Streetlight", "Waste", "Vandalism", "Hazard"],
      description: "The primary category of the issue observed."
    },
    confidence_score: {
      type: Type.NUMBER,
      description: "Confidence in the assessment (0.0 to 1.0)."
    },
    severity_score: {
      type: Type.INTEGER,
      description: "Priority/Severity score from 1 to 100 based on physical danger or impact."
    },
    justification_for_severity: {
      type: Type.STRING,
      description: "1-sentence explanation of the physical danger observed."
    },
    suggested_city_department: {
      type: Type.STRING,
      description: "The suggested city department to handle this."
    },
    estimated_fix_complexity: {
      type: Type.STRING,
      enum: ["Quick Fix", "Standard Crew", "Major Excavation"],
      description: "The estimated complexity to resolve."
    },
    is_prank_or_unrelated: {
      type: Type.BOOLEAN,
      description: "True if the image does not depict a public infrastructure issue (e.g., a cat, a selfie)."
    },
    is_emergency_hazard: {
      type: Type.BOOLEAN,
      description: "True ONLY if the issue poses an immediate life-threatening danger: exposed live wires, gas leaks, deep sinkholes, structural collapse, flooding, chemical spills."
    },
    emergency_type: {
      type: Type.STRING,
      enum: ["electrical", "gas_leak", "structural", "flooding", "sinkhole", "chemical", "none"],
      description: "The type of emergency hazard, or 'none' if not an emergency."
    }
  },
  required: [
    "issue_category",
    "confidence_score",
    "severity_score",
    "justification_for_severity",
    "suggested_city_department",
    "estimated_fix_complexity",
    "is_prank_or_unrelated",
    "is_emergency_hazard",
    "emergency_type"
  ]
};

export async function analyzeReportImage(base64Image: string, mimeType: string) {
  const prompt = `You are an expert civil engineer and municipal triage AI. Analyze the attached image carefully.

CRITICAL SAFETY CHECK: First, determine if this is an EMERGENCY HAZARD that poses immediate life-threatening danger. Examples:
- Exposed live electrical wires or downed power lines
- Gas leaks or chemical spills
- Deep sinkholes that could swallow pedestrians or vehicles
- Structural collapse of buildings or bridges
- Active flooding threatening lives or property

If any of these are detected, set is_emergency_hazard to true and classify the emergency_type.

Then perform standard triage: categorize the issue, score severity (1-100), suggest the department, and estimate fix complexity.

Respond STRICTLY in the JSON schema provided.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      issue_category: "Hazard",
      confidence_score: 0.85,
      severity_score: 50,
      justification_for_severity: "Fallback triggered: Automated assessment unavailable.",
      suggested_city_department: "General Services",
      estimated_fix_complexity: "Standard Crew",
      is_prank_or_unrelated: false,
      is_emergency_hazard: false,
      emergency_type: "none"
    };
  }
}
