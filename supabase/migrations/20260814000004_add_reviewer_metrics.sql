-- Add academic metrics and details to user profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS h_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS citations_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publications text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[];

-- Update existing reviewers/section editors with realistic starter academic data
UPDATE profiles
SET 
  h_index = floor(random() * 15 + 2)::integer,
  citations_count = floor(random() * 350 + 15)::integer,
  publications = ARRAY[
    'Explainable Machine Learning Frameworks in Medicine (' || (2021 + floor(random()*4))::text || ')',
    'A Survey of Edge Computing Architectures for IoT Systems (' || (2020 + floor(random()*5))::text || ')',
    'Real-time Anomaly Detection Using Lightweight CNNs (' || (2022 + floor(random()*3))::text || ')'
  ],
  keywords = ARRAY['deep learning', 'machine learning', 'anomaly detection', 'iot', 'edge computing', 'neural networks', 'computer vision']
WHERE role IN ('reviewer', 'section_editor');
