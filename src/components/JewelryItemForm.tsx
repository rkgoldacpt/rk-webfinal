
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PlusIcon, TrashIcon, SparklesIcon } from "lucide-react";
import { calculateNetWeight, calculateItemAmount, formatCurrency } from "@/lib/utils";
import { JewelryItem } from "@/lib/db";
import { useIsMobile } from "@/hooks/use-mobile";

interface JewelryItemFormProps {
  items: JewelryItem[];
  onChange: (items: JewelryItem[]) => void;
}

export const JewelryItemForm: React.FC<JewelryItemFormProps> = ({ items, onChange }) => {
  const [currentItems, setCurrentItems] = useState<JewelryItem[]>(items);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    setCurrentItems(items);
  }, [items]);
  
  const handleAddItem = () => {
    const newItem: JewelryItem = {
      id: crypto.randomUUID(),
      name: '',
      grossWeight: 0,
      wastage: 0,
      goldRate: 0,
      labRate: 0
    };
    
    const updatedItems = [...currentItems, newItem];
    setCurrentItems(updatedItems);
    onChange(updatedItems);
  };
  
  const handleItemChange = (index: number, field: keyof JewelryItem, value: string | number) => {
    const updatedItems = [...currentItems];
    
    // Convert string values to numbers for numeric fields
    if (field === 'grossWeight' || field === 'wastage' || field === 'goldRate' || field === 'labRate') {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
    }
    
    // Calculate derived values
    const netWeight = calculateNetWeight(
      updatedItems[index].grossWeight, 
      updatedItems[index].wastage
    );
    
    const amount = calculateItemAmount(
      netWeight,
      updatedItems[index].goldRate,
      updatedItems[index].labRate
    );
    
    updatedItems[index].netWeight = netWeight;
    updatedItems[index].amount = amount;
    
    setCurrentItems(updatedItems);
    onChange(updatedItems);
  };
  
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...currentItems];
    updatedItems.splice(index, 1);
    setCurrentItems(updatedItems);
    onChange(updatedItems);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-serif font-semibold flex items-center">
          <SparklesIcon className="h-5 w-5 mr-2 text-gold-400 animate-shimmer" />
          Jewelry Items
        </h2>
        <Button 
          onClick={handleAddItem} 
          size="sm"
          className="bg-jewel-500 hover:bg-jewel-600 text-white jewel-shine"
        >
          <PlusIcon size={16} className="mr-1" />
          Add Item
        </Button>
      </div>
      
      {currentItems.length === 0 && (
        <Card className="p-6 text-center bg-muted/30 border border-dashed border-muted">
          <p className="text-muted-foreground">No items added yet. Click "Add Item" to begin.</p>
        </Card>
      )}
      
      {currentItems.map((item, index) => {
        const netWeight = calculateNetWeight(item.grossWeight, item.wastage);
        const amount = calculateItemAmount(netWeight, item.goldRate, item.labRate);
        
        return (
          <Card 
            key={item.id} 
            className="p-4 border-gold-100 hover:border-gold-300 transition-all card-shadow"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium flex items-center">
                <div className="w-6 h-6 rounded-full bg-gold-500 text-black flex items-center justify-center text-sm mr-2">
                  {index + 1}
                </div>
                Item #{index + 1}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleRemoveItem(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <TrashIcon size={16} />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor={`item-name-${index}`}>Item Name</Label>
                <Input
                  id={`item-name-${index}`}
                  value={item.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  placeholder="E.g., Gold Ring, Necklace, etc."
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`gross-weight-${index}`}>Gross Weight (g)</Label>
                  <Input
                    id={`gross-weight-${index}`}
                    type="number"
                    step="0.001"
                    value={item.grossWeight || ''}
                    onChange={(e) => handleItemChange(index, 'grossWeight', e.target.value)}
                    placeholder="0.000"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`wastage-${index}`}>Wastage (%)</Label>
                  <Input
                    id={`wastage-${index}`}
                    type="number"
                    step="0.01"
                    value={item.wastage || ''}
                    onChange={(e) => handleItemChange(index, 'wastage', e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`gold-rate-${index}`}>Gold Rate (₹/g)</Label>
                  <Input
                    id={`gold-rate-${index}`}
                    type="number"
                    step="0.01"
                    value={item.goldRate || ''}
                    onChange={(e) => handleItemChange(index, 'goldRate', e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`lab-rate-${index}`}>Lab Rate (₹)</Label>
                  <Input
                    id={`lab-rate-${index}`}
                    type="number"
                    step="0.01"
                    value={item.labRate || ''}
                    onChange={(e) => handleItemChange(index, 'labRate', e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label>Net Weight (g)</Label>
                  <p className="p-2 border rounded-md bg-muted/20 text-muted-foreground">
                    {netWeight.toFixed(3)}
                  </p>
                </div>
                
                <div>
                  <Label>Amount</Label>
                  <p className="p-2 border rounded-md bg-gradient-to-r from-gold-50 to-gold-100 text-gold-800 font-medium">
                    {formatCurrency(amount)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
