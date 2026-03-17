-- PART 3: Row Level Security

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Generations: own only" ON public.generations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Credits: read own" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'characters' AND policyname = 'Characters: own only'
  ) THEN
    CREATE POLICY "Characters: own only" ON public.characters
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
