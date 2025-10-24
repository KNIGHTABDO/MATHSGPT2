import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ChartData, SolveResult, SearchResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const solveExercise = async (prompt: string, image: File | null, useThinkingMode: boolean): Promise<SolveResult> => {
  const modelName = useThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  
  const systemInstruction = `You are an expert tutor. Solve the user's problem step-by-step. 
  First, provide a detailed 'solution' using Markdown for formatting (e.g., **bold** for emphasis).
  Second, provide a concise 'explanation' of the key rule or concept.
  If the solution contains quantifiable data that can be visualized, provide a 'chartData' JSON object. The JSON must have 'type' ('bar' or 'line'), 'data' (an array of objects where each object has a 'name' (string) and 'value' (number) property), and 'dataKey' (which must be the string "value").
  Format your entire response as a single JSON object with keys "solution", "explanation", and optionally "chartData".`;

  const contents = [];
  if (image) {
    const imagePart = await fileToGenerativePart(image);
    contents.push(imagePart);
  }
  contents.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: contents },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
          type: Type.OBJECT,
          properties: {
              solution: { type: Type.STRING },
              explanation: { type: Type.STRING },
              chartData: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                      type: { type: Type.STRING, enum: ['bar', 'line'] },
                      data: { 
                          type: Type.ARRAY,
                          items: { 
                              type: Type.OBJECT,
                              properties: {
                                  name: { type: Type.STRING },
                                  value: { type: Type.NUMBER }
                              },
                              required: ['name', 'value']
                          }
                      },
                      dataKey: { type: Type.STRING }
                  }
              }
          }
      },
      ...(useThinkingMode && { thinkingConfig: { thinkingBudget: 32768 }})
    }
  });

  const text = response.text.trim();
  try {
    const parsed = JSON.parse(text) as SolveResult;
    // Basic validation
    if (parsed.solution && parsed.explanation) {
        return parsed;
    }
    throw new Error("Parsed JSON is missing required fields.");
  } catch (error) {
    console.error("Failed to parse Gemini response as JSON:", error);
    // Fallback if JSON parsing fails
    return {
        solution: text,
        explanation: "Could not extract a separate explanation.",
    };
  }
};

export const generateAudio = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: `Say clearly and concisely: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
      throw new Error("No audio data received from API.");
  }
  return base64Audio;
};

export const searchWeb = async (query: string): Promise<SearchResult> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
            tools: [{googleSearch: {}}],
        },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => chunk.web)
        .filter((web): web is { uri: string; title: string } => !!web?.uri) || [];

    return {
        answer: response.text,
        sources: sources,
    };
};