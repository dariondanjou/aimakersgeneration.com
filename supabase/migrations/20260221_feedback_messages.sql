-- Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create feedback_messages table
CREATE TABLE IF NOT EXISTS feedback_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  user_email text NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  email_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert" ON feedback_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read" ON feedback_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
