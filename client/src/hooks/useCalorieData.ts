import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { DailyEntry, FoodItem } from "@shared/schema";

export function useCalorieData() {
  const { toast } = useToast();
  
  // Get daily entry for a specific date
  const getDailyEntry = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    return useQuery({
      queryKey: ['/api/calories', dateString],
      queryFn: async () => {
        try {
          const response = await fetch(`/api/calories/${dateString}`);
          if (!response.ok) {
            toast({
              title: "Error loading data",
              description: "Failed to load calorie data for this date",
              variant: "destructive",
            });
            throw new Error('Failed to fetch daily entry');
          }
          return response.json();
        } catch (error) {
          console.error("Error fetching daily entry:", error);
          throw error;
        }
      },
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 5000 // 5 seconds
    });
  };
  
  // Get all daily entries
  const getAllEntries = () => {
    return useQuery({
      queryKey: ['/api/calories'],
      queryFn: async () => {
        try {
          const response = await fetch('/api/calories');
          if (!response.ok) {
            toast({
              title: "Error loading data",
              description: "Failed to load calorie history",
              variant: "destructive",
            });
            throw new Error('Failed to fetch all entries');
          }
          return response.json();
        } catch (error) {
          console.error("Error fetching all entries:", error);
          throw error;
        }
      },
      refetchOnWindowFocus: true,
      refetchOnMount: true
    });
  };
  
  // Add food item mutation
  const addFoodItem = useMutation({
    mutationFn: async ({ date, mealType, foodItem }: { 
      date: Date, 
      mealType: string, 
      foodItem: Omit<FoodItem, "id"> 
    }) => {
      const dateString = format(date, 'yyyy-MM-dd');
      const response = await apiRequest('POST', `/api/calories/${dateString}/${mealType}`, foodItem);
      return response.json();
    },
    onSuccess: (_, variables) => {
      const dateString = format(variables.date, 'yyyy-MM-dd');
      // Force immediate refetch
      queryClient.invalidateQueries({ queryKey: ['/api/calories', dateString] });
      queryClient.invalidateQueries({ queryKey: ['/api/calories'] });
      
      toast({
        title: "Food added",
        description: "Your food item has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error adding food",
        description: "Failed to add food item",
        variant: "destructive",
      });
    }
  });
  
  // Remove food item mutation
  const removeFoodItem = useMutation({
    mutationFn: async ({ date, mealType, foodId }: { 
      date: Date, 
      mealType: string, 
      foodId: number 
    }) => {
      const dateString = format(date, 'yyyy-MM-dd');
      const response = await apiRequest('DELETE', `/api/calories/${dateString}/${mealType}/${foodId}`, undefined);
      return response.json();
    },
    onSuccess: (_, variables) => {
      const dateString = format(variables.date, 'yyyy-MM-dd');
      // Force immediate refetch
      queryClient.invalidateQueries({ queryKey: ['/api/calories', dateString] });
      queryClient.invalidateQueries({ queryKey: ['/api/calories'] });
      
      toast({
        title: "Food removed",
        description: "Your food item has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error removing food",
        description: "Failed to remove food item",
        variant: "destructive",
      });
    }
  });
  
  // Update daily target mutation
  const updateDailyTarget = useMutation({
    mutationFn: async (target: number) => {
      return apiRequest('PUT', '/api/calories/target', { target });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calories'] });
      toast({
        title: "Target updated",
        description: "Your daily calorie target has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error updating target",
        description: "Failed to update daily calorie target",
        variant: "destructive",
      });
    }
  });
  
  return {
    getDailyEntry,
    getAllEntries,
    addFoodItem,
    removeFoodItem,
    updateDailyTarget
  };
}
