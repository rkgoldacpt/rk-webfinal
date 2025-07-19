import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, ShopConfig } from "@/lib/db";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TrashIcon } from "lucide-react";

const SettingsPage = () => {
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load shop configuration
  useEffect(() => {
    const loadShopConfig = async () => {
      try {
        const config = await db.getShopConfig();
        if (config) {
          setShopConfig(config);
        } else {
          // Set default values if no configuration exists
          setShopConfig({
            id: 'shop',
            name: 'RK Jewellers',
            address: 'Main Road, Achampet, Telangana',
            mobile: '9440370408, 9490324969',
            updatedAt: Date.now()
          });
        }
      } catch (error) {
        console.error("Error loading shop configuration:", error);
        toast.error("Failed to load shop details");
      }
    };
    
    loadShopConfig();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopConfig) return;
    
    try {
      setIsSubmitting(true);
      
      await db.updateShopConfig({
        name: shopConfig.name,
        address: shopConfig.address,
        mobile: shopConfig.mobile,
        gstin: shopConfig.gstin
      });
      
      toast.success("Shop details updated successfully");
    } catch (error) {
      console.error("Error updating shop configuration:", error);
      toast.error("Failed to update shop details");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetData = async () => {
    try {
      // Delete the database
      await window.indexedDB.deleteDatabase('RKJewellersDB');
      
      // Show success message
      toast.success("All data has been reset successfully");
      
      // Reload the page after a short delay to reinitialize the database
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Failed to reset data");
    }
  };
  
  if (!shopConfig) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your shop details</p>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">Shop Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Shop Name</Label>
                  <Input
                    id="name"
                    value={shopConfig.name}
                    onChange={(e) => setShopConfig({ ...shopConfig, name: e.target.value })}
                    placeholder="Enter shop name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Shop Address</Label>
                  <Input
                    id="address"
                    value={shopConfig.address}
                    onChange={(e) => setShopConfig({ ...shopConfig, address: e.target.value })}
                    placeholder="Enter shop address"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile">Contact Number</Label>
                  <Input
                    id="mobile"
                    value={shopConfig.mobile}
                    onChange={(e) => setShopConfig({ ...shopConfig, mobile: e.target.value })}
                    placeholder="Enter contact numbers"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN (Optional)</Label>
                  <Input
                    id="gstin"
                    value={shopConfig.gstin || ''}
                    onChange={(e) => setShopConfig({ ...shopConfig, gstin: e.target.value })}
                    placeholder="Enter GSTIN"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gold-500 hover:bg-gold-600 text-black"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  These actions are irreversible. Please be certain before proceeding.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Reset All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all your data including:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>All customer records</li>
                          <li>All invoices and billing history</li>
                          <li>Shop configuration</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetData}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Yes, Reset Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage; 