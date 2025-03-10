import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCalorieData } from "@/hooks/useCalorieData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { DailyEntry } from "@shared/schema";

export function ReportsView() {
  const { toast } = useToast();
  const [targetCalories, setTargetCalories] = useState<string>("");
  const { getAllEntries, updateDailyTarget } = useCalorieData();
  const { data: allEntries, isLoading } = getAllEntries();
  
  // Handle target calories update
  const handleUpdateTarget = () => {
    const calorieTarget = parseInt(targetCalories);
    if (isNaN(calorieTarget) || calorieTarget <= 0) {
      toast({
        title: "Invalid target",
        description: "Please enter a valid number greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    updateDailyTarget.mutate(calorieTarget);
    setTargetCalories("");
  };
  
  // Create a map for quicker lookup of daily entries by date
  const entriesMap = useMemo(() => {
    const map = new Map<string, DailyEntry>();
    if (allEntries) {
      allEntries.forEach((entry: DailyEntry) => {
        map.set(entry.date, entry);
      });
    }
    return map;
  }, [allEntries]);
  
  // Function to calculate total calories for a given date
  const getCaloriesForDate = (date: Date): number => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const entry = entriesMap.get(dateKey);
    
    if (!entry) return 0;
    
    return ["breakfast", "lunch", "snacks", "dinner", "others"].reduce((total, meal) => {
      const mealType = meal as "breakfast" | "lunch" | "snacks" | "dinner" | "others";
      const mealItems = entry[mealType]?.items || [];
      return total + mealItems.reduce((mealTotal, item) => mealTotal + item.calories, 0);
    }, 0);
  };
  
  // Prepare data for weekly report
  const weeklyData = useMemo(() => {
    if (!allEntries) return [];
    
    const endDate = new Date();
    const startDate = startOfWeek(endDate);
    
    return eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
      return {
        date: format(date, 'EEE'),
        calories: getCaloriesForDate(date),
        target: allEntries[0]?.target || 2500 // Assuming target is consistent
      };
    });
  }, [allEntries, entriesMap]);
  
  // Prepare data for monthly report
  const monthlyData = useMemo(() => {
    if (!allEntries) return [];
    
    const endDate = new Date();
    const startDate = startOfMonth(endDate);
    
    return eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
      return {
        date: format(date, 'dd'),
        calories: getCaloriesForDate(date),
        target: allEntries[0]?.target || 2500 // Assuming target is consistent
      };
    });
  }, [allEntries, entriesMap]);
  
  // Prepare meal breakdown data
  const mealBreakdownData = useMemo(() => {
    if (!allEntries) return [];
    
    // Get data for the last 7 days
    const endDate = new Date();
    const startDate = subDays(endDate, 6);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Calculate averages for each meal type
    let breakfastTotal = 0;
    let lunchTotal = 0;
    let snacksTotal = 0;
    let dinnerTotal = 0;
    let othersTotal = 0;
    let daysWithData = 0;
    
    days.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const entry = entriesMap.get(dateKey);
      
      if (entry) {
        breakfastTotal += entry.breakfast?.items.reduce((sum, item) => sum + item.calories, 0) || 0;
        lunchTotal += entry.lunch?.items.reduce((sum, item) => sum + item.calories, 0) || 0;
        snacksTotal += entry.snacks?.items.reduce((sum, item) => sum + item.calories, 0) || 0;
        dinnerTotal += entry.dinner?.items.reduce((sum, item) => sum + item.calories, 0) || 0;
        othersTotal += entry.others?.items.reduce((sum, item) => sum + item.calories, 0) || 0;
        daysWithData++;
      }
    });
    
    if (daysWithData === 0) return [];
    
    return [
      { name: 'Breakfast', calories: Math.round(breakfastTotal / daysWithData) },
      { name: 'Lunch', calories: Math.round(lunchTotal / daysWithData) },
      { name: 'Snacks', calories: Math.round(snacksTotal / daysWithData) },
      { name: 'Dinner', calories: Math.round(dinnerTotal / daysWithData) },
      { name: 'Others', calories: Math.round(othersTotal / daysWithData) }
    ];
  }, [allEntries, entriesMap]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">Calorie Reports</h1>
        
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Set daily target"
            value={targetCalories}
            onChange={(e) => setTargetCalories(e.target.value)}
            className="w-40"
          />
          <Button onClick={handleUpdateTarget} disabled={updateDailyTarget.isPending}>
            Update
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Calorie Intake</CardTitle>
              <CardDescription>
                Your calorie consumption over the current week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={weeklyData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calories" name="Calories" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="target" name="Target" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Calorie Intake</CardTitle>
              <CardDescription>
                Your calorie consumption over the current month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={monthlyData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calories" name="Calories" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="target" name="Target" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Meal Type Breakdown</CardTitle>
              <CardDescription>
                Average calories by meal type over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={mealBreakdownData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calories" name="Avg. Calories" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
