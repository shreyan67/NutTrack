import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface NutritionInfo {
  calories: number;
  protein_g: number;
  carbohydrates_total_g: number;
  fat_total_g: number;
  confidence: 'high' | 'medium' | 'low';
}

export async function getNutritionInfo(foodItem: string, amount: string): Promise<NutritionInfo> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert API that provides accurate nutritional information. 
          Always respond with a JSON object containing calories and macronutrients.
          Base your calculations on reliable nutrition databases and scientific sources.
          Include a confidence level based on how common/standardized the food item is.`
        },
        {
          role: "user",
          content: `Calculate nutrition facts for: ${amount} of ${foodItem}
          Return ONLY a JSON object with these fields:
          - calories (number)
          - protein_g (number, grams of protein)
          - carbohydrates_total_g (number, grams of carbs)
          - fat_total_g (number, grams of fat)
          - confidence ("high", "medium", or "low" based on data reliability)`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    const nutrition = JSON.parse(result) as NutritionInfo;
    
    // Validate the response
    if (typeof nutrition.calories !== 'number' || 
        typeof nutrition.protein_g !== 'number' || 
        typeof nutrition.carbohydrates_total_g !== 'number' || 
        typeof nutrition.fat_total_g !== 'number' ||
        !['high', 'medium', 'low'].includes(nutrition.confidence)) {
      throw new Error("Invalid nutrition data format");
    }

    return nutrition;
  } catch (error) {
    console.error("Error getting nutrition info from OpenAI:", error);
    throw error;
  }
}