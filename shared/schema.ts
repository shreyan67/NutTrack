import { pgTable, text, serial, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define meal types
export const mealTypes = ["breakfast", "lunch", "snacks", "dinner", "others"] as const;
export type MealType = typeof mealTypes[number];

// Food item schema
export const foodItems = pgTable("food_items", {
  id: serial("id").primaryKey(),
  entryDate: text("entry_date").notNull(),
  mealType: text("meal_type").notNull(),
  name: text("name").notNull(),
  amount: text("amount").notNull(),
  calories: integer("calories").notNull(),
  notes: text("notes").default("")
});

// Food item schema for validation
export const foodItemSchema = z.object({
  name: z.string().min(1, "Food name is required"),
  amount: z.string().min(1, "Amount is required"),
  calories: z.number().min(1, "Calories must be greater than 0"),
  notes: z.string().optional().default("")
});

// Daily entry schema for validation
export const dailyEntrySchema = z.object({
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

// Type definitions
export type FoodItem = z.infer<typeof foodItemSchema> & { id: number };
export type Meal = { items: FoodItem[] };
export type DailyEntry = z.infer<typeof dailyEntrySchema>;

// Export insert schemas for database operations
export const insertFoodItemSchema = createInsertSchema(foodItems).omit({ id: true });
export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
