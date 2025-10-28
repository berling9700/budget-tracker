
import { GoogleGenAI, Type } from "@google/genai";
import { Category } from '../../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export interface ParsedExpenseData {
    name: string;
    amount: number;
    date: string; // ISO string
    categoryName?: string;
}

export const parseCsvExpenses = async (
  csvContent: string,
  categories: Category[]
): Promise<ParsedExpenseData[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key for Gemini is not configured.");
  }

  const categoryNames = categories.map(c => c.name).join(', ');

  const prompt = `
    Parse the following CSV data which represents a list of financial transactions.
    The CSV may or may not have headers, and columns for date, description, and amount might be in any order.
    Identify the date, a description/name for the transaction, and the amount.
    For each transaction, assign it to the most relevant category from the provided list: ${categoryNames}.
    - If a transaction fits well into an existing category, use that category name exactly as provided.
    - If a transaction represents a common expense type but doesn't fit any existing category (e.g., a new 'Subscription' or 'Pet Supplies' expense), you are encouraged to create a logical, new category name for it.
    - If you are truly unsure or the transaction is ambiguous, assign it to the category "Other".
    This allows the app to learn and adapt to the user's spending habits.
    Today is ${new Date().toDateString()}. Use this for any transactions that lack a specific date.
    The amount might be in a credit/debit column; treat all numbers as positive expense amounts.
    Output a JSON object containing a list of these expenses.

    Category List: ${categoryNames}
    
    CSV Data:
    """
    ${csvContent}
    """
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      expenses: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'A brief name for the expense (e.g., "Starbucks", "Online shopping").',
            },
            amount: {
              type: Type.NUMBER,
              description: 'The cost of the expense as a positive number.',
            },
            date: {
                type: Type.STRING,
                description: 'The date of the expense in YYYY-MM-DD format.',
            },
            categoryName: {
              type: Type.STRING,
              description: `The most appropriate category. This can be one of the existing categories (${categoryNames}), a new logical category name you identify, or "Other" if it's unclear.`,
            },
          },
          required: ["name", "amount", "date", "categoryName"],
        },
      },
    },
    required: ["expenses"],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    if (parsedJson.expenses && Array.isArray(parsedJson.expenses)) {
        return parsedJson.expenses.map((exp: any) => {
            // Ensure date is valid, otherwise default to today
            const expenseDate = exp.date && !isNaN(new Date(exp.date).getTime()) ? new Date(exp.date) : new Date();
            return {
                name: exp.name,
                amount: Math.abs(exp.amount), // Ensure amount is positive
                date: expenseDate.toISOString(),
                categoryName: exp.categoryName,
            };
        });
    }
    return [];
  } catch (error) {
    console.error("Error parsing expenses with Gemini:", error);
    throw new Error("Failed to parse CSV. The AI model might be unavailable or the file format was unclear.");
  }
};