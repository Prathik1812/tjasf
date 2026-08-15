-- ============ SEED DOMAINS ============
INSERT INTO domains (name, slug, description) VALUES
  ('Physical Sciences', 'physical-sciences', 'Research in physics, chemistry, and materials science'),
  ('Life Sciences', 'life-sciences', 'Biology, genetics, ecology, and biomedical research'),
  ('Computational Science', 'computational-science', 'AI, machine learning, algorithms, and data science'),
  ('Environmental Systems', 'environmental-systems', 'Climate, sustainability, and earth systems'),
  ('Engineering', 'engineering', 'Mechanical, electrical, civil, and biomedical engineering'),
  ('Social Sciences', 'social-sciences', 'Psychology, sociology, economics, and policy research')
ON CONFLICT (slug) DO NOTHING;

-- ============ SEED EDITORIAL BOARD ============
ALTER TABLE editorial_board ADD COLUMN IF NOT EXISTS photo_url text DEFAULT '';

-- Clear existing entries first to avoid duplication when running SQL multiple times
DELETE FROM editorial_board;

INSERT INTO editorial_board (name, role_title, affiliation, domain, bio, photo_url, sort_order, is_active) VALUES
  ('Dr. Rajesh Thumma', 'Editor in Chief', 'TJASF Editorial Office', 'Engineering / Power Electronics', 'Associate Professor in the Department of Electronics and Communication Engineering at Anurag University. Expert in power electronics, WSN, and IoT applications. ORCID: 0000-0003-4181-4572.', '/assets/images/rajesh_thumma.jpg', 1, true),
  ('Prathik Kumar', 'Managing Editor (Operations & Technology)', 'TJASF Editorial Office', 'Full-Stack Software Engineering', 'Managing Editor responsible for the design, development, operations, and maintenance of the TJASF peer review system and digital publishing platform.', '/assets/images/prathik_kumar.png', 2, true)
ON CONFLICT DO NOTHING;

-- ============ SEED VOLUME & ISSUE ============
INSERT INTO volumes (number, year, title) VALUES
  (1, 2026, 'Inaugural Volume')
ON CONFLICT DO NOTHING;

INSERT INTO issues (volume_id, number, title, publication_date, is_published)
SELECT v.id, 1, 'Inaugural Issue', '2026-01-15', true
FROM volumes v WHERE v.number = 1 AND v.year = 2026
AND NOT EXISTS (SELECT 1 FROM issues WHERE volume_id = v.id AND number = 1);

-- ============ SEED POLICIES ============
INSERT INTO policies (slug, title, category, content) VALUES
  ('open-access-policy', 'Open Access Policy', 'Publication Ethics', 'TJASF is a fully open-access journal. All published articles are freely available to readers worldwide without subscription fees or paywalls. Authors retain copyright of their work under a Creative Commons Attribution License (CC BY 4.0). This license permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly cited. There are no article processing charges (APCs) for authors.') ,
  ('peer-review-policy', 'Peer Review Policy', 'Editorial Process', 'TJASF employs a double-blind peer review process. Each manuscript is reviewed by at least two independent reviewers with expertise in the relevant field. Reviewers are selected by the section editor based on their qualifications and absence of conflicts of interest. The review process typically takes 4-6 weeks. Authors may suggest preferred or non-preferred reviewers, though the editor retains final discretion over reviewer selection.') ,
  ('author-guidelines', 'Author Guidelines', 'Submission', 'Manuscripts should be original, unpublished work not under consideration elsewhere. Submissions must include a title, abstract (max 300 words), keywords (3-5), and full references. Files should be submitted in PDF, DOC, or DOCX format. Authors must declare any conflicts of interest, funding sources, and use of AI tools in the research process. All co-authors must be listed with their full names, affiliations, and email addresses.') ,
  ('plagiarism-policy', 'Plagiarism Policy', 'Publication Ethics', 'TJASF has a zero-tolerance policy for plagiarism. All submissions are screened using plagiarism detection software before entering the review process. Manuscripts found to contain plagiarized content will be rejected immediately, and the authors may be barred from future submissions. Self-plagiarism is also prohibited; previously published work must be properly cited and cannot constitute the majority of new submissions.') ,
  ('conflict-of-interest', 'Conflict of Interest Policy', 'Publication Ethics', 'All authors, reviewers, and editors must disclose any financial or personal relationships that could influence the research or review process. Conflicts include but are not limited to: employment relationships, stock ownership, patents, grants, personal relationships, and academic rivalries. Disclosed conflicts will be published with the article. Undisclosed conflicts discovered post-publication may result in retraction.') ,
  ('data-availability', 'Data Availability Policy', 'Publication Ethics', 'Authors are encouraged to make their research data publicly available in recognized repositories. Data must be available upon request from the editor or reviewers during the review process. If data cannot be shared due to privacy or confidentiality concerns, authors must explain the restrictions in the manuscript. Datasets cited in the work should include persistent identifiers (DOIs or accession numbers).') ,
  ('corrections-and-retractions', 'Corrections and Retractions', 'Publication Ethics', 'Authors who discover errors in their published work should notify the editorial office promptly. Minor corrections will be published as errata. Serious errors that affect the conclusions of the work may result in retraction. Retractions are also issued for plagiarism, duplicate publication, or research misconduct. All retractions are clearly labeled and linked to the original article.') ,
  ('article-processing-charges', 'Article Processing Charges', 'Fees', 'TJASF does not charge article processing charges (APCs) or submission fees. The journal is funded through institutional support and grants. There are no hidden fees at any stage of the publication process. Authors from low- and middle-income countries receive the same access and service as all other authors.') ,
  ('copyright-and-license', 'Copyright and License', 'Legal', 'Authors retain full copyright of their published work. All articles are published under a Creative Commons Attribution License (CC BY 4.0), which permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly cited. Third-party materials included in articles must be properly attributed and comply with their respective licenses.') ,
  ('ai-assistance-policy', 'AI Assistance Policy', 'Publication Ethics', 'Authors must disclose any use of artificial intelligence tools (such as large language models) in manuscript preparation. AI tools may be used for language editing and formatting assistance but cannot be listed as an author. Authors remain fully responsible for the accuracy and integrity of all content, including AI-assisted portions. Reviewers and editors must not upload manuscript content to public AI services.') ,
  ('archiving-policy', 'Archiving Policy', 'Preservation', 'Authors may self-archive the accepted version of their manuscript in institutional repositories immediately upon publication.') ,
  ('submission-checklist', 'Submission Checklist', 'Submission', 'Before submitting, ensure your manuscript includes: (1) Title and abstract (max 300 words), (2) 3-5 keywords, (3) Complete author list with affiliations, (4) Conflict of interest statement, (5) Funding statement, (6) AI usage disclosure, (7) References in a consistent format, (8) Figures and tables with captions, (9) Original work declaration, (10) Copyright agreement signed.')
ON CONFLICT (slug) DO NOTHING;

-- ============ SEED HOMEPAGE CONTENT ============
INSERT INTO homepage_content (key, value) VALUES
  ('about_title', 'The Journal of Advanced Scientific Frontiers'),
  ('about_intro', 'TJASF is an international, peer-reviewed, open-access journal that aims to promote and disseminate original research, innovative ideas, and practical advancements across a wide spectrum of disciplines within science, engineering, and technology.'),
  ('about_aims', 'Our mission is to provide academics, researchers, engineers, and practitioners with a platform to share their innovative findings and insights that contribute to technological progress, sustainable development, and interdisciplinary integration. We welcome research articles, review papers, technical notes, case studies, and short communications that exhibit academic rigor, originality, and clarity in the following fields:

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
- Data Science and Cloud Computing
- Engineering Management and Innovation Policy'),
  ('about_editorial', 'All manuscripts undergo rigorous peer review by qualified experts in the field. We follow a double-blind review process to ensure fairness and objectivity. Our editorial board comprises distinguished researchers from institutions worldwide.'),
  ('about_open_access', 'TJASF is fully open access. All published articles are freely available to readers worldwide without subscription fees. Authors retain copyright of their work under a Creative Commons license.'),
  ('about_indexing', 'TJASF is committed to achieving broad indexing coverage. In the future, we are rigorously working to include ourselves in major databases.'),
  ('hero_title', 'Where bold ideas move science forward.'),
  ('hero_subtitle', 'Open access. Multidisciplinary research.'),
  ('hero_lede', 'TJASF is an international, peer-reviewed journal for research that crosses boundaries, challenges assumptions, and opens new scientific frontiers.')
ON CONFLICT (key) DO NOTHING;

-- ============ SEED ANNOUNCEMENT ============
INSERT INTO announcements (title, body, date, pinned)
SELECT 'TJASF Now Accepting Submissions', 'The Journal of Advanced Scientific Frontiers is now accepting manuscript submissions for its inaugural volume. We welcome original research across all scientific disciplines.', '2026-01-01', true
WHERE NOT EXISTS (SELECT 1 FROM announcements LIMIT 1);

-- ============ UPDATE POLICIES WITH STRICTOR TEMPLATE GUIDELINES ============
UPDATE policies SET content = 'Manuscripts must strictly be formatted using the official TJASF Paper Template. Submissions that do not conform to the template layout will be rejected automatically during upload to maintain publication standards. Manuscripts should be original, unpublished work not under consideration elsewhere. Submissions must include a title, abstract (max 300 words), keywords (3-5), and full references. Files should be submitted in PDF, DOC, or DOCX format. Authors must declare any conflicts of interest, funding sources, and use of AI tools in the research process. All co-authors must be listed with their full names, affiliations, and email addresses.' WHERE slug = 'author-guidelines';

UPDATE policies SET content = 'Before submitting, ensure your manuscript: (1) Is strictly formatted according to the official TJASF Paper Template, (2) Includes a title and abstract (max 300 words), (3) Lists 3-5 keywords, (4) Declares all co-authors with correct affiliations and emails, (5) Declares conflicts of interest, funding statements, and AI disclosures, (6) Includes references in a consistent format, (7) Declares original work and signs the copyright agreement.' WHERE slug = 'submission-checklist';
