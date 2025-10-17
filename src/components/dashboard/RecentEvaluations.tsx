import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight } from "lucide-react";

export const RecentEvaluations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchEvaluations = async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setEvaluations(data);
    };

    fetchEvaluations();
  }, [user]);

  const getScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="secondary">N/A</Badge>;
    const percentage = score * 100;
    if (percentage >= 80) return <Badge className="bg-accent">{percentage.toFixed(0)}%</Badge>;
    if (percentage >= 60) return <Badge className="bg-warning text-black">{percentage.toFixed(0)}%</Badge>;
    return <Badge variant="destructive">{percentage.toFixed(0)}%</Badge>;
  };

  return (
    <Card className="border-border/50 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Evaluations</CardTitle>
          <CardDescription>Latest evaluation results from your AI agent</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/evaluations")}>
          View All
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Interaction ID</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>PII Redactions</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluations.map((evaluation) => (
              <TableRow
                key={evaluation.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/evaluations/${evaluation.id}`)}
              >
                <TableCell className="font-mono text-sm">
                  {evaluation.interaction_id.substring(0, 8)}...
                </TableCell>
                <TableCell>{getScoreBadge(evaluation.score)}</TableCell>
                <TableCell>{evaluation.latency_ms}ms</TableCell>
                <TableCell>{evaluation.pii_tokens_redacted || 0}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(evaluation.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
