import fetch from "node-fetch";

// Edamam API credentials
const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;

// Recipe API interfaces
interface RecipeNutrient {
  label: string;
  quantity: number;
  unit: string;
}

interface RecipeNutrients {
  ENERC_KCAL: RecipeNutrient;
  PROCNT: RecipeNutrient;
  FAT: RecipeNutrient;
  CHOCDF: RecipeNutrient;
  FIBTG?: RecipeNutrient;
}

interface Recipe {
  uri: string;
  label: string;
  image: string;
  source: string;
  url: string;
  yield: number;
  calories: number;
  totalWeight: number;
  totalTime: number;
  cuisineType: string[];
  mealType: string[];
  dishType: string[];
  totalNutrients: RecipeNutrients;
}

interface RecipesResponse {
  from: number;
  to: number;
  count: number;
  _links: {
    next: {
      href: string;
      title: string;
    }
  };
  hits: Array<{
    recipe: Recipe;
  }>;
}

export interface ProcessedNutritionData {
  name: string;
  calories: number;
  servingSize: string;
  servingWeight: number;
  protein_g: number;
  carbohydrates_total_g: number;
  fat_total_g: number;
  fiber_g?: number;
  calorieSource: 'edamam' | 'reliable_database' | 'estimated';
  confidence: 'high' | 'medium' | 'low';
  image?: string;
}

export async function getNutritionData(query: string): Promise<ProcessedNutritionData[]> {
  try {
    // Validate API credentials
    if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
      throw new Error('Edamam API credentials are missing');
    }

    // Clean up the query (remove amount info for better search results)
    const cleanQuery = query.replace(/^\d+\s*(g|oz|cups?|tbsp|tsp|pound|ml|l)\s+/i, '');
    
    // Format the URL with the query - using Recipe API
    const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(cleanQuery)}&app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}`;

    // Make the request to Edamam API
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Edamam API responded with status: ${response.status}`);
    }

    const data = await response.json() as RecipesResponse;
    
    // Process and clean the data
    const processedData: ProcessedNutritionData[] = [];

    // Check if we have recipe results
    if (data.hits && data.hits.length > 0) {
      // Take top 3 results or fewer if less are available
      const topResults = data.hits.slice(0, 3);
      
      for (const hit of topResults) {
        const recipe = hit.recipe;
        
        // Calculate per 100g values for easier comparison
        const caloriesPer100g = recipe.calories / recipe.totalWeight * 100;
        const proteinPer100g = recipe.totalNutrients.PROCNT ? recipe.totalNutrients.PROCNT.quantity / recipe.totalWeight * 100 : 0;
        const carbsPer100g = recipe.totalNutrients.CHOCDF ? recipe.totalNutrients.CHOCDF.quantity / recipe.totalWeight * 100 : 0;
        const fatPer100g = recipe.totalNutrients.FAT ? recipe.totalNutrients.FAT.quantity / recipe.totalWeight * 100 : 0;
        const fiberPer100g = recipe.totalNutrients.FIBTG ? recipe.totalNutrients.FIBTG.quantity / recipe.totalWeight * 100 : undefined;
        
        processedData.push({
          name: recipe.label,
          calories: Math.round(caloriesPer100g),
          servingSize: '100g',
          servingWeight: 100,
          protein_g: Math.round(proteinPer100g * 10) / 10,
          carbohydrates_total_g: Math.round(carbsPer100g * 10) / 10,
          fat_total_g: Math.round(fatPer100g * 10) / 10,
          fiber_g: fiberPer100g ? Math.round(fiberPer100g * 10) / 10 : undefined,
          calorieSource: 'edamam',
          confidence: 'medium', // Recipe API is less accurate for individual ingredients
          image: recipe.image
        });
      }
    }

    return processedData;
  } catch (error) {
    console.error('Error fetching nutrition data from Edamam:', error);
    throw error;
  }
}

// Function to adjust calories based on amount
export function adjustCaloriesForAmount(
  baseCalories: number, 
  baseAmount: { value: number, unit: string },
  targetAmount: { value: number, unit: string }
): number {
  // If units match, simple multiplication
  if (baseAmount.unit === targetAmount.unit) {
    return Math.round(baseCalories * (targetAmount.value / baseAmount.value));
  }
  
  // Handle common unit conversions
  const conversionFactors: Record<string, Record<string, number>> = {
    g: { 
      kg: 1000,
      oz: 28.35,
      lb: 453.592,
      cup: 128 // average, depends on food
    },
    ml: {
      l: 1000,
      cup: 240,
      tbsp: 15,
      tsp: 5,
      oz: 29.57
    }
  };
  
  // Try to convert units
  for (const [baseUnit, conversions] of Object.entries(conversionFactors)) {
    if (baseAmount.unit === baseUnit && targetAmount.unit in conversions) {
      const factor = conversions[targetAmount.unit];
      return Math.round(baseCalories * (targetAmount.value * factor / baseAmount.value));
    } else if (targetAmount.unit === baseUnit && baseAmount.unit in conversions) {
      const factor = conversions[baseAmount.unit];
      return Math.round(baseCalories * (targetAmount.value / (baseAmount.value * factor)));
    }
  }
  
  // If conversion not possible, return original with warning
  console.warn(`Could not convert between units: ${baseAmount.unit} and ${targetAmount.unit}`);
  return baseCalories;
}

// Parse amount string into value and unit
export function parseAmount(amountStr: string): { value: number, unit: string } | null {
  // Remove parentheses and extra spaces
  amountStr = amountStr.replace(/[()]/g, '').trim();
  
  // Match patterns like "100g", "2 cups", "1.5 oz", etc.
  const regex = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/;
  const match = amountStr.match(regex);
  
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase() || 'serving';
    return { value, unit };
  }
  
  // Handle special cases like "medium apple", "large egg"
  const sizeRegex = /^(small|medium|large)\s+(.+)$/i;
  const sizeMatch = amountStr.match(sizeRegex);
  
  if (sizeMatch) {
    const size = sizeMatch[1].toLowerCase();
    const item = sizeMatch[2];
    
    // Convert size to numerical value (approximation)
    const sizeValues: Record<string, number> = {
      small: 0.7,
      medium: 1,
      large: 1.3
    };
    
    return { value: sizeValues[size], unit: item };
  }
  
  // If no pattern match, return null
  return null;
}