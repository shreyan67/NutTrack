import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MealCard } from "@/components/MealCard";
import { AddFoodModal } from "@/components/AddFoodModal";
import { useCalorieData } from "@/hooks/useCalorieData";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DailyEntry, MealType, FoodItem } from "@shared/schema";

export function DailyView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>("breakfast");
  
  const { getDailyEntry, addFoodItem, removeFoodItem } = useCalorieData();
  const { data: dailyEntry, isLoading } = getDailyEntry(currentDate);
  
  const handlePreviousDay = () => {
    setCurrentDate(prev => subDays(prev, 1));
  };
  
  const handleNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1));
  };
  
  const handleAddFoodClick = (mealType: MealType) => {
    setActiveMealType(mealType);
    setIsModalOpen(true);
  };
  
  const handleAddFoodItem = (foodItem: { name: string; amount: string; calories: number; notes?: string }) => {
    addFoodItem.mutate({
      date: currentDate,
      mealType: activeMealType,
      foodItem: {
        name: foodItem.name,
        amount: foodItem.amount,
        calories: foodItem.calories,
        notes: foodItem.notes || ""
      }
    });
    setIsModalOpen(false);
  };
  
  const handleRemoveFoodItem = (mealType: MealType, foodId: number) => {
    removeFoodItem.mutate({
      date: currentDate,
      mealType,
      foodId
    });
  };
  
  // Default empty entry for when there's no data yet
  const defaultEntry: DailyEntry = {
    date: format(currentDate, 'yyyy-MM-dd'),
    target: 2500,
    breakfast: { items: [] },
    lunch: { items: [] },
    snacks: { items: [] },
    dinner: { items: [] },
    others: { items: [] }
  };
  
  // Use the fetched data or default if not available
  const entry = dailyEntry || defaultEntry;
  
  // Safe function to get meal items with fallbacks for undefined values
  const getMealItems = (entry: DailyEntry, mealType: MealType): FoodItem[] => {
    if (!entry || !entry[mealType] || !entry[mealType].items) {
      return [];
    }
    return entry[mealType].items;
  };
  
  // Calculate daily total calories
  const calculateTotal = (): number => {
    if (!entry) return 0;
    
    return ["breakfast", "lunch", "snacks", "dinner", "others"].reduce((total, meal) => {
      const mealType = meal as MealType;
      const mealItems = getMealItems(entry, mealType);
      return total + mealItems.reduce((mealTotal, item) => mealTotal + (item.calories || 0), 0);
    }, 0);
  };
  
  const dailyTotal = calculateTotal();
  const targetCalories = entry.target;
  const percentageOfTarget = Math.min((dailyTotal / targetCalories) * 100, 100);
  
  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <button 
          className="p-2 rounded-full hover:bg-gray-100"
          onClick={handlePreviousDay}
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h1>
        <button 
          className="p-2 rounded-full hover:bg-gray-100"
          onClick={handleNextDay}
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
      
      {/* Daily Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Daily Summary</h2>
            <span className="bg-primary bg-opacity-10 text-primary py-1 px-3 rounded-full text-sm font-medium">
              {dailyTotal.toLocaleString()} calories
            </span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${percentageOfTarget}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>0</span>
              <span>Target: {targetCalories.toLocaleString()} cal</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Meal inputs */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <MealCard
            title="Breakfast"
            mealType="breakfast"
            items={getMealItems(entry, "breakfast")}
            onAddClick={() => handleAddFoodClick("breakfast")}
            onRemoveItem={(id) => handleRemoveFoodItem("breakfast", id)}
          />
          <MealCard
            title="Lunch"
            mealType="lunch"
            items={getMealItems(entry, "lunch")}
            onAddClick={() => handleAddFoodClick("lunch")}
            onRemoveItem={(id) => handleRemoveFoodItem("lunch", id)}
          />
          <MealCard
            title="Snacks"
            mealType="snacks"
            items={getMealItems(entry, "snacks")}
            onAddClick={() => handleAddFoodClick("snacks")}
            onRemoveItem={(id) => handleRemoveFoodItem("snacks", id)}
          />
          <MealCard
            title="Dinner"
            mealType="dinner"
            items={getMealItems(entry, "dinner")}
            onAddClick={() => handleAddFoodClick("dinner")}
            onRemoveItem={(id) => handleRemoveFoodItem("dinner", id)}
          />
          <MealCard
            title="Others"
            mealType="others"
            items={getMealItems(entry, "others")}
            onAddClick={() => handleAddFoodClick("others")}
            onRemoveItem={(id) => handleRemoveFoodItem("others", id)}
          />
        </div>
      )}
      
      {/* Add Food Modal */}
      <AddFoodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddFoodItem}
        mealType={activeMealType}
      />
    </div>
  );
}
