-- Enable Row Level Security (RLS) on suggested_questions table
ALTER TABLE suggested_questions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow any public user (anonymous) to insert suggestions
CREATE POLICY "Allow public inserts on suggestions" 
ON suggested_questions
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Policy 2: Allow authenticated admins to view all suggestions
CREATE POLICY "Allow authenticated admins select" 
ON suggested_questions
FOR SELECT 
TO authenticated
USING (true);

-- Policy 3: Allow authenticated admins to update/review suggestions
CREATE POLICY "Allow authenticated admins update" 
ON suggested_questions
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Allow authenticated admins to delete suggestions
CREATE POLICY "Allow authenticated admins delete" 
ON suggested_questions
FOR DELETE 
TO authenticated
USING (true);
