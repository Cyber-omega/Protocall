
import { GoogleGenAI, Type } from "@google/genai";
import { InterviewAnalysis, InterviewSessionConfig, TranscriptionTurn } from "../types";
import { ANALYSIS_MODEL } from "../constants";

export const generateEvaluation = async (
  config: InterviewSessionConfig,
  history: TranscriptionTurn[]
): Promise<InterviewAnalysis> => {
  // Use the API key directly from process.env.API_KEY as per the library guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const transcript = history.map(h => `${h.role === 'user' ? 'Candidate' : 'Interviewer'}: ${h.text}`).join('\n');

  const prompt = `
    Analyze the following mock interview transcript for a ${config.difficulty} ${config.role} position.
    The focus areas were: ${config.focus.join(', ')}.
    
    TRANSCRIPT:
    ${transcript}
    
    Evaluate the candidate on a scale of 1-100 for Clarity, Confidence, and Communication. 
    Also provide overall score, technical knowledge assessment, strengths, weaknesses, and concrete recommendations.
  `;

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          clarity: { type: Type.NUMBER },
          confidence: { type: Type.NUMBER },
          communication: { type: Type.NUMBER },
          technicalKnowledge: { type: Type.NUMBER },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["overallScore", "clarity", "confidence", "communication", "technicalKnowledge", "strengths", "weaknesses", "recommendations"],
      },
    },
  });

  const data = JSON.parse(response.text || '{}');
  return {
    ...data,
    transcript
  };
};
