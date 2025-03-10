import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { MealType } from "@shared/schema";
import { useDebounce } from "../hooks/use-debounce";

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (foodItem: { name: string; amount: string; calories: number; notes?: string }) => void;
  mealType: MealType;
}

const formSchema = z.object({
  name: z.string().min(1, "Food name is required"),
  amount: z.string().min(1, "Amount is required"),
  calories: z.coerce.number().min(1, "Calories must be greater than 0"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddFoodModal({ isOpen, onClose, onAdd, mealType }: AddFoodModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: "",
      calories: undefined,
      notes: "",
    },
  });
  
  const foodName = form.watch("name");
  const amount = form.watch("amount");
  
  // Debounce the input values to prevent too many API calls
  const debouncedFoodName = useDebounce(foodName, 500);
  const debouncedAmount = useDebounce(amount, 500);
  
  // Fetch nutrition data when food name or amount changes
  useEffect(() => {
    async function fetchNutritionData() {
      if (!debouncedFoodName || !debouncedAmount) return;
      
      // Don't fetch if food name is too short (less than 3 characters)
      if (debouncedFoodName.length < 3) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/nutrition/search?query=${encodeURIComponent(debouncedFoodName)}&amount=${encodeURIComponent(debouncedAmount)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch nutrition data');
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const nutritionData = data[0];
          
          if (typeof nutritionData.calories === 'number' && !isNaN(nutritionData.calories)) {
            // Valid calorie data found
            form.setValue("calories", Math.round(nutritionData.calories));
            
            // Generate nutrition summary including macros if available
            let nutritionSummary = `${Math.round(nutritionData.calories)} calories`;
            
            if (nutritionData.protein_g && nutritionData.carbohydrates_total_g && nutritionData.fat_total_g) {
              nutritionSummary += ` | Protein: ${nutritionData.protein_g}g | Carbs: ${nutritionData.carbohydrates_total_g}g | Fat: ${nutritionData.fat_total_g}g`;
            }
            
            // Handle different data sources
            if (nutritionData.calorieSource === 'edamam') {
              const confidenceText = nutritionData.confidence === 'high' 
                ? "High confidence" 
                : "Best available match";
                
              form.setValue("notes", `${nutritionData.name} (${nutritionData.servingSize}): ${nutritionSummary} - ${confidenceText} from Edamam`);
              
              toast({
                title: "Nutritional Data Found",
                description: `${confidenceText} from Edamam nutrition database`,
                variant: "default",
              });
            } else if (nutritionData.calorieSource === 'reliable_database') {
              form.setValue("notes", `${nutritionData.name}: ${nutritionSummary} - From reliable database`);
              
              toast({
                title: "Using Reliable Database",
                description: "Values from our curated nutrition database for common foods",
                variant: "default",
              });
            } else if (nutritionData.calorieSource === 'estimated') {
              form.setValue("notes", `${nutritionData.name}: ${nutritionSummary} - Estimated values`);
              
              toast({
                title: "Estimated Calories",
                description: "Values calculated based on available macronutrients",
                variant: "default",
              });
            }
          } else {
            toast({
              title: "No Calorie Data",
              description: "Couldn't determine calories for this food. Please enter manually.",
              variant: "default",
            });
          }
        } else {
          toast({
            title: "Food Not Found",
            description: "Try a different food name or format (e.g., 'apple' instead of 'red apple')",
            variant: "default",
          });
        }
      } catch (error) {
        console.error('Error fetching nutrition data:', error);
        toast({
          title: "Error",
          description: "Could not fetch nutrition data automatically",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchNutritionData();
  }, [debouncedFoodName, debouncedAmount, form, toast]);
  
  const onSubmit = (values: FormValues) => {
    onAdd(values);
    form.reset();
  };
  
  // Reset form when modal closes
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      onClose();
      form.reset();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Food Item</DialogTitle>
          <DialogDescription>
            Add details about the food you consumed. Enter the food name and amount to automatically fetch calorie information.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Food Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Grilled Chicken Breast" {...field} />
                  </FormControl>
                  <FormDescription>Enter a specific food name to get accurate calorie information</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 1 cup" {...field} />
                    </FormControl>
                    <FormDescription>Include the amount (e.g. "1 cup", "100g", "2 slices")</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="calories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="e.g. 250"
                          {...field}
                          value={field.value || ''}
                          className={isLoading ? "pr-8" : ""}
                        />
                        {isLoading && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    {isLoading && (
                      <p className="text-sm text-muted-foreground">
                        Fetching calorie information...
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
