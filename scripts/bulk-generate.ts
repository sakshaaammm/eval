/*
  Bulk data generation script for EvalGuard dashboard.
  Generates large datasets for performance testing and stress testing scenarios.
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

interface BulkGenerationOptions {
  totalCount: number;
  batchSize: number;
  daysBack: number;
  userId?: string;
}

class BulkDataGenerator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private makeInteractionId(): string {
    const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    return `bulk_${rand}`;
  }

  private randomDateWithin(days: number): Date {
    const now = Date.now();
    const delta = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
    return new Date(now - delta);
  }

  private getPromptResponsePairs(): Array<{prompt: string, response: string}> {
    return [
      {
        prompt: 'What are the main benefits of using AI in customer service?',
        response: 'AI provides 24/7 support, cost efficiency, consistency, and scalable triage capabilities.'
      },
      {
        prompt: 'How can I optimize my React application for better performance?',
        response: 'Use React.memo, useMemo, useCallback, code splitting, and virtual scrolling techniques.'
      },
      {
        prompt: 'What are the best practices for database indexing in PostgreSQL?',
        response: 'Create indexes on frequently queried columns, use composite indexes, and monitor query performance.'
      },
      {
        prompt: 'Explain the differences between microservices and monolithic architectures.',
        response: 'Microservices offer scalability and flexibility, while monoliths provide simplicity and consistency.'
      },
      {
        prompt: 'How do I implement authentication in a Next.js application?',
        response: 'Use NextAuth.js, JWT tokens, or OAuth providers like Google/GitHub for authentication.'
      },
      {
        prompt: 'What are the key principles of clean code architecture?',
        response: 'Follow SOLID principles, use dependency injection, and maintain separation of concerns.'
      },
      {
        prompt: 'How can I improve my TypeScript code quality and type safety?',
        response: 'Enable strict mode, use proper type definitions, and leverage TypeScript\'s advanced features.'
      },
      {
        prompt: 'What are the advantages of using Docker for application deployment?',
        response: 'Docker provides consistency, portability, and easier deployment across different environments.'
      },
      {
        prompt: 'How do I set up CI/CD pipelines for a Node.js project?',
        response: 'Use GitHub Actions, GitLab CI, or Jenkins with automated testing and deployment stages.'
      },
      {
        prompt: 'What are the best practices for API design and documentation?',
        response: 'Design RESTful APIs, use proper HTTP status codes, and maintain comprehensive documentation.'
      },
      {
        prompt: 'How can I implement real-time features using WebSockets?',
        response: 'Implement WebSocket connections for real-time communication between client and server.'
      },
      {
        prompt: 'What are the key considerations for choosing a cloud provider?',
        response: 'Consider factors like pricing, features, reliability, and geographic presence.'
      },
      {
        prompt: 'How do I optimize images for web performance?',
        response: 'Use modern formats like WebP, implement lazy loading, and optimize file sizes.'
      },
      {
        prompt: 'What are the best practices for error handling in JavaScript?',
        response: 'Use try-catch blocks, implement proper error boundaries, and log errors appropriately.'
      },
      {
        prompt: 'How can I implement caching strategies for better performance?',
        response: 'Implement Redis caching, CDN usage, and browser caching strategies.'
      },
      {
        prompt: 'What are the differences between SQL and NoSQL databases?',
        response: 'SQL is structured and ACID-compliant, while NoSQL offers flexibility and scalability.'
      },
      {
        prompt: 'How do I implement responsive design in CSS?',
        response: 'Use CSS Grid, Flexbox, media queries, and responsive units like rem and vw.'
      },
      {
        prompt: 'What are the best practices for testing React components?',
        response: 'Use Jest, React Testing Library, and implement unit, integration, and E2E tests.'
      },
      {
        prompt: 'How can I implement state management in React applications?',
        response: 'Use Context API, Redux, Zustand, or other state management libraries based on complexity.'
      },
      {
        prompt: 'What are the best practices for securing web applications?',
        response: 'Implement HTTPS, input validation, authentication, authorization, and regular security audits.'
      }
    ];
  }

  private generateBatch(batchSize: number, userId: string, daysBack: number): InsertableEvaluation[] {
    const promptResponsePairs = this.getPromptResponsePairs();
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

    return Array.from({ length: batchSize }).map(() => {
      const createdAt = this.randomDateWithin(daysBack).toISOString();
      const pair = this.randomChoice(promptResponsePairs);
      
      // Generate realistic data patterns
      const scoreBias = Math.random();
      const score = scoreBias < 0.7 
        ? Math.round((0.7 + Math.random() * 0.3) * 100) / 100  // 70% high scores
        : Math.round((0.3 + Math.random() * 0.4) * 100) / 100; // 30% lower scores
      
      const latencyBias = Math.random();
      const latency_ms = latencyBias < 0.8 
        ? 50 + Math.floor(Math.random() * 200)  // 80% fast responses
        : 250 + Math.floor(Math.random() * 750); // 20% slower responses
      
      const piiBias = Math.random();
      const pii_tokens_redacted = piiBias < 0.6 
        ? 0  // 60% no PII redaction
        : Math.floor(Math.random() * 8); // 40% some PII redaction
      
      return {
        user_id: userId,
        interaction_id: this.makeInteractionId(),
        prompt: pair.prompt,
        response: pair.response,
        score,
        latency_ms,
        flags: this.randomChoice(flagsPool),
        pii_tokens_redacted,
        created_at: createdAt,
      };
    });
  }

  async generateBulkData(options: BulkGenerationOptions): Promise<void> {
    const { totalCount, batchSize, daysBack, userId } = options;
    
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

    const totalBatches = Math.ceil(totalCount / batchSize);
    let totalInserted = 0;

    console.log(`Starting bulk data generation: ${totalCount} records in ${totalBatches} batches of ${batchSize}...`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const remainingRecords = totalCount - totalInserted;
      const currentBatchSize = Math.min(batchSize, remainingRecords);
      
      const batch = this.generateBatch(currentBatchSize, targetUserId!, daysBack);
      
      try {
        const { error: insertError } = await this.supabase.from('evaluations').insert(batch);
        if (insertError) {
          throw new Error(`Failed to insert batch ${batchIndex + 1}: ${insertError.message}`);
        }
        
        totalInserted += currentBatchSize;
        console.log(`✅ Batch ${batchIndex + 1}/${totalBatches} completed: ${currentBatchSize} records inserted (${totalInserted}/${totalCount} total)`);
        
        // Small delay between batches to avoid overwhelming the database
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Error in batch ${batchIndex + 1}:`, error);
        throw error;
      }
    }

    console.log(`🎉 Bulk data generation completed successfully! Total records inserted: ${totalInserted}`);
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

  const generator = new BulkDataGenerator(supabase);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const totalCount = parseInt(args[0]) || 1000;
  const batchSize = parseInt(args[1]) || 100;
  const daysBack = parseInt(args[2]) || 30;

  console.log(`Bulk data generation configuration:`);
  console.log(`- Total records: ${totalCount}`);
  console.log(`- Batch size: ${batchSize}`);
  console.log(`- Time range: last ${daysBack} days`);

  try {
    await generator.generateBulkData({ totalCount, batchSize, daysBack });
  } catch (error) {
    console.error('❌ Error in bulk data generation:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
