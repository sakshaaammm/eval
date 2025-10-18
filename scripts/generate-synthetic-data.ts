/*
  Advanced synthetic data generator for EvalGuard dashboard.
  Provides different data generation scenarios for testing various evaluation patterns.
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

interface DataGenerationOptions {
  count: number;
  daysBack: number;
  scenario: 'realistic' | 'stress-test' | 'edge-cases' | 'performance-test';
  userId?: string;
}

class SyntheticDataGenerator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private makeInteractionId(): string {
    const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    return `int_${rand}`;
  }

  private randomDateWithin(days: number): Date {
    const now = Date.now();
    const delta = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
    return new Date(now - delta);
  }

  private getPromptResponsePairs(): Array<{prompt: string, response: string}> {
    return [
      {
        prompt: 'What are the main benefits of using AI in customer service? Provide details.',
        response: 'AI provides 24/7 support, cost efficiency, consistency, and scalable triage. It can handle routine inquiries, escalate complex issues, and provide personalized responses based on customer history.'
      },
      {
        prompt: 'How can I optimize my React application for better performance?',
        response: 'Use React.memo, useMemo, useCallback, code splitting, and virtual scrolling. Implement proper state management, avoid unnecessary re-renders, and use performance monitoring tools.'
      },
      {
        prompt: 'What are the best practices for database indexing in PostgreSQL?',
        response: 'Create indexes on frequently queried columns, use composite indexes for multi-column queries, monitor query performance, and avoid over-indexing which can slow down writes.'
      },
      {
        prompt: 'Explain the differences between microservices and monolithic architectures.',
        response: 'Microservices offer scalability and flexibility with independent deployment, while monoliths provide simplicity and consistency with easier debugging and testing.'
      },
      {
        prompt: 'How do I implement authentication in a Next.js application?',
        response: 'Use NextAuth.js, JWT tokens, or OAuth providers like Google/GitHub. Implement proper session management, CSRF protection, and secure password hashing.'
      },
      {
        prompt: 'What are the key principles of clean code architecture?',
        response: 'Follow SOLID principles, use dependency injection, maintain separation of concerns, write testable code, and keep functions small and focused.'
      },
      {
        prompt: 'How can I improve my TypeScript code quality and type safety?',
        response: 'Enable strict mode, use proper type definitions, leverage TypeScript\'s advanced features like generics and utility types, and maintain consistent coding standards.'
      },
      {
        prompt: 'What are the advantages of using Docker for application deployment?',
        response: 'Docker provides consistency, portability, easier deployment across different environments, resource isolation, and simplified dependency management.'
      },
      {
        prompt: 'How do I set up CI/CD pipelines for a Node.js project?',
        response: 'Use GitHub Actions, GitLab CI, or Jenkins with automated testing, linting, building, and deployment stages. Implement proper environment management and rollback strategies.'
      },
      {
        prompt: 'What are the best practices for API design and documentation?',
        response: 'Design RESTful APIs, use proper HTTP status codes, maintain comprehensive documentation, implement rate limiting, and follow consistent naming conventions.'
      }
    ];
  }

  private getFlagsForScenario(scenario: string): string[][] {
    switch (scenario) {
      case 'stress-test':
        return [
          [], 
          ['high-confidence'], 
          ['needs-review'], 
          ['flagged-content'], 
          ['low-quality'],
          ['high-confidence', 'verified'],
          ['needs-review', 'flagged-content'],
          ['low-quality', 'needs-review'],
          ['flagged-content', 'low-quality', 'needs-review']
        ];
      case 'edge-cases':
        return [
          ['low-quality'],
          ['needs-review'],
          ['flagged-content'],
          ['low-quality', 'needs-review'],
          ['flagged-content', 'low-quality']
        ];
      case 'performance-test':
        return [
          [],
          ['high-confidence'],
          ['high-confidence', 'verified']
        ];
      default: // realistic
        return [
          [], 
          ['high-confidence'], 
          ['needs-review'], 
          ['flagged-content'], 
          ['low-quality'],
          ['high-confidence', 'verified'],
          ['needs-review', 'flagged-content']
        ];
    }
  }

  private generateScoreForScenario(scenario: string): number {
    switch (scenario) {
      case 'stress-test':
        // More varied scores for stress testing
        return Math.round(Math.random() * 100) / 100;
      case 'edge-cases':
        // Bias towards lower scores for edge case testing
        const edgeBias = Math.random();
        return edgeBias < 0.7 
          ? Math.round((0.1 + Math.random() * 0.4) * 100) / 100  // 70% low scores
          : Math.round((0.5 + Math.random() * 0.5) * 100) / 100; // 30% higher scores
      case 'performance-test':
        // High scores for performance testing
        return Math.round((0.8 + Math.random() * 0.2) * 100) / 100;
      default: // realistic
        const realisticBias = Math.random();
        return realisticBias < 0.7 
          ? Math.round((0.7 + Math.random() * 0.3) * 100) / 100  // 70% high scores
          : Math.round((0.3 + Math.random() * 0.4) * 100) / 100; // 30% lower scores
    }
  }

  private generateLatencyForScenario(scenario: string): number {
    switch (scenario) {
      case 'stress-test':
        // Wide range of latencies for stress testing
        return Math.floor(Math.random() * 2000) + 10; // 10-2010ms
      case 'edge-cases':
        // Extreme latencies for edge case testing
        const edgeLatencyBias = Math.random();
        return edgeLatencyBias < 0.3 
          ? Math.floor(Math.random() * 100) + 10  // 30% very fast
          : Math.floor(Math.random() * 5000) + 1000; // 70% very slow
      case 'performance-test':
        // Low latencies for performance testing
        return Math.floor(Math.random() * 200) + 20; // 20-220ms
      default: // realistic
        const realisticLatencyBias = Math.random();
        return realisticLatencyBias < 0.8 
          ? 50 + Math.floor(Math.random() * 200)  // 80% fast responses
          : 250 + Math.floor(Math.random() * 750); // 20% slower responses
    }
  }

  private generatePIIForScenario(scenario: string): number {
    switch (scenario) {
      case 'stress-test':
        return Math.floor(Math.random() * 15); // 0-14 tokens
      case 'edge-cases':
        // More PII redaction for edge cases
        const edgePIIBias = Math.random();
        return edgePIIBias < 0.3 
          ? 0  // 30% no PII
          : Math.floor(Math.random() * 20) + 1; // 70% with PII (1-20 tokens)
      case 'performance-test':
        return Math.floor(Math.random() * 3); // 0-2 tokens
      default: // realistic
        const realisticPIIBias = Math.random();
        return realisticPIIBias < 0.6 
          ? 0  // 60% no PII redaction
          : Math.floor(Math.random() * 8); // 40% some PII redaction
    }
  }

  async generateData(options: DataGenerationOptions): Promise<void> {
    const { count, daysBack, scenario, userId } = options;
    
    let targetUserId = userId;
    if (!targetUserId) {
      const { data, error } = await this.supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw error;
      if (!data.users.length) {
        console.log('No users found. Create a user first (sign up) and re-run.');
        return;
      }
      targetUserId = data.users[0].id;
    }

    const promptResponsePairs = this.getPromptResponsePairs();
    const flagsPool = this.getFlagsForScenario(scenario);

    const rows: InsertableEvaluation[] = Array.from({ length: count }).map(() => {
      const createdAt = this.randomDateWithin(daysBack).toISOString();
      const pair = this.randomChoice(promptResponsePairs);
      
      return {
        user_id: targetUserId!,
        interaction_id: this.makeInteractionId(),
        prompt: pair.prompt,
        response: pair.response,
        score: this.generateScoreForScenario(scenario),
        latency_ms: this.generateLatencyForScenario(scenario),
        flags: this.randomChoice(flagsPool),
        pii_tokens_redacted: this.generatePIIForScenario(scenario),
        created_at: createdAt,
      };
    });

    const { error: insertError } = await this.supabase.from('evaluations').insert(rows);
    if (insertError) {
      throw new Error(`Failed to insert evaluations: ${insertError.message}`);
    }

    console.log(`Generated ${rows.length} evaluations for scenario '${scenario}' for user ${targetUserId}`);
  }
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

  const generator = new SyntheticDataGenerator(supabase);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const scenario = (args[0] as 'realistic' | 'stress-test' | 'edge-cases' | 'performance-test') || 'realistic';
  const count = parseInt(args[1]) || 100;
  const daysBack = parseInt(args[2]) || 30;

  console.log(`Generating ${count} evaluations for scenario '${scenario}' over the last ${daysBack} days...`);

  try {
    await generator.generateData({ count, daysBack, scenario });
    console.log('✅ Synthetic data generation completed successfully!');
  } catch (error) {
    console.error('❌ Error generating synthetic data:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
