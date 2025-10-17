import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

const Evaluations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchEvaluations = async () => {
      setLoading(true);
      let query = supabase
        .from("evaluations")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.ilike("interaction_id", `%${search}%`);
      }

      const { data, count } = await query;

      if (data) setEvaluations(data);
      if (count !== null) setTotal(count);
      setLoading(false);
    };

    fetchEvaluations();
  }, [user, page, search]);

  const getScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="secondary">N/A</Badge>;
    const percentage = score * 100;
    if (percentage >= 80) return <Badge className="bg-accent">{percentage.toFixed(0)}%</Badge>;
    if (percentage >= 60) return <Badge className="bg-warning text-black">{percentage.toFixed(0)}%</Badge>;
    return <Badge variant="destructive">{percentage.toFixed(0)}%</Badge>;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
        <p className="text-muted-foreground">Browse and filter all evaluation results</p>
      </div>

      <Card className="border-border/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Evaluations</CardTitle>
              <CardDescription>{total} total evaluations</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by interaction ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interaction ID</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>PII Redactions</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : evaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No evaluations found
                  </TableCell>
                </TableRow>
              ) : (
                evaluations.map((evaluation) => (
                  <TableRow
                    key={evaluation.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/evaluations/${evaluation.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{evaluation.interaction_id}</TableCell>
                    <TableCell>{getScoreBadge(evaluation.score)}</TableCell>
                    <TableCell>{evaluation.latency_ms}ms</TableCell>
                    <TableCell>
                      {evaluation.flags?.length > 0 ? (
                        <div className="flex gap-1">
                          {evaluation.flags.map((flag: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{evaluation.pii_tokens_redacted || 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(evaluation.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Evaluations;
