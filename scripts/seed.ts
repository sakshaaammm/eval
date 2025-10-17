/*
  Seed script for generating sample data locally or in a hosted project.
  Usage:
    - Ensure env vars SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
    - Run: npm run seed
*/

import { createClient, SupabaseClient } from '@supabase/supabase-js';

type InsertableEvaluation = {
  user_id: string;
  interaction_id: string;
  prompt: string;
  response: string;
  score: number | null;
  latency_ms: number;
  flags: string[];
  pii_tokens_redacted: number;
  created_at: string;
};

async function getFirstUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw error;
  return data.users.length ? data.users[0].id : null;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeInteractionId(): string {
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  return `int_${rand}`;
}

function randomDateWithin(days: number): Date {
  const now = Date.now();
  const delta = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(now - delta);
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL as string;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const userId = await getFirstUserId(supabase);
  if (!userId) {
    console.log('No users found. Create a user first (sign up) and re-run.');
    process.exit(0);
  }

  const prompts = [
    'What are the main benefits of using AI in customer service? Provide details.',
    'Summarize the latest trends in LLM evaluation best practices.',
    'Explain how to design safe agents that avoid prompt injection.',
  ];

  const responses = [
    'AI provides 24/7 support, cost efficiency, consistency, and scalable triage.',
    'Key trends include realistic datasets, latency-weighted scores, and safety checks.',
    'Defense-in-depth: input validation, output filters, and strict tool permissions.',
  ];

  const flagsPool = [[], ['high-confidence'], ['needs-review']];

  const rows: InsertableEvaluation[] = Array.from({ length: 50 }).map(() => {
    const createdAt = randomDateWithin(30).toISOString();
    return {
      user_id: userId,
      interaction_id: makeInteractionId(),
      prompt: randomChoice(prompts),
      response: randomChoice(responses),
      score: Math.round((0.5 + Math.random() * 0.5) * 100) / 100,
      latency_ms: 50 + Math.floor(Math.random() * 450),
      flags: randomChoice(flagsPool),
      pii_tokens_redacted: Math.floor(Math.random() * 5),
      created_at: createdAt,
    };
  });

  // Ensure dependent tables exist for the user (eval_configs is auto-created by trigger on signup)

  const { error: insertError } = await supabase.from('evaluations').insert(rows);
  if (insertError) {
    console.error('Failed to insert evaluations:', insertError);
    process.exit(1);
  }

  console.log(`Inserted ${rows.length} evaluations for user ${userId}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


