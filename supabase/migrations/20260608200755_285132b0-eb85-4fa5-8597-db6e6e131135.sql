
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  phase text NOT NULL DEFAULT 'lobby',
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_read_all" ON public.rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rooms_insert_all" ON public.rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "rooms_update_all" ON public.rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX rooms_code_idx ON public.rooms(code);
CREATE INDEX rooms_last_activity_idx ON public.rooms(last_activity);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
