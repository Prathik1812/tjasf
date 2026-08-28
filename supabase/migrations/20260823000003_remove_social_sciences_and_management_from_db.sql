-- ============ REMOVE SOCIAL SCIENCES & MANAGEMENT FROM DATABASE ============
-- Delete the domains
DELETE FROM domains WHERE name IN ('Social Sciences', 'Management') OR slug IN ('social-sciences', 'management');

-- Update about aims to remove Engineering Management
UPDATE homepage_content
SET value = 'Our mission is to provide academics, researchers, engineers, and practitioners with a platform to share their innovative findings and insights that contribute to technological progress, sustainable development, and interdisciplinary integration. We welcome research articles, review papers, technical notes, case studies, and short communications that exhibit academic rigor, originality, and clarity in the following fields:

- Applied and Pure Sciences
- Electrical, Mechanical, Civil, and Chemical Engineering
- Computer Science and Information Technology
- Artificial Intelligence and Machine Learning
- Robotics and Automation
- Materials Science and Nanotechnology
- Environmental Science and Sustainable Technologies
- Medical and Allied Health Sciences
- Biomedical Sciences
- Pharmaceutical and Cosmetic Science
- Renewable Energy and Smart Grid Systems
- Internet of Things (IoT) and Embedded Systems
- Data Science and Cloud Computing'
WHERE key = 'about_aims';
