import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const getAI = () => new GoogleGenAI({ apiKey });

export const getHardwareTip = async () => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents:
        "Give me one very short, snappy, and interesting technical fact or tip about modern computer hardware (GPUs, CPUs, or RAM) to show on a login page. Keep it under 20 words.",
    });

    return (
      response?.text ||
      "Did you know? Thermal paste fills microscopic gaps to maximize heat transfer."
    );
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Optimize your airflow: Front intake, rear/top exhaust for the best thermal performance.";
  }
};

export const getWelcomeMessage = async (name) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a short (1 sentence) cool cyberpunk welcome message for a user named ${name} who just registered for a PC parts store called CORE-TECH.`,
    });

    return response?.text || `Welcome to the grid, ${name}. Your next build starts here.`;
  } catch (error) {
    return `Welcome to CORE-TECH, ${name}. Level up your rig today.`;
  }
};
