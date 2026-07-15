-- Supabase Schema Update for Message Templates

CREATE TABLE message_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('MARKETING', 'UTILITY')),
  header_type VARCHAR(50) CHECK (header_type IN ('IMAGE', 'NONE')),
  body_text TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates" 
  ON message_templates FOR SELECT 
  USING (auth.uid() = shop_id);

CREATE POLICY "Users can insert their own templates" 
  ON message_templates FOR INSERT 
  WITH CHECK (auth.uid() = shop_id);

CREATE POLICY "Users can update their own templates" 
  ON message_templates FOR UPDATE 
  USING (auth.uid() = shop_id);

CREATE POLICY "Users can delete their own templates" 
  ON message_templates FOR DELETE 
  USING (auth.uid() = shop_id);
