-- ============ RESTORE POLICIES TO ORIGINAL SEED VALUES ============
-- Run this SQL in your Supabase SQL Editor to revert database rows.

UPDATE policies 
SET content = 'TJASF employs a double-blind peer review process. Each manuscript is reviewed by at least two independent reviewers with expertise in the relevant field. Reviewers are selected by the section editor based on their qualifications and absence of conflicts of interest. The review process typically takes 4-6 weeks. Authors may suggest preferred or non-preferred reviewers, though the editor retains final discretion over reviewer selection.'
WHERE slug = 'peer-review-policy';

UPDATE policies 
SET content = 'Manuscripts should be original, unpublished work not under consideration elsewhere. Submissions must include a title, abstract (max 300 words), keywords (3-5), and full references. Files should be submitted in PDF, DOC, or DOCX format. Authors must declare any conflicts of interest, funding sources, and use of AI tools in the research process. All co-authors must be listed with their full names, affiliations, and email addresses.'
WHERE slug = 'author-guidelines';

UPDATE policies 
SET content = 'Before submitting, ensure your manuscript includes: (1) Title and abstract (max 300 words), (2) 3-5 keywords, (3) Complete author list with affiliations, (4) Conflict of interest statement, (5) Funding statement, (6) AI usage disclosure, (7) References in a consistent format, (8) Figures and tables with captions, (9) Original work declaration, (10) Copyright agreement signed.'
WHERE slug = 'submission-checklist';
