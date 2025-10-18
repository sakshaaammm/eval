# Synthetic Data Generation Guide

This guide explains how to use the enhanced synthetic data generation features in EvalGuard.

## Quick Start

1. **Basic seeding** (50 realistic records):
   ```bash
   npm run seed
   ```

2. **Check your data**:
   ```bash
   npm run cleanup:stats
   ```

3. **Clean up when done**:
   ```bash
   npm run cleanup:reset  # Preview
   npm run cleanup reset-all  # Actually delete
   ```

## Available Scripts

### Data Generation
- `npm run seed` - Basic 50 records (enhanced with more realistic data)
- `npm run seed:realistic` - 50 realistic records over 30 days
- `npm run seed:stress` - 200 records for stress testing
- `npm run seed:edge-cases` - 100 records with problematic data
- `npm run seed:performance` - 100 high-quality records over 7 days
- `npm run seed:bulk` - 1000 records in batches
- `npm run seed:bulk-large` - 10000 records for performance testing

### Data Management
- `npm run cleanup:stats` - Show database statistics
- `npm run cleanup:old` - Clean old data (keep 100 newest)
- `npm run cleanup:reset` - Preview reset (dry run)
- `npm run cleanup reset-all` - Reset all data

## Data Scenarios

### Realistic
- 70% high scores (0.7-1.0)
- 80% fast responses (50-250ms)
- 60% no PII redaction
- Balanced flag distribution

### Stress Test
- Random score distribution (0.0-1.0)
- Wide latency range (10-2010ms)
- High PII redaction (0-14 tokens)
- All flag combinations

### Edge Cases
- 70% low scores (0.1-0.5)
- Extreme latencies (very fast/slow)
- High PII redaction (1-20 tokens)
- Problematic flags

### Performance Test
- High scores (0.8-1.0)
- Low latencies (20-220ms)
- Minimal PII redaction (0-2 tokens)
- Positive flags only

## Custom Usage

### Generate Custom Data
```bash
# Scenario, count, days
tsx scripts/generate-synthetic-data.ts realistic 500 14

# Bulk generation: total, batch-size, days
tsx scripts/bulk-generate.ts 5000 200 60
```

### Cleanup Options
```bash
# Clean data older than 7 days, keep 50 newest
tsx scripts/cleanup.ts cleanup 7 50

# Reset specific user
tsx scripts/cleanup.ts reset-user <user-id>

# Dry run any command
tsx scripts/cleanup.ts cleanup 7 50 --dry-run
```

## Data Patterns

The synthetic data includes realistic patterns:

- **Scores**: Biased towards higher scores (70% > 0.7)
- **Latency**: Most responses are fast (80% < 250ms)
- **PII**: Most responses have no redaction (60% = 0)
- **Flags**: Mix of empty, single, and multiple flags
- **Time Distribution**: Spread across specified days
- **Prompt-Response Matching**: Responses match prompts for realism

## Environment Setup

Ensure your `.env` file contains:
```bash
SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Best Practices

1. **Start small**: Use `npm run seed` for initial testing
2. **Scale up**: Use bulk scripts for performance testing
3. **Clean regularly**: Use cleanup scripts to manage data size
4. **Dry run first**: Always preview cleanup operations
5. **Monitor stats**: Check database statistics regularly

## Troubleshooting

- **No users found**: Create a user first via sign-up
- **Permission errors**: Ensure service role key is correct
- **Memory issues**: Use smaller batch sizes for bulk operations
- **Slow performance**: Clean up old data regularly
