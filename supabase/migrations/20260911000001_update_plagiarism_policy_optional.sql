-- Update Plagiarism Policy in policies table to mark report upload as optional
UPDATE public.policies
SET title = 'Plagiarism Policy (Optional Report Upload)',
    content = '### 1. Plagiarism Limit & Verification
TJASF maintains a strict zero-tolerance stance on plagiarism. All submissions must have a similarity index of **10% or less**. Manuscripts exceeding a 10% similarity score will be desk-rejected immediately.

### 2. Plagiarism Report Upload (Optional)
Authors may **optionally upload an official plagiarism report** (in PDF format from Turnitin or iThenticate) along with their manuscript at the time of submission. If no report is uploaded by the author, our editorial desk screening team will perform the plagiarism verification check prior to sending the manuscript for peer review.

### 3. Self-Plagiarism
Self-plagiarism (duplicate publication of one''s own previously published work) is strictly prohibited. Content from the authors'' own prior work must be appropriately quoted and cited. It cannot constitute the bulk of the submitted manuscript.'
WHERE slug = 'plagiarism-policy';
