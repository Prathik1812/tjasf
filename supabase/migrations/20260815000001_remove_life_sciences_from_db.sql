-- ============ REMOVE LIFE SCIENCES FROM DATABASE CONTENT ============
-- This migration updates the homepage_content table to remove "life sciences" from aims and indexing.

UPDATE homepage_content
SET value = 'Our mission is to advance scientific knowledge by publishing rigorous, original research that crosses disciplinary boundaries. We welcome work across emerging scientific and technological fields, including: Artificial Intelligence, Computer Science, Data Science, Cybersecurity, Electronics & Communication Engineering, Electrical Engineering, Mechanical Engineering, Civil Engineering, Robotics, Internet of Things, Physics, Mathematics, Environmental Science, and Materials Science.'
WHERE key = 'about_aims';

UPDATE homepage_content
SET value = 'TJASF is committed to achieving broad indexing coverage. In the future, we are rigorously working to include ourselves in major databases.'
WHERE key = 'about_indexing';

DELETE FROM domains WHERE name = 'Life Sciences' OR slug = 'life-sciences';
