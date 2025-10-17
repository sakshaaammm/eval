import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Zap, Shield, Clock } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { LatencyChart } from "@/components/dashboard/LatencyChart";
import { RecentEvaluations } from "@/components/dashboard/RecentEvaluations";

interface Stats {
  total: number;
  avgScore: number;
  avgLatency: number;
  successRate: number;
  totalPiiRedactions: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    avgScore: 0,
    avgLatency: 0,
    successRate: 0,
    totalPiiRedactions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (!error && data) {
        const total = data.length;
        const avgScore = data.reduce((sum, e) => sum + (e.score || 0), 0) / total || 0;
        const avgLatency = data.reduce((sum, e) => sum + e.latency_ms, 0) / total || 0;
        const successRate = (data.filter((e) => (e.score || 0) >= 0.7).length / total) * 100 || 0;
        const totalPiiRedactions = data.reduce((sum, e) => sum + (e.pii_tokens_redacted || 0), 0);

        setStats({ total, avgScore, avgLatency, successRate, totalPiiRedactions });
      }
      setLoading(false);
    };

    fetchStats();
  }, [user]);

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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your AI agent evaluations (Last 30 days)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Evaluations"
          value={stats.total.toLocaleString()}
          icon={Activity}
          trend="+12.3%"
        />
        <MetricCard
          title="Avg Score"
          value={(stats.avgScore * 100).toFixed(1) + "%"}
          icon={TrendingUp}
          trend="+5.2%"
          className="text-accent"
        />
        <MetricCard
          title="Avg Latency"
          value={Math.round(stats.avgLatency) + "ms"}
          icon={Zap}
          trend="-8.1%"
          className="text-info"
        />
        <MetricCard
          title="Success Rate"
          value={stats.successRate.toFixed(1) + "%"}
          icon={TrendingUp}
          trend="+2.4%"
          className="text-success"
        />
        <MetricCard
          title="PII Redactions"
          value={stats.totalPiiRedactions.toLocaleString()}
          icon={Shield}
          trend="+15.7%"
          className="text-warning"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TrendChart />
        <LatencyChart />
      </div>

      <RecentEvaluations />
    </div>
  );
};

export default Dashboard;
