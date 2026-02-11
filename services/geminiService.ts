
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuizQuestions = async (subject: string, count: number = 5): Promise<Question[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera una lista de ${count} preguntas de opcion multiple sobre la asignatura: ${subject}. Cada pregunta debe ser clara, desafiante y en espanol.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ["text", "options", "correctAnswerIndex"],
          },
        },
      },
    });

    const questions: Question[] = JSON.parse(response.text || "[]").map((q: any, index: number) => ({
      ...q,
      id: `${subject}-${index}-${Date.now()}`,
    }));

    return questions;
  } catch (error) {
    console.error("Error al generar preguntas:", error);
    return [];
  }
};
