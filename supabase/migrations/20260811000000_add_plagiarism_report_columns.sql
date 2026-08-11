-- ============ EXPAND AND STRENGTHEN JOURNAL POLICIES & SCHEMA ============
-- This migration updates the database structure to support Plagiarism Report uploads
-- and updates all policies to reflect plagiarism checks, pricing, and timelines.

-- 1. Add plagiarism columns and author ORCID support
ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS plagiarism_report_url text DEFAULT '';
ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS plagiarism_report_name text DEFAULT '';
ALTER TABLE manuscript_authors ADD COLUMN IF NOT EXISTS orcid text DEFAULT '';

-- 2. Update About Page Indexing Text
UPDATE homepage_content
SET value = 'TJASF is committed to achieving broad indexing coverage. In the future, we are planning to include ourselves in major databases including Scopus, Web of Science, and DOAJ.'
WHERE key = 'about_indexing';

-- 3. Update Plagiarism Policy (slug: plagiarism-policy)
UPDATE policies
SET content = '### 1. Plagiarism Limit & Verification
TJASF maintains a strict zero-tolerance stance on plagiarism. To be considered for peer review, all submissions must have a similarity index of **10% or less**. Manuscripts exceeding a 10% similarity score will be desk-rejected immediately.

### 2. Submission Requirement
Authors **must upload an official plagiarism report** (in PDF format) along with their manuscript at the time of submission. This report must be generated using one of the following industry-recognized platforms:
- **Turnitin**
- **iThenticate**

Submissions that do not include a valid Turnitin or iThenticate similarity report will be returned to the authors and will not proceed to technical screening.

### 3. Self-Plagiarism
Self-plagiarism (duplicate publication of one''s own previously published work) is also strictly prohibited. Content from the authors'' own prior work must be appropriately quoted and cited. It cannot constitute the bulk of the submitted manuscript.'
WHERE slug = 'plagiarism-policy';

-- 4. Update Article Processing Charges (slug: article-processing-charges)
UPDATE policies
SET content = '### 1. Fees Structure
TJASF is a self-funded academic journal committed to keeping scientific research widely accessible. We offer two routes for publication and peer review:

- **Normal Track (Free)**: There are no submission fees or article processing charges (APCs). The peer review process takes approximately **12 weeks**.
- **Fast Track ($40)**: Authors can request an expedited peer review process. For a fee of **$40**, the editorial office guarantees a first-round decision within **4 weeks**.

### 2. Journal Funding
The journal is fully self-funded and does not receive institutional sponsorships or commercial subsidies. Fast-track fees are used directly to offset operational costs, server maintenance, and publishing tools.'
WHERE slug = 'article-processing-charges';

-- 5. Update Copyright and License (slug: copyright-and-license)
UPDATE policies
SET content = '### 1. Creative Commons Attribution License (CC BY 4.0)
All articles published in TJASF are distributed under the Creative Commons Attribution 4.0 International License (CC BY 4.0). This open-access license is designed to facilitate the free exchange of scientific knowledge.

Under the **CC BY 4.0** license, others are free to:
- **Share**: Copy and redistribute the material in any medium or format.
- **Adapt**: Remix, transform, and build upon the material for any purpose, even commercially.

The license permits these actions under the sole condition of **Attribution**:
- Anyone who reuses or builds upon the article must give appropriate credit to the original authors, provide a link to the license, and indicate if changes were made.

### 2. Retaining Copyright
Unlike traditional publishers, TJASF allows authors to retain full copyright of their work. Authors are free to share, archive, and distribute the published version of their article immediately upon publication without restrictions.'
WHERE slug = 'copyright-and-license';

-- 6. Update Submission Checklist (slug: submission-checklist)
UPDATE policies
SET content = 'Please ensure your submission satisfies each point of the checklist. Submissions missing any of these items will be returned immediately.

- **[Point 1] Official Paper Template**: The manuscript must be formatted strictly in accordance with the official TJASF template (.doc or .docx format).
- **[Point 2] File Naming**: The manuscript file name must contain the keyword ''template'' or ''tjasf'' (e.g. `tjasf_physics_paper.docx`) to pass the automated technical screen.
- **[Point 3] Plagiarism Report Upload**: Authors must upload a valid Turnitin or iThenticate plagiarism report (PDF format) showing a similarity index of **10% or less**.
- **[Point 4] Title & Abstract**: The submission must include a title and an abstract of 300 words or less.
- **[Point 5] Keywords**: Include 3 to 5 relevant indexing keywords.
- **[Point 6] Author Information**: Provide full legal names, active email addresses, and institutional affiliations for all co-authors during setup.
- **[Point 7] Disclosures & Declarations**: Include explicit declarations regarding funding sources, conflict of interest statements, and AI-assistance usage.
- **[Point 8] Reference List**: All references must be formatted in standard IEEE style, with active DOIs included where available.'
WHERE slug = 'submission-checklist';

-- 7. Update Peer Review Policy (slug: peer-review-policy)
UPDATE policies
SET content = 'TJASF operates a strict double-blind peer review process to ensure objectivity, transparency, and research integrity.

### 1. Technical Screening (Desk Review)
- Every submission is checked for template compliance, file name verification, and scope alignment.
- The editorial team verifies that the uploaded plagiarism report (Turnitin or iThenticate) is valid and does not exceed the **10%** similarity threshold.
- Non-compliant papers are immediately desk-rejected.

### 2. Review Timelines
- **Normal Track (Free)**: First-round evaluation and feedback typically take **12 weeks**.
- **Fast Track ($40)**: Expedited review guarantees reviewer evaluations and decision letters within **4 weeks**.

### 3. Evaluation Criteria
Reviewers evaluate submissions on:
- **Originality**: Novelty and significance of the contribution.
- **Methodological Rigor**: Validity, robustness, and reproducibility.
- **Clarity & Structure**: Formatting compliance, clear writing, and appropriate figures.

### 4. Decisions
Based on reviewer feedback, the Section Editor recommends one of:
- **Accept**: Ready for publication.
- **Minor Revisions**: Small adjustments required.
- **Major Revisions**: Significant revisions and re-review required.
- **Decline**: Rejected from publication.'
WHERE slug = 'peer-review-policy';

-- 8. Update Author Guidelines (slug: author-guidelines)
UPDATE policies
SET content = '### 1. General Formatting and Template Compliance
All submissions must be prepared in Microsoft Word (.doc or .docx) and formatted strictly according to the official TJASF Paper Template. To verify formatting compliance during file upload, authors must name their manuscript file containing the keyword ''template'' or ''tjasf'' (e.g. `tjasf_myarticle.docx`).

### 2. Manuscript Structure
The manuscript should be organized into the following standard sections:
- **Title Page**: Clear, informative title (no abbreviations), full author names, institutional affiliations, and the email of the corresponding author.
- **Abstract**: A concise, structured summary (max 300 words) explaining the research objective, methodology, key results, and conclusion.
- **Keywords**: 3 to 5 terms separated by semicolons.
- **Introduction**: Theoretical background, literature review, and objectives.
- **Methodology**: Technical description of experiments, models, datasets, and methods to ensure reproducibility.
- **Results and Discussion**: Clear analysis of findings with high-resolution figures and tables, and their scientific interpretation.
- **Conclusion**: Core findings, limitations, and future research directions.
- **Declarations**: Explicit disclosures of funding, conflicts of interest, and any AI editing tools used.
- **References**: Complete list formatted strictly in IEEE style, with active DOIs appended.

### 3. Plagiarism Report Requirement
Authors must upload an official plagiarism report in PDF format from **Turnitin** or **iThenticate** during submission. The similarity index must not exceed **10%**. Manuscripts with higher scores or missing reports will not proceed to review.

### 4. Review Tracks & Fees
- **Normal Track**: No submission fees or APCs. Review process is **12 weeks**.
- **Fast Track**: Expedited review in **4 weeks** for a **$40** processing fee. The journal is self-funded.'
WHERE slug = 'author-guidelines';
