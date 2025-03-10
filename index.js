var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/edamam.ts
var edamam_exports = {};
__export(edamam_exports, {
  adjustCaloriesForAmount: () => adjustCaloriesForAmount,
  getNutritionData: () => getNutritionData,
  parseAmount: () => parseAmount
});
import fetch from "node-fetch";
async function getNutritionData(query) {
  try {
    if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
      throw new Error("Edamam API credentials are missing");
    }
    const cleanQuery = query.replace(/^\d+\s*(g|oz|cups?|tbsp|tsp|pound|ml|l)\s+/i, "");
    const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(cleanQuery)}&app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Edamam API responded with status: ${response.status}`);
    }
    const data = await response.json();
    const processedData = [];
    if (data.hits && data.hits.length > 0) {
      const topResults = data.hits.slice(0, 3);
      for (const hit of topResults) {
        const recipe = hit.recipe;
        const caloriesPer100g = recipe.calories / recipe.totalWeight * 100;
        const proteinPer100g = recipe.totalNutrients.PROCNT ? recipe.totalNutrients.PROCNT.quantity / recipe.totalWeight * 100 : 0;
        const carbsPer100g = recipe.totalNutrients.CHOCDF ? recipe.totalNutrients.CHOCDF.quantity / recipe.totalWeight * 100 : 0;
        const fatPer100g = recipe.totalNutrients.FAT ? recipe.totalNutrients.FAT.quantity / recipe.totalWeight * 100 : 0;
        const fiberPer100g = recipe.totalNutrients.FIBTG ? recipe.totalNutrients.FIBTG.quantity / recipe.totalWeight * 100 : void 0;
        processedData.push({
          name: recipe.label,
          calories: Math.round(caloriesPer100g),
          servingSize: "100g",
          servingWeight: 100,
          protein_g: Math.round(proteinPer100g * 10) / 10,
          carbohydrates_total_g: Math.round(carbsPer100g * 10) / 10,
          fat_total_g: Math.round(fatPer100g * 10) / 10,
          fiber_g: fiberPer100g ? Math.round(fiberPer100g * 10) / 10 : void 0,
          calorieSource: "edamam",
          confidence: "medium",
          // Recipe API is less accurate for individual ingredients
          image: recipe.image
        });
      }
    }
    return processedData;
  } catch (error) {
    console.error("Error fetching nutrition data from Edamam:", error);
    throw error;
  }
}
function adjustCaloriesForAmount(baseCalories, baseAmount, targetAmount) {
  if (baseAmount.unit === targetAmount.unit) {
    return Math.round(baseCalories * (targetAmount.value / baseAmount.value));
  }
  const conversionFactors = {
    g: {
      kg: 1e3,
      oz: 28.35,
      lb: 453.592,
      cup: 128
      // average, depends on food
    },
    ml: {
      l: 1e3,
      cup: 240,
      tbsp: 15,
      tsp: 5,
      oz: 29.57
    }
  };
  for (const [baseUnit, conversions] of Object.entries(conversionFactors)) {
    if (baseAmount.unit === baseUnit && targetAmount.unit in conversions) {
      const factor = conversions[targetAmount.unit];
      return Math.round(baseCalories * (targetAmount.value * factor / baseAmount.value));
    } else if (targetAmount.unit === baseUnit && baseAmount.unit in conversions) {
      const factor = conversions[baseAmount.unit];
      return Math.round(baseCalories * (targetAmount.value / (baseAmount.value * factor)));
    }
  }
  console.warn(`Could not convert between units: ${baseAmount.unit} and ${targetAmount.unit}`);
  return baseCalories;
}
function parseAmount(amountStr) {
  amountStr = amountStr.replace(/[()]/g, "").trim();
  const regex = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/;
  const match = amountStr.match(regex);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase() || "serving";
    return { value, unit };
  }
  const sizeRegex = /^(small|medium|large)\s+(.+)$/i;
  const sizeMatch = amountStr.match(sizeRegex);
  if (sizeMatch) {
    const size = sizeMatch[1].toLowerCase();
    const item = sizeMatch[2];
    const sizeValues = {
      small: 0.7,
      medium: 1,
      large: 1.3
    };
    return { value: sizeValues[size], unit: item };
  }
  return null;
}
var EDAMAM_APP_ID, EDAMAM_APP_KEY;
var init_edamam = __esm({
  "server/edamam.ts"() {
    "use strict";
    EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
    EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  entries;
  currentFoodId;
  dailyTarget;
  constructor() {
    this.entries = /* @__PURE__ */ new Map();
    this.currentFoodId = 1;
    this.dailyTarget = 2500;
  }
  async getDailyEntry(date2) {
    return this.entries.get(date2);
  }
  async getAllEntries() {
    return Array.from(this.entries.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  async addFoodItem(date2, mealType, foodItem) {
    let entry = this.entries.get(date2);
    if (!entry) {
      entry = {
        date: date2,
        target: this.dailyTarget,
        breakfast: { items: [] },
        lunch: { items: [] },
        snacks: { items: [] },
        dinner: { items: [] },
        others: { items: [] }
      };
    }
    const newFoodItem = {
      ...foodItem,
      id: this.currentFoodId++
    };
    if (!entry[mealType]) {
      entry[mealType] = { items: [] };
    }
    entry[mealType].items.push(newFoodItem);
    this.entries.set(date2, entry);
    return entry;
  }
  async removeFoodItem(date2, mealType, foodId) {
    const entry = this.entries.get(date2);
    if (!entry) {
      throw new Error(`No entry found for date: ${date2}`);
    }
    if (!entry[mealType]) {
      throw new Error(`No ${mealType} meal found for date: ${date2}`);
    }
    entry[mealType].items = entry[mealType].items.filter((item) => item.id !== foodId);
    this.entries.set(date2, entry);
    return entry;
  }
  async getDailyTarget() {
    return this.dailyTarget;
  }
  async setDailyTarget(target) {
    this.dailyTarget = target;
    for (const [date2, entry] of this.entries.entries()) {
      entry.target = target;
      this.entries.set(date2, entry);
    }
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var mealTypes = ["breakfast", "lunch", "snacks", "dinner", "others"];
var foodItems = pgTable("food_items", {
  id: serial("id").primaryKey(),
  entryDate: text("entry_date").notNull(),
  mealType: text("meal_type").notNull(),
  name: text("name").notNull(),
  amount: text("amount").notNull(),
  calories: integer("calories").notNull(),
  notes: text("notes").default("")
});
var foodItemSchema = z.object({
  name: z.string().min(1, "Food name is required"),
  amount: z.string().min(1, "Amount is required"),
  calories: z.number().min(1, "Calories must be greater than 0"),
  notes: z.string().optional().default("")
});
var dailyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  target: z.number().min(1, "Target must be greater than 0").default(2500),
  breakfast: z.object({
    items: z.array(foodItemSchema.extend({ id: z.number() }))
  }).default({ items: [] }),
  lunch: z.object({
    items: z.array(foodItemSchema.extend({ id: z.number() }))
  }).default({ items: [] }),
  snacks: z.object({
    items: z.array(foodItemSchema.extend({ id: z.number() }))
  }).default({ items: [] }),
  dinner: z.object({
    items: z.array(foodItemSchema.extend({ id: z.number() }))
  }).default({ items: [] }),
  others: z.object({
    items: z.array(foodItemSchema.extend({ id: z.number() }))
  }).default({ items: [] })
});
var insertFoodItemSchema = createInsertSchema(foodItems).omit({ id: true });

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  const apiRouter = express.Router();
  apiRouter.get("/calories", async (req, res) => {
    try {
      const entries = await storage.getAllEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calorie entries" });
    }
  });
  apiRouter.get("/calories/:date", async (req, res) => {
    try {
      const { date: date2 } = req.params;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date2)) {
        return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD" });
      }
      const entry = await storage.getDailyEntry(date2);
      if (!entry) {
        return res.json({
          date: date2,
          target: await storage.getDailyTarget() || 2500,
          // Default target calories
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
  apiRouter.post("/calories/:date/:mealType", async (req, res) => {
    try {
      const { date: date2, mealType } = req.params;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date2)) {
        return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD" });
      }
      if (!mealTypes.includes(mealType)) {
        return res.status(400).json({ message: "Invalid meal type" });
      }
      const foodItemResult = foodItemSchema.safeParse(req.body);
      if (!foodItemResult.success) {
        return res.status(400).json({ message: "Invalid food item data", errors: foodItemResult.error.format() });
      }
      const foodItem = foodItemResult.data;
      const updatedEntry = await storage.addFoodItem(date2, mealType, foodItem);
      res.status(201).json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to add food item" });
    }
  });
  apiRouter.delete("/calories/:date/:mealType/:foodId", async (req, res) => {
    try {
      const { date: date2, mealType, foodId } = req.params;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date2)) {
        return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD" });
      }
      if (!mealTypes.includes(mealType)) {
        return res.status(400).json({ message: "Invalid meal type" });
      }
      const foodIdNumber = parseInt(foodId);
      if (isNaN(foodIdNumber)) {
        return res.status(400).json({ message: "Invalid food ID" });
      }
      const updatedEntry = await storage.removeFoodItem(date2, mealType, foodIdNumber);
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to remove food item" });
    }
  });
  apiRouter.put("/calories/target", async (req, res) => {
    try {
      const schema = z2.object({
        target: z2.number().min(1, "Target must be greater than 0")
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
  apiRouter.get("/nutrition/search", async (req, res) => {
    try {
      const { query, amount } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      const { getNutritionData: getNutritionData2, parseAmount: parseAmount2 } = await Promise.resolve().then(() => (init_edamam(), edamam_exports));
      const searchQuery = amount ? `${amount} ${query}` : String(query);
      const nutritionData = await getNutritionData2(searchQuery);
      if (nutritionData.length === 0) {
        const foodName = String(query).toLowerCase();
        const commonFoods = {
          // Meats (per 100g)
          "chicken breast": 165,
          "grilled chicken breast": 165,
          "chicken thigh": 209,
          "ground beef": 250,
          "beef steak": 250,
          "pork chop": 231,
          "bacon": 417,
          "salmon": 208,
          "tuna": 184,
          "tilapia": 128,
          // Fruits (per 100g)
          "apple": 52,
          "banana": 89,
          "orange": 47,
          "grape": 69,
          "strawberry": 32,
          "blueberry": 57,
          "watermelon": 30,
          // Vegetables (per 100g)
          "carrot": 41,
          "broccoli": 34,
          "spinach": 23,
          "potato": 77,
          "sweet potato": 86,
          "tomato": 18,
          "cucumber": 15,
          // Dairy & Eggs (per 100g)
          "milk": 42,
          "cheese": 402,
          "yogurt": 59,
          "butter": 717,
          "egg": 155,
          "boiled egg": 155,
          // Grains & Bread (per 100g)
          "white rice": 130,
          "brown rice": 111,
          "pasta": 131,
          "bread": 265,
          "white bread": 265,
          "whole wheat bread": 247,
          "oatmeal": 68,
          // Nuts & Seeds (per 100g)
          "almonds": 579,
          "walnuts": 654,
          "peanuts": 567,
          "cashews": 553,
          // Common prepared foods
          "pizza": 266,
          "hamburger": 295,
          "french fries": 312,
          "ice cream": 207,
          "chocolate": 546,
          "potato chips": 536
        };
        for (const [key, calorieValue] of Object.entries(commonFoods)) {
          if (foodName.includes(key)) {
            const amountObj = amount ? parseAmount2(String(amount)) : { value: 1, unit: "serving" };
            let servingSize = "100g";
            let calories = calorieValue;
            if (amountObj && amountObj.unit !== "g" && amountObj.value !== 100) {
              if (amountObj.unit === "g") {
                calories = Math.round(calorieValue * amountObj.value / 100);
                servingSize = `${amountObj.value}g`;
              } else {
                servingSize = `${amountObj.value} ${amountObj.unit}`;
              }
            }
            return res.json([{
              name: key,
              calories,
              servingSize,
              servingWeight: 100,
              protein_g: 0,
              // We don't have this data in our simplified database
              carbohydrates_total_g: 0,
              fat_total_g: 0,
              calorieSource: "reliable_database",
              confidence: "medium"
            }]);
          }
        }
        return res.json([]);
      }
      res.json(nutritionData);
    } catch (error) {
      console.error("Error fetching nutrition data:", error);
      res.status(500).json({ message: "Failed to fetch nutrition data" });
    }
  });
  function calculateEstimatedCalories(foodItem) {
    try {
      const commonFoods = {
        // Meats (per 100g)
        "chicken breast": 165,
        "grilled chicken breast": 165,
        "chicken thigh": 209,
        "ground beef": 250,
        "beef steak": 250,
        "pork chop": 231,
        "bacon": 417,
        "salmon": 208,
        "tuna": 184,
        "tilapia": 128,
        // Fruits (per 100g)
        "apple": 52,
        "banana": 89,
        "orange": 47,
        "grape": 69,
        "strawberry": 32,
        "blueberry": 57,
        "watermelon": 30,
        // Vegetables (per 100g)
        "carrot": 41,
        "broccoli": 34,
        "spinach": 23,
        "potato": 77,
        "sweet potato": 86,
        "tomato": 18,
        "cucumber": 15,
        // Dairy & Eggs (per 100g)
        "milk": 42,
        "cheese": 402,
        "yogurt": 59,
        "butter": 717,
        "egg": 155,
        "boiled egg": 155,
        // Grains & Bread (per 100g)
        "white rice": 130,
        "brown rice": 111,
        "pasta": 131,
        "bread": 265,
        "white bread": 265,
        "whole wheat bread": 247,
        "oatmeal": 68,
        // Nuts & Seeds (per 100g)
        "almonds": 579,
        "walnuts": 654,
        "peanuts": 567,
        "cashews": 553,
        // Common prepared foods
        "pizza": 266,
        "hamburger": 295,
        "french fries": 312,
        "ice cream": 207,
        "chocolate": 546,
        "potato chips": 536
      };
      const foodName = foodItem.name.toLowerCase();
      for (const [key, calories] of Object.entries(commonFoods)) {
        if (foodName.includes(key)) {
          return calories;
        }
      }
      const proteinCalories = typeof foodItem.protein_g === "number" ? foodItem.protein_g * 4 : 0;
      const carbCalories = typeof foodItem.carbohydrates_total_g === "number" ? foodItem.carbohydrates_total_g * 4 : 0;
      const fatCalories = typeof foodItem.fat_total_g === "number" ? foodItem.fat_total_g * 9 : 0;
      const totalCalories = proteinCalories + carbCalories + fatCalories;
      if (isNaN(totalCalories) || totalCalories === 0) {
        return 100;
      }
      return Math.round(totalCalories);
    } catch (error) {
      console.error("Error calculating estimated calories:", error);
      return 100;
    }
  }
  ;
  app2.use("/api", apiRouter);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
