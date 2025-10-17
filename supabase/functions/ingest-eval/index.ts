import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvalPayload {
  interaction_id: string;
  prompt: string;
  response: string;
  score?: number;
  latency_ms: number;
  flags?: string[];
  pii_tokens_redacted?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's eval config
    const { data: config } = await supabaseClient
      .from("eval_configs")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ error: "No evaluation config found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we should process this evaluation
    if (config.run_policy === "sampled") {
      const shouldProcess = Math.random() * 100 < config.sample_rate_pct;
      if (!shouldProcess) {
        console.log("Evaluation skipped due to sampling");
        return new Response(
          JSON.stringify({ message: "Evaluation skipped due to sampling" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count } = await supabaseClient
      .from("evaluations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString());

    if (count !== null && count >= config.max_eval_per_day) {
      return new Response(
        JSON.stringify({ error: "Daily evaluation limit reached" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: EvalPayload = await req.json();

    // Insert evaluation
    const { data: evaluation, error: insertError } = await supabaseClient
      .from("evaluations")
      .insert({
        user_id: user.id,
        interaction_id: payload.interaction_id,
        prompt: payload.prompt,
        response: payload.response,
        score: payload.score,
        latency_ms: payload.latency_ms,
        flags: payload.flags || [],
        pii_tokens_redacted: payload.pii_tokens_redacted || 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting evaluation:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Evaluation ingested successfully:", evaluation.id);

    return new Response(
      JSON.stringify({ success: true, evaluation }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
