import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Zap, Shield, Tag } from "lucide-react";

const EvaluationDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const fetchData = async () => {
      const [{ data: evalData }, { data: configData }] = await Promise.all([
        supabase.from("evaluations").select("*").eq("id", id).single(),
        supabase.from("eval_configs").select("*").eq("user_id", user.id).single(),
      ]);

      if (evalData) setEvaluation(evalData);
      if (configData) setConfig(configData);
      setLoading(false);
    };

    fetchData();
  }, [user, id]);

  const maskPII = (text: string) => {
    if (!config?.obfuscate_pii) return text;
    return text.replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,}\b/g, "[EMAIL_REDACTED]")
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE_REDACTED]")
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Evaluation not found</p>
      </div>
    );
  }

  const getScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="secondary">N/A</Badge>;
    const percentage = score * 100;
    if (percentage >= 80) return <Badge className="bg-accent text-lg px-3 py-1">{percentage.toFixed(0)}%</Badge>;
    if (percentage >= 60) return <Badge className="bg-warning text-black text-lg px-3 py-1">{percentage.toFixed(0)}%</Badge>;
    return <Badge variant="destructive" className="text-lg px-3 py-1">{percentage.toFixed(0)}%</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/evaluations")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluation Detail</h1>
          <p className="text-muted-foreground font-mono">{evaluation.interaction_id}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score</CardTitle>
          </CardHeader>
          <CardContent>
            {getScoreBadge(evaluation.score)}
          </CardContent>
        </Card>

        <Card className="border-border/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evaluation.latency_ms}ms</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PII Redactions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evaluation.pii_tokens_redacted || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">{new Date(evaluation.created_at).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {evaluation.flags && evaluation.flags.length > 0 && (
        <Card className="border-border/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {evaluation.flags.map((flag: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-sm">
                  {flag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
          {config?.obfuscate_pii && (
            <CardDescription className="text-warning">
              <Shield className="inline h-4 w-4 mr-1" />
              PII masking is enabled
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
            {maskPII(evaluation.prompt)}
          </pre>
        </CardContent>
      </Card>

      <Card className="border-border/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Response</CardTitle>
          {config?.obfuscate_pii && (
            <CardDescription className="text-warning">
              <Shield className="inline h-4 w-4 mr-1" />
              PII masking is enabled
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
            {maskPII(evaluation.response)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default EvaluationDetail;
