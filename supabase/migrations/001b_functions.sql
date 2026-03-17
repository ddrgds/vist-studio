-- PART 2: Credit functions

CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'generation',
  p_generation_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET credits_remaining = credits_remaining - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
    AND credits_remaining >= p_amount
  RETURNING credits_remaining INTO v_balance;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, generation_id, balance_after)
  VALUES (p_user_id, -p_amount, p_reason, p_generation_id, v_balance);

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'purchase'
)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET credits_remaining = credits_remaining + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits_remaining INTO v_balance;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (p_user_id, p_amount, p_reason, v_balance);

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_generation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.character_id IS NOT NULL THEN
    UPDATE public.characters
    SET generation_count = generation_count + 1
    WHERE id = NEW.character_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_generation_created ON public.generations;
CREATE TRIGGER on_generation_created
  AFTER INSERT ON public.generations
  FOR EACH ROW EXECUTE FUNCTION public.increment_generation_count();
