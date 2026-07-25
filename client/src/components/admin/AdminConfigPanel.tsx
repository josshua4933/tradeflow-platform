import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

interface SystemConfig {
  minDepositAmount: string;
  maxDepositAmount: string;
  minWithdrawalAmount: string;
  maxWithdrawalAmount: string;
  referralBonusPercentage: string;
  tradingCommissionPercentage: string;
  maintenanceMode: boolean;
  maxLeverage: string;
}

const DEFAULT_CONFIG: SystemConfig = {
  minDepositAmount: "10",
  maxDepositAmount: "100000",
  minWithdrawalAmount: "50",
  maxWithdrawalAmount: "50000",
  referralBonusPercentage: "5",
  tradingCommissionPercentage: "0.1",
  maintenanceMode: false,
  maxLeverage: "100",
};

export default function AdminConfigPanel() {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1000));
      localStorage.setItem("systemConfig", JSON.stringify(config));
      toast.success("System configuration updated successfully");
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: keyof SystemConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Platform Configuration</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deposit Settings */}
        <Card className="p-4 space-y-4">
          <h4 className="font-semibold text-sm">Deposit Limits (USD)</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Minimum Deposit</label>
            <Input
              type="number"
              value={config.minDepositAmount}
              onChange={(e) => handleChange("minDepositAmount", e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Maximum Deposit</label>
            <Input
              type="number"
              value={config.maxDepositAmount}
              onChange={(e) => handleChange("maxDepositAmount", e.target.value)}
              className="text-sm"
            />
          </div>
        </Card>

        {/* Withdrawal Settings */}
        <Card className="p-4 space-y-4">
          <h4 className="font-semibold text-sm">Withdrawal Limits (USD)</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Minimum Withdrawal</label>
            <Input
              type="number"
              value={config.minWithdrawalAmount}
              onChange={(e) => handleChange("minWithdrawalAmount", e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Maximum Withdrawal</label>
            <Input
              type="number"
              value={config.maxWithdrawalAmount}
              onChange={(e) => handleChange("maxWithdrawalAmount", e.target.value)}
              className="text-sm"
            />
          </div>
        </Card>

        {/* Commission Settings */}
        <Card className="p-4 space-y-4">
          <h4 className="font-semibold text-sm">Commission & Rewards (%)</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Referral Bonus</label>
            <Input
              type="number"
              step="0.1"
              value={config.referralBonusPercentage}
              onChange={(e) => handleChange("referralBonusPercentage", e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Trading Commission</label>
            <Input
              type="number"
              step="0.01"
              value={config.tradingCommissionPercentage}
              onChange={(e) => handleChange("tradingCommissionPercentage", e.target.value)}
              className="text-sm"
            />
          </div>
        </Card>

        {/* Trading Settings */}
        <Card className="p-4 space-y-4">
          <h4 className="font-semibold text-sm">Trading Configuration</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Maximum Leverage</label>
            <Input
              type="number"
              value={config.maxLeverage}
              onChange={(e) => handleChange("maxLeverage", e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="maintenance"
              checked={config.maintenanceMode}
              onChange={(e) => handleChange("maintenanceMode", e.target.checked)}
              className="rounded"
            />
            <label htmlFor="maintenance" className="text-sm text-muted-foreground cursor-pointer">
              Enable Maintenance Mode
            </label>
          </div>
        </Card>
      </div>

      {/* Summary */}
      <Card className="p-4 bg-secondary/50 space-y-3">
        <h4 className="font-semibold text-sm">Configuration Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Deposit Range</span>
            <p className="font-mono">${config.minDepositAmount} - ${config.maxDepositAmount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Withdrawal Range</span>
            <p className="font-mono">${config.minWithdrawalAmount} - ${config.maxWithdrawalAmount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Referral Bonus</span>
            <p className="font-mono">{config.referralBonusPercentage}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Leverage</span>
            <p className="font-mono">1:{config.maxLeverage}</p>
          </div>
        </div>
      </Card>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full gap-2"
        size="lg"
      >
        <Save className="h-4 w-4" />
        {isSaving ? "Saving..." : "Save Configuration"}
      </Button>
    </div>
  );
}
