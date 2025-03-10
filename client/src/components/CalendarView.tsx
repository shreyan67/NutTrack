import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalorieData } from "@/hooks/useCalorieData";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DailyView } from "@/components/DailyView";
import type { DailyEntry } from "@shared/schema";

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { getAllEntries } = useCalorieData();
  const { data: allEntries, isLoading } = getAllEntries();
  
  // Create a map for quicker lookup of daily entries by date
  const entriesMap = new Map<string, DailyEntry>();
  if (allEntries) {
    allEntries.forEach((entry: DailyEntry) => {
      entriesMap.set(entry.date, entry);
    });
  }
  
  // Function to calculate total calories for a given date
  const getCaloriesForDate = (date: Date): number | null => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const entry = entriesMap.get(dateKey);
    
    if (!entry) return null;
    
    return ["breakfast", "lunch", "snacks", "dinner", "others"].reduce((total, meal) => {
      const mealType = meal as "breakfast" | "lunch" | "snacks" | "dinner" | "others";
      const mealItems = entry[mealType]?.items || [];
      return total + mealItems.reduce((mealTotal, item) => mealTotal + item.calories, 0);
    }, 0);
  };
  
  // Custom renderer for calendar days to show calories
  const renderDay = (day: Date) => {
    const calories = getCaloriesForDate(day);
    return (
      <div className="flex flex-col items-center">
        <span>{format(day, 'd')}</span>
        {calories !== null && (
          <span className="text-xs mt-1 text-primary">{calories} cal</span>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Calorie History</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            )}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedDate 
                ? `Daily Log - ${format(selectedDate, 'MMMM d, yyyy')}` 
                : 'Please select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="h-[350px] overflow-y-auto pr-2">
                <DailyView key={selectedDate.toString()} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[350px]">
                <p className="text-gray-500">Please select a date from the calendar to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
