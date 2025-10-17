-- Insert sample data for testing
-- This will create evaluations for the logged-in user after they sign up

-- Function to generate sample evaluations
CREATE OR REPLACE FUNCTION public.generate_sample_evaluations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_interaction_id text;
  v_date timestamptz;
  i integer;
BEGIN
  -- Get the first user (for testing)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found - sample data will be created when first user signs up';
    RETURN;
  END IF;
  
  -- Generate 50 sample evaluations over the past 30 days
  FOR i IN 1..50 LOOP
    v_interaction_id := 'int_' || substr(md5(random()::text), 1, 16);
    v_date := NOW() - (random() * interval '30 days');
    
    INSERT INTO public.evaluations (
      user_id,
      interaction_id,
      prompt,
      response,
      score,
      latency_ms,
      flags,
      pii_tokens_redacted,
      created_at
    ) VALUES (
      v_user_id,
      v_interaction_id,
      'User: What are the main benefits of using AI in customer service? Please provide a detailed analysis.',
      'AI in customer service offers numerous benefits: 1) 24/7 availability for instant customer support, 2) Reduced operational costs through automation, 3) Consistent service quality across all interactions, 4) Ability to handle multiple queries simultaneously, 5) Data-driven insights for continuous improvement. These advantages help businesses enhance customer satisfaction while optimizing resource allocation.',
      0.5 + (random() * 0.5), -- Score between 0.5 and 1.0
      (50 + floor(random() * 450))::integer, -- Latency between 50-500ms
      CASE 
        WHEN random() < 0.3 THEN ARRAY['high-confidence']::text[]
        WHEN random() < 0.5 THEN ARRAY['needs-review']::text[]
        ELSE ARRAY[]::text[]
      END,
      floor(random() * 5)::integer, -- 0-4 PII redactions
      v_date
    );
  END LOOP;
  
  RAISE NOTICE 'Generated 50 sample evaluations for user %', v_user_id;
END;
$$;

-- Call the function to generate sample data
SELECT public.generate_sample_evaluations();