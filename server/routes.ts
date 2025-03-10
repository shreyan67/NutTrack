import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  foodItemSchema, 
  dailyEntrySchema, 
  mealTypes,
  type MealType
} from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import fetch from "node-fetch";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // Get all daily entries
  apiRouter.get("/calories", async (req, res) => {
    try {
      const entries = await storage.getAllEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calorie entries" });
    }
  });
  
  // Get daily entry for a specific date
  apiRouter.get("/calories/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      if (!dateRegex.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD" });
      }
      
      const entry = await storage.getDailyEntry(date);
      
      if (!entry) {
        // If no entry exists, return a default structure
        return res.json({
          date,
          target: await storage.getDailyTarget() || 2500, // Default target calories
          breakfast: { items: [] },
          lunch: { items: [] },
          snacks: { items: [] },
          dinner: { items: [] },
          others: { items: [] }
        });
      }
      
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily entry" });
    }
  });
  
  // Add a food item to a specific meal on a specific date
  apiRouter.post("/calories/:date/:mealType", async (req, res) => {
    try {
      const { date, mealType } = req.params;
      
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD" });
      }
      
      // Validate meal type
      if (!mealTypes.includes(mealType as MealType)) {
        return res.status(400).json({ message: "Invalid meal type" });
      }
      
      // Validate food item data
      const foodItemResult = foodItemSchema.safeParse(req.body);
      if (!foodItemResult.success) {
        return res.status(400).json({ message: "Invalid food item data", errors: foodItemResult.error.format() });
      }
      
      const foodItem = foodItemResult.data;
      
      // Add food item to the specified meal
      const updatedEntry = await storage.addFoodItem(date, mealType as MealType, foodItem);
      
      res.status(201).json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to add food item" });
    }
  });
  
  // Remove a food item from a specific meal on a specific date
  apiRouter.delete("/calories/:date/:mealType/:foodId", async (req, res) => {
    try {
      const { date, mealType, foodId } = req.params;
      
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD" });
      }
      
      // Validate meal type
      if (!mealTypes.includes(mealType as MealType)) {
        return res.status(400).json({ message: "Invalid meal type" });
      }
      
      // Convert foodId to number
      const foodIdNumber = parseInt(foodId);
      if (isNaN(foodIdNumber)) {
        return res.status(400).json({ message: "Invalid food ID" });
      }
      
      // Remove food item from the specified meal
      const updatedEntry = await storage.removeFoodItem(date, mealType as MealType, foodIdNumber);
      
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to remove food item" });
    }
  });
  
  // Update daily calorie target
  apiRouter.put("/calories/target", async (req, res) => {
    try {
      const schema = z.object({
        target: z.number().min(1, "Target must be greater than 0")
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid target", errors: result.error.format() });
      }
      
      const { target } = result.data;
      
      await storage.setDailyTarget(target);
      
      res.json({ target });
    } catch (error) {
      res.status(500).json({ message: "Failed to update daily target" });
    }
  });
  
  // Get nutrition information for a food item using Edamam API
  apiRouter.get("/nutrition/search", async (req, res) => {
    try {
      const { query, amount } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }

      // Import the Edamam API functions
      const { getNutritionData, parseAmount } = await import('./edamam');

      // Format the search query based on amount if provided
      const searchQuery = amount ? `${amount} ${query}` : String(query);
      
      // Get nutrition data from Edamam API
      const nutritionData = await getNutritionData(searchQuery);
      
      // If no results from Edamam API, fallback to our reliable database
      if (nutritionData.length === 0) {
        const foodName = String(query).toLowerCase();
        const commonFoods: Record<string, number> = {
          // Meats (per 100g)
          'chicken breast': 165,
          'grilled chicken breast': 165,
          'chicken thigh': 209,
          'ground beef': 250,
          'beef steak': 250,
          'pork chop': 231,
          'bacon': 417,
          'salmon': 208,
          'tuna': 184,
          'tilapia': 128,
          
          // Fruits (per 100g)
          'apple': 52,
          'banana': 89,
          'orange': 47,
          'grape': 69,
          'strawberry': 32,
          'blueberry': 57,
          'watermelon': 30,
          
          // Vegetables (per 100g)
          'carrot': 41,
          'broccoli': 34,
          'spinach': 23,
          'potato': 77,
          'sweet potato': 86,
          'tomato': 18,
          'cucumber': 15,
          
          // Dairy & Eggs (per 100g)
          'milk': 42,
          'cheese': 402,
          'yogurt': 59,
          'butter': 717,
          'egg': 155,
          'boiled egg': 155,
          
          // Grains & Bread (per 100g)
          'white rice': 130,
          'brown rice': 111,
          'pasta': 131,
          'bread': 265,
          'white bread': 265,
          'whole wheat bread': 247,
          'oatmeal': 68,
          
          // Nuts & Seeds (per 100g)
          'almonds': 579,
          'walnuts': 654,
          'peanuts': 567,
          'cashews': 553,
          
          // Common prepared foods
          'pizza': 266,
          'hamburger': 295,
          'french fries': 312,
          'ice cream': 207,
          'chocolate': 546,
          'potato chips': 536
        };
        
        // Find matching food in database
        for (const [key, calorieValue] of Object.entries(commonFoods)) {
          if (foodName.includes(key)) {
            // Create a result from our reliable database
            const amountObj = amount ? parseAmount(String(amount)) : { value: 1, unit: 'serving' };
            let servingSize = '100g';
            let calories = calorieValue;
            
            // Adjust calories based on amount if needed
            if (amountObj && amountObj.unit !== 'g' && amountObj.value !== 100) {
              // Simple scaling for now - this could be improved with more sophisticated conversions
              if (amountObj.unit === 'g') {
                calories = Math.round(calorieValue * amountObj.value / 100);
                servingSize = `${amountObj.value}g`;
              } else {
                servingSize = `${amountObj.value} ${amountObj.unit}`;
              }
            }
            
            // Return the result from our database
            return res.json([{
              name: key,
              calories: calories,
              servingSize: servingSize,
              servingWeight: 100,
              protein_g: 0, // We don't have this data in our simplified database
              carbohydrates_total_g: 0,
              fat_total_g: 0,
              calorieSource: 'reliable_database',
              confidence: 'medium'
            }]);
          }
        }
        
        // If no match in database, return empty array
        return res.json([]);
      }
      
      // Return the Edamam API results
      res.json(nutritionData);
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      res.status(500).json({ message: "Failed to fetch nutrition data" });
    }
  });
  
  // Estimate calories based on macronutrients and common food database
  function calculateEstimatedCalories(foodItem: any): number {
    try {
      // First check our reliable food database for common foods (per 100g unless specified)
      const commonFoods: Record<string, number> = {
        // Meats (per 100g)
        'chicken breast': 165,
        'grilled chicken breast': 165,
        'chicken thigh': 209,
        'ground beef': 250,
        'beef steak': 250,
        'pork chop': 231,
        'bacon': 417,
        'salmon': 208,
        'tuna': 184,
        'tilapia': 128,
        
        // Fruits (per 100g)
        'apple': 52,
        'banana': 89,
        'orange': 47,
        'grape': 69,
        'strawberry': 32,
        'blueberry': 57,
        'watermelon': 30,
        
        // Vegetables (per 100g)
        'carrot': 41,
        'broccoli': 34,
        'spinach': 23,
        'potato': 77,
        'sweet potato': 86,
        'tomato': 18,
        'cucumber': 15,
        
        // Dairy & Eggs (per 100g)
        'milk': 42,
        'cheese': 402,
        'yogurt': 59,
        'butter': 717,
        'egg': 155,
        'boiled egg': 155,
        
        // Grains & Bread (per 100g)
        'white rice': 130,
        'brown rice': 111,
        'pasta': 131,
        'bread': 265,
        'white bread': 265,
        'whole wheat bread': 247,
        'oatmeal': 68,
        
        // Nuts & Seeds (per 100g)
        'almonds': 579,
        'walnuts': 654,
        'peanuts': 567,
        'cashews': 553,
        
        // Common prepared foods
        'pizza': 266,
        'hamburger': 295,
        'french fries': 312,
        'ice cream': 207,
        'chocolate': 546,
        'potato chips': 536
      };
      
      // Check if the food name exists in our database (case insensitive)
      const foodName = foodItem.name.toLowerCase();
      for (const [key, calories] of Object.entries(commonFoods)) {
        if (foodName.includes(key)) {
          return calories;
        }
      }
      
      // If not in database, apply the standard formula for calorie calculation from macronutrients
      // 1g protein = 4 calories, 1g carbs = 4 calories, 1g fat = 9 calories
      const proteinCalories = typeof foodItem.protein_g === 'number' ? foodItem.protein_g * 4 : 0;
      const carbCalories = typeof foodItem.carbohydrates_total_g === 'number' ? foodItem.carbohydrates_total_g * 4 : 0;
      const fatCalories = typeof foodItem.fat_total_g === 'number' ? foodItem.fat_total_g * 9 : 0;
      
      // Sum up all calories
      const totalCalories = proteinCalories + carbCalories + fatCalories;
      
      // Provide a default estimate if calculation fails
      if (isNaN(totalCalories) || totalCalories === 0) {
        return 100; // Default fallback
      }
      
      return Math.round(totalCalories);
    } catch (error) {
      console.error('Error calculating estimated calories:', error);
      return 100; // Reasonable default
    }
  };

  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
