import { GoogleGenAI } from "@google/genai";

// Standard environment check to prevent ReferenceError in non-bundled environments
const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : (window as any).process?.env?.API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const GeminiService = {
  /**
   * Summarizes a single interaction or a day's worth of messages.
   * Now includes relationship context and detected values.
   */
  async summarizeInteraction(text: string): Promise<string> {
    if (!apiKey) return "API Key not configured.";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze and summarize this interaction data. Identify the core topics, the tone of the relationship, and any apparent personal or professional values expressed. Data: "${text}"`,
        config: {
          systemInstruction: "You are an expert relationship analyst. Provide a detailed 3-4 sentence summary. Focus on factual content, relationship dynamics, and underlying values (e.g., integrity, efficiency, empathy). Avoid fluff.",
        },
      });
      return response.text || 'Summary unavailable.';
    } catch (error) {
      console.error('Gemini Summarization Error:', error);
      return 'Error generating summary.';
    }
  },

  /**
   * Generates a structured relationship summary from interaction history.
   */
  async summarizeRelationship(summaries: string[]): Promise<string> {
    if (!apiKey) return "Intelligence services unavailable.";
    if (summaries.length === 0) return "No interaction history found.";
    
    const context = summaries.join("\n- ");
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', 
        contents: `Synthesize the following interaction history into a master relationship narrative. Summaries:\n- ${context}`,
        config: {
          systemInstruction: "Create a sophisticated relationship dossier. Structure: 1. Relationship Essence (1 sentence), 2. Recurring Themes & Values, 3. Evolution of Interaction. Use professional, objective language. Limit to 8 sentences.",
        },
      });
      return response.text || 'Relationship summary unavailable.';
    } catch (error) {
      console.error('Gemini Relationship Summary Error:', error);
      return 'Could not generate relationship summary.';
    }
  }
};