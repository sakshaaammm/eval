import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    run_policy: "always",
    sample_rate_pct: 100,
    obfuscate_pii: false,
    max_eval_per_day: 10000,
  });

  useEffect(() => {
    if (!user) return;

    const fetchConfig = async () => {
      const { data } = await supabase
        .from("eval_configs")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setConfig({
          run_policy: data.run_policy,
          sample_rate_pct: data.sample_rate_pct,
          obfuscate_pii: data.obfuscate_pii,
          max_eval_per_day: data.max_eval_per_day,
        });
      }
      setLoading(false);
    };

    fetchConfig();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("eval_configs")
      .update(config)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved successfully");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your evaluation policies and preferences</p>
      </div>

      <Card className="border-border/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Evaluation Configuration</CardTitle>
          <CardDescription>Customize how your AI agent evaluations are processed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="run-policy">Run Policy</Label>
            <Select
              value={config.run_policy}
              onValueChange={(value) => setConfig({ ...config, run_policy: value })}
            >
              <SelectTrigger id="run-policy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always Run</SelectItem>
                <SelectItem value="sampled">Sampled</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose whether to run evaluations on all requests or sample them
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample-rate">Sample Rate (%)</Label>
            <Input
              id="sample-rate"
              type="number"
              min="0"
              max="100"
              value={config.sample_rate_pct}
              onChange={(e) => setConfig({ ...config, sample_rate_pct: parseInt(e.target.value) })}
              disabled={config.run_policy === "always"}
            />
            <p className="text-sm text-muted-foreground">
              Percentage of requests to evaluate when using sampled policy
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="obfuscate-pii">Obfuscate PII</Label>
              <p className="text-sm text-muted-foreground">
                Mask personally identifiable information in evaluation results
              </p>
            </div>
            <Switch
              id="obfuscate-pii"
              checked={config.obfuscate_pii}
              onCheckedChange={(checked) => setConfig({ ...config, obfuscate_pii: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-eval">Max Evaluations Per Day</Label>
            <Input
              id="max-eval"
              type="number"
              min="1"
              value={config.max_eval_per_day}
              onChange={(e) => setConfig({ ...config, max_eval_per_day: parseInt(e.target.value) })}
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of evaluations allowed per day
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
