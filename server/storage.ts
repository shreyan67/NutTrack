import { 
  type DailyEntry, 
  type FoodItem, 
  type MealType,
  mealTypes
} from "@shared/schema";

export interface IStorage {
  getDailyEntry(date: string): Promise<DailyEntry | undefined>;
  getAllEntries(): Promise<DailyEntry[]>;
  addFoodItem(date: string, mealType: MealType, foodItem: Omit<FoodItem, "id">): Promise<DailyEntry>;
  removeFoodItem(date: string, mealType: MealType, foodId: number): Promise<DailyEntry>;
  getDailyTarget(): Promise<number>;
  setDailyTarget(target: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private entries: Map<string, DailyEntry>;
  private currentFoodId: number;
  private dailyTarget: number;
  
  constructor() {
    this.entries = new Map();
    this.currentFoodId = 1;
    this.dailyTarget = 2500; // Default target calories
  }
  
  async getDailyEntry(date: string): Promise<DailyEntry | undefined> {
    return this.entries.get(date);
  }
  
  async getAllEntries(): Promise<DailyEntry[]> {
    return Array.from(this.entries.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  
  async addFoodItem(date: string, mealType: MealType, foodItem: Omit<FoodItem, "id">): Promise<DailyEntry> {
    // Get or create the daily entry
    let entry = this.entries.get(date);
    
    if (!entry) {
      entry = {
        date,
        target: this.dailyTarget,
        breakfast: { items: [] },
        lunch: { items: [] },
        snacks: { items: [] },
        dinner: { items: [] },
        others: { items: [] }
      };
    }
    
    // Add the food item with a new ID
    const newFoodItem: FoodItem = {
      ...foodItem,
      id: this.currentFoodId++
    };
    
    // Make sure the meal type property exists
    if (!entry[mealType]) {
      entry[mealType] = { items: [] };
    }
    
    entry[mealType].items.push(newFoodItem);
    
    // Update the entry in the storage
    this.entries.set(date, entry);
    
    return entry;
  }
  
  async removeFoodItem(date: string, mealType: MealType, foodId: number): Promise<DailyEntry> {
    const entry = this.entries.get(date);
    
    if (!entry) {
      throw new Error(`No entry found for date: ${date}`);
    }
    
    if (!entry[mealType]) {
      throw new Error(`No ${mealType} meal found for date: ${date}`);
    }
    
    // Remove the food item by ID
    entry[mealType].items = entry[mealType].items.filter(item => item.id !== foodId);
    
    // Update the entry in the storage
    this.entries.set(date, entry);
    
    return entry;
  }
  
  async getDailyTarget(): Promise<number> {
    return this.dailyTarget;
  }
  
  async setDailyTarget(target: number): Promise<void> {
    this.dailyTarget = target;
    
    // Update all entries with the new target
    for (const [date, entry] of this.entries.entries()) {
      entry.target = target;
      this.entries.set(date, entry);
    }
  }
}

export const storage = new MemStorage();
