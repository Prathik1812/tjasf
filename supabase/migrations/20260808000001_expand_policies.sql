-- ============ EXPAND AND STRENGTHEN JOURNAL POLICIES ============
-- This migration updates the policy contents to be highly professional, strict, and thorough.

-- 1. Author Guidelines
UPDATE policies 
SET content = '### 1. Structure and Format
Manuscripts must strictly be formatted using the official TJASF Paper Template. Submissions that do not conform to the template layout will be rejected automatically during upload to maintain publication standards. Submissions should be submitted in Microsoft Word (.doc or .docx) format.

### 2. Manuscript Sections
All submissions must contain the following sections in order:
- **Title**: Concise and informative (no abbreviations).
- **Abstract**: A single paragraph summarizing the paper''s objective, methods, results, and conclusion (maximum 300 words).
- **Keywords**: 3 to 5 indexing keywords separated by semicolons.
- **Introduction**: Objectives of the work and background context.
- **Methodology**: Detailed description of materials, methods, and experimental design.
- **Results & Discussion**: Clear presentation of findings and their scientific interpretation.
- **Conclusion**: Core takeaway points and future recommendations.
- **Declarations**: Funding sources, conflicts of interest, and AI-assistance disclosures.
- **References**: Numbered list in strict IEEE style.

### 3. Submission Compliance
- All co-authors must be registered during submission with their full legal names, active email addresses, and institutional affiliations.
- The primary file name must contain ''template'' or ''tjasf'' to verify compliance with the structure filter.
- Reference entries must include valid, active DOIs where available.'
WHERE slug = 'author-guidelines';

-- 2. Submission Checklist
UPDATE policies 
SET content = 'Please verify that your manuscript meets all requirements before starting the submission process. Non-compliant papers are subject to immediate desk rejection.

- [ ] **Template Formatting**: File is saved in .doc/.docx format and conforms to the layout guidelines in the official TJASF template (e.g., margins, font sizes, heading styles).
- [ ] **Strict Naming Compliance**: File name includes ''template'' or ''tjasf'' to pass the automated uploader check.
- [ ] **Abstract & Keywords**: Contains an abstract under 300 words and 3-5 keywords.
- [ ] **Author Disclosures**: All authors listed in the document are added to the online submission metadata with valid emails and affiliations.
- [ ] **Ethics & Declarations**: Includes statements on conflicts of interest, funding sources, and AI tool usage (e.g., LLMs).
- [ ] **References**: Formatted in IEEE style, with DOIs appended where available.
- [ ] **Originality**: The work is original, unpublished, and not under review elsewhere.'
WHERE slug = 'submission-checklist';

-- 3. Peer Review Policy
UPDATE policies 
SET content = 'TJASF operates a strict double-blind peer review process to ensure objectivity, transparency, and research integrity.

### 1. Initial Screening (Desk Review)
- Every submission undergoes an initial check by the Editorial Office for template compliance, scope alignment, and plagiarism checks (using iThenticate).
- Non-compliant manuscripts (e.g. failing the template format or exceeding 15% plagiarism threshold) are rejected immediately.

### 2. Review Assignment
- Compliant manuscripts are assigned to a Section Editor with expertise in the paper''s scientific domain.
- The Section Editor assigns the paper to at least two independent expert reviewers.
- Neither the authors nor the reviewers are aware of each other''s identities.

### 3. Reviewer Evaluation Criteria
Reviewers evaluate submissions using a standardized structured review system, rating:
- **Originality**: Novelty and significance of the contribution.
- **Methodological Rigor**: Validity, robustness, and reproducibility of the research.
- **Clarity & Structure**: Flow of language, quality of illustrations, and compliance with the template.

### 4. Decisions
Based on reviewer feedback, the Section Editor recommends one of:
- **Accept Submission**: Ready for publication.
- **Minor Revisions**: Small modifications required.
- **Major Revisions**: Significant revisions and re-review required.
- **Decline Submission**: Rejected from publication.'
WHERE slug = 'peer-review-policy';
