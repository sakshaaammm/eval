import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const LatencyChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split("T")[0];
      });

      const chartData = await Promise.all(
        last7Days.map(async (day) => {
          const nextDay = new Date(day);
          nextDay.setDate(nextDay.getDate() + 1);

          const { data } = await supabase
            .from("evaluations")
            .select("latency_ms")
            .gte("created_at", day)
            .lt("created_at", nextDay.toISOString().split("T")[0]);

          const avgLatency = data?.length
            ? data.reduce((sum, e) => sum + e.latency_ms, 0) / data.length
            : 0;

          return {
            date: new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            latency: Math.round(avgLatency),
          };
        })
      );

      setData(chartData);
    };

    fetchData();
  }, [user]);

  return (
    <Card className="border-border/50 backdrop-blur">
      <CardHeader>
        <CardTitle>Latency Trend</CardTitle>
        <CardDescription>Average response latency over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Bar dataKey="latency" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
