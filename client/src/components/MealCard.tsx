import { 
  Card, 
  CardHeader, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "lucide-react";
import type { FoodItem, MealType } from "@shared/schema";

interface MealCardProps {
  title: string;
  mealType: MealType;
  items: FoodItem[];
  onAddClick: () => void;
  onRemoveItem: (id: number) => void;
}

export function MealCard({ title, mealType, items, onAddClick, onRemoveItem }: MealCardProps) {
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
  
  return (
    <Card>
      <CardHeader className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-900">{title}</h3>
          <span className="text-gray-600 font-medium">{totalCalories} cal</span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {items.length === 0 ? (
          <p className="text-center text-sm text-gray-500 mb-4">No items added yet</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div 
                key={item.id}
                className={`flex items-center justify-between ${
                  index < items.length - 1 ? "pb-3 border-b border-gray-200" : ""
                }`}
              >
                <div>
                  <span className="block text-sm font-medium text-gray-700">{item.name}</span>
                  <span className="block text-xs text-gray-500">{item.amount}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 mr-3">{item.calories} cal</span>
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button 
          className="mt-4 w-full"
          onClick={onAddClick}
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Add Food
        </Button>
      </CardContent>
    </Card>
  );
}
