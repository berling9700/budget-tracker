import { GoogleGenAI } from "@google/genai";
import { Asset, Budget, Liability } from '../../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const getPageContextInstruction = (page: string): string => {
    switch(page) {
        case 'dashboard':
            return `The user is on the main dashboard. Provide a holistic overview of their financial health. Analyze their net worth (assets vs. liabilities) and their annual budget performance. Suggest 2-3 high-level, actionable steps they could take to improve their financial situation.`;
        case 'budgets':
            return `The user is viewing their budget. Analyze their spending habits based on the provided budget data. Identify categories where they are overspending or where there are potential savings. Offer specific, practical tips for reducing expenses in those categories.`;
        case 'assets':
            return `The user is on the assets page. Review their list of assets. Based on their holdings and asset types, suggest potential areas for diversification or growth. IMPORTANT: Do not give specific stock picks (e.g., "buy AAPL"). Instead, suggest general strategies (e.g., "Consider diversifying into international ETFs," or "Your cash savings are high, you might consider investing some of it for long-term growth if you have a high risk tolerance.").`;
        default:
            return `Provide general financial advice based on the user's query and their overall financial data.`;
    }
}

export const getFinancialAdvice = async (
  query: string,
  page: string,
  budgets: Budget[],
  assets: Asset[],
  liabilities: Liability[],
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key for Gemini is not configured.");
  }

  const systemInstruction = `You are a helpful and friendly AI financial assistant. Your goal is to provide insightful recommendations based on the user's financial data. You are NOT a licensed financial advisor, and your advice should be considered for informational purposes only. Always include a disclaimer to this effect at the end of your response. Base your analysis strictly on the data provided. Be encouraging and clear in your recommendations. Use markdown for formatting lists and bolding key points.`;

  const prompt = `
    A user is asking for financial advice. Here is their financial data:

    **Budgets:**
    \`\`\`json
    ${JSON.stringify(budgets, null, 2)}
    \`\`\`

    **Assets:**
    \`\`\`json
    ${JSON.stringify(assets, null, 2)}
    \`\`\`

    **Liabilities:**
    \`\`\`json
    ${JSON.stringify(liabilities, null, 2)}
    \`\`\`

    ---

    **Context:** ${getPageContextInstruction(page)}

    **User's Query:** "${query}"

    Please provide a helpful response based on the instructions.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
            temperature: 0.7,
        }
    });

    return response.text;
  } catch (error) {
    console.error("Error getting financial advice from Gemini:", error);
    throw new Error("The AI assistant is currently unavailable. Please try again later.");
  }
};