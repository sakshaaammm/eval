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
    'How can I optimize my React application for better performance?',
    'What are the best practices for database indexing in PostgreSQL?',
    'Explain the differences between microservices and monolithic architectures.',
    'How do I implement authentication in a Next.js application?',
    'What are the key principles of clean code architecture?',
    'How can I improve my TypeScript code quality and type safety?',
    'What are the advantages of using Docker for application deployment?',
    'How do I set up CI/CD pipelines for a Node.js project?',
    'What are the best practices for API design and documentation?',
    'How can I implement real-time features using WebSockets?',
    'What are the key considerations for choosing a cloud provider?',
    'How do I optimize images for web performance?',
    'What are the best practices for error handling in JavaScript?',
    'How can I implement caching strategies for better performance?',
    'What are the differences between SQL and NoSQL databases?',
    'How do I implement responsive design in CSS?',
    'What are the best practices for testing React components?',
  ];

  const responses = [
    'AI provides 24/7 support, cost efficiency, consistency, and scalable triage.',
    'Key trends include realistic datasets, latency-weighted scores, and safety checks.',
    'Defense-in-depth: input validation, output filters, and strict tool permissions.',
    'Use React.memo, useMemo, useCallback, code splitting, and virtual scrolling for performance.',
    'Create indexes on frequently queried columns, use composite indexes, and monitor query performance.',
    'Microservices offer scalability and flexibility, while monoliths provide simplicity and consistency.',
    'Use NextAuth.js, JWT tokens, or OAuth providers like Google/GitHub for authentication.',
    'Follow SOLID principles, use dependency injection, and maintain separation of concerns.',
    'Enable strict mode, use proper type definitions, and leverage TypeScript\'s advanced features.',
    'Docker provides consistency, portability, and easier deployment across different environments.',
    'Use GitHub Actions, GitLab CI, or Jenkins with automated testing and deployment stages.',
    'Design RESTful APIs, use proper HTTP status codes, and maintain comprehensive documentation.',
    'Implement WebSocket connections for real-time communication between client and server.',
    'Consider factors like pricing, features, reliability, and geographic presence.',
    'Use modern formats like WebP, implement lazy loading, and optimize file sizes.',
    'Use try-catch blocks, implement proper error boundaries, and log errors appropriately.',
    'Implement Redis caching, CDN usage, and browser caching strategies.',
    'SQL is structured and ACID-compliant, while NoSQL offers flexibility and scalability.',
    'Use CSS Grid, Flexbox, media queries, and responsive units like rem and vw.',
    'Use Jest, React Testing Library, and implement unit, integration, and E2E tests.',
  ];

  const flagsPool = [
    [], 
    ['high-confidence'], 
    ['needs-review'], 
    ['flagged-content'], 
    ['low-quality'], 
    ['high-confidence', 'verified'],
    ['needs-review', 'flagged-content'],
    ['low-quality', 'needs-review']
  ];

  // Generate more realistic data patterns
  const rows: InsertableEvaluation[] = Array.from({ length: 50 }).map((_, index) => {
    const createdAt = randomDateWithin(30).toISOString();
    const promptIndex = Math.floor(Math.random() * prompts.length);
    const responseIndex = promptIndex; // Match response to prompt for realism
    
    // Create more realistic score distribution (bias towards higher scores)
    const scoreBias = Math.random();
    const score = scoreBias < 0.7 
      ? Math.round((0.7 + Math.random() * 0.3) * 100) / 100  // 70% chance of high score
      : Math.round((0.3 + Math.random() * 0.4) * 100) / 100; // 30% chance of lower score
    
    // Create realistic latency patterns (most responses are fast)
    const latencyBias = Math.random();
    const latency_ms = latencyBias < 0.8 
      ? 50 + Math.floor(Math.random() * 200)  // 80% fast responses (50-250ms)
      : 250 + Math.floor(Math.random() * 750); // 20% slower responses (250-1000ms)
    
    // Create realistic PII redaction patterns
    const piiBias = Math.random();
    const pii_tokens_redacted = piiBias < 0.6 
      ? 0  // 60% no PII redaction
      : Math.floor(Math.random() * 8); // 40% some PII redaction (0-7 tokens)
    
    return {
      user_id: userId,
      interaction_id: makeInteractionId(),
      prompt: prompts[promptIndex],
      response: responses[responseIndex],
      score,
      latency_ms,
      flags: randomChoice(flagsPool),
      pii_tokens_redacted,
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


