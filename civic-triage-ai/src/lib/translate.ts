import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  'en': 'English',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'ta': 'Tamil',
  'te': 'Telugu',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'mr': 'Marathi',
  'gu': 'Gujarati',
  'or': 'Odia',
  'pa': 'Punjabi',
  'ur': 'Urdu',
};

export async function detectAndTranslate(text: string): Promise<{
  original_language: string;
  translated_text: string;
}> {
  if (!text || text.trim().length === 0) {
    return { original_language: 'en', translated_text: text };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: `Detect the language of this text and translate it to English. If it is already in English, return it as is.

Text: "${text}"

Respond ONLY in this exact JSON format, nothing else:
{"language_code": "xx", "translated_text": "..."}

Use ISO 639-1 language codes (en, hi, bn, ta, te, kn, ml, mr, gu, or, pa, ur).` }]
      }],
      config: { responseMimeType: "application/json" }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      return {
        original_language: result.language_code || 'en',
        translated_text: result.translated_text || text,
      };
    }
  } catch (error) {
    console.error("Translation detection error:", error);
  }

  return { original_language: 'en', translated_text: text };
}

export async function translateTo(text: string, targetLangCode: string): Promise<string> {
  if (!text || text.trim().length === 0 || targetLangCode === 'en') {
    return text;
  }

  const targetLang = SUPPORTED_LANGUAGES[targetLangCode] || targetLangCode;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: `Translate the following English text to ${targetLang}. Return ONLY the translated text, nothing else.

Text: "${text}"` }]
      }],
    });

    if (response.text) {
      return response.text.trim().replace(/^["']|["']$/g, '');
    }
  } catch (error) {
    console.error("Translation error:", error);
  }

  return text;
}
