
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Assignment } from "../types";

// Initialize GoogleGenAI inside the function to ensure the most up-to-date API key is used as per guidelines.
export const getLogisticsInsights = async (assignments: Assignment[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Analyze the following logistics assignment data for today and provide a short, professional 2-sentence summary/insight for the manager.
      Data: ${JSON.stringify(assignments.map(a => ({ name: a.courierName, pkgs: a.packageCount, station: a.station })))}
      Focus on workload balance or high-priority stations. Keep it concise.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Operational data looks normal. Keep monitoring delivery times.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "AI Insights currently unavailable. Manual monitoring recommended.";
  }
};
