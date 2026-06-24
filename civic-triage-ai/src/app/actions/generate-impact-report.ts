'use server';

import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export async function generateImpactReport(officialId: string) {
  // 1. Fetch official's city/details
  const { data: official } = await supabase
    .from('officials')
    .select('name, city')
    .eq('id', officialId)
    .single();

  if (!official) return { success: false, error: 'Official not found' };

  // 2. Fetch all reports for this city (or all if not city-specific for demo)
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (!reports) return { success: false, error: 'No reports found' };

  // 3. Compute stats
  const total = reports.length;
  const resolved = reports.filter(r => r.status === 'resolved').length;
  const duplicates = reports.filter(r => r.status === 'duplicate').length;
  const emergency = reports.filter(r => r.is_emergency).length;
  
  const categories = reports.reduce((acc: any, r) => {
    const cat = r.ai_category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const statsText = `
Total Reports: ${total}
Resolved: ${resolved}
Duplicates Prevented: ${duplicates}
Emergency Escalations: ${emergency}
Category Breakdown: ${JSON.stringify(categories)}
City: ${official.city || 'Global'}
  `;

  // 4. Generate AI Narrative
  const prompt = `You are a municipal data analyst. Write a highly professional, one-paragraph executive summary for the Mayor's office based on these stats for ${official.city || 'the city'}. Highlight the efficiency gained by auto-triaging, the number of issues resolved, and duplicate labor saved. Keep it under 150 words.

Stats:
${statsText}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const narrative = response.text || "Report narrative unavailable.";

    return {
      success: true,
      data: {
        officialName: official.name,
        city: official.city,
        total,
        resolved,
        duplicates,
        emergency,
        categories,
        narrative
      }
    };
  } catch (error) {
    console.error("AI report generation error:", error);
    return { success: false, error: 'Failed to generate AI narrative' };
  }
}
