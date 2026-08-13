-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  slug text PRIMARY KEY,
  title text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables text[] NOT NULL
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "et_select" ON email_templates;
CREATE POLICY "et_select" ON email_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "et_all_admin" ON email_templates;
CREATE POLICY "et_all_admin" ON email_templates FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Seed default templates
INSERT INTO email_templates (slug, title, subject, body, variables) VALUES
  ('submission_confirmation', 'Author Submission Confirmation', 'TJASF: Manuscript Submitted Successfully - {manuscript_id}', 'Dear {author_name},

Thank you for submitting your manuscript entitled "{manuscript_title}" to The Journal of Advanced Scientific Frontiers (TJASF). Your submission ID is {manuscript_id}.

Your manuscript is currently undergoing technical screening. You can track its progress at any time by logging into your Author Dashboard.

Best regards,
TJASF Editorial Office', ARRAY['{author_name}', '{manuscript_title}', '{manuscript_id}']),
  
  ('decision_revision', 'Author Revision Requested', 'TJASF: Revision Requested for Your Manuscript - {manuscript_id}', 'Dear {author_name},

We have completed the peer review process for your manuscript entitled "{manuscript_title}" ({manuscript_id}).

Reviewers have requested revisions. Please log into your author portal to view the reviewer reports and upload your revised files.

Best regards,
TJASF Editorial Office', ARRAY['{author_name}', '{manuscript_title}', '{manuscript_id}']),
  
  ('decision_rejection', 'Author Rejection Notification', 'TJASF: Editorial Decision on Your Manuscript - {manuscript_id}', 'Dear {author_name},

We regret to inform you that after careful evaluation by the editors and reviewers, your manuscript entitled "{manuscript_title}" ({manuscript_id}) has been rejected for publication in TJASF.

Thank you for considering our journal for your research.

Best regards,
TJASF Editorial Office', ARRAY['{author_name}', '{manuscript_title}', '{manuscript_id}']),
  
  ('editor_assignment', 'Editor Assignment Notification', 'TJASF: Manuscript Assigned to You - {manuscript_id}', 'Dear {editor_name},

You have been assigned as the editor for the manuscript "{manuscript_title}" ({manuscript_id}) submitted to The Journal of Advanced Scientific Frontiers (TJASF).

Please log into your Editor Portal to evaluate the manuscript, verify details, and assign reviewers.

Best regards,
TJASF Editorial Office', ARRAY['{editor_name}', '{manuscript_title}', '{manuscript_id}']),
  
  ('reviewer_reminder', 'Reviewer Deadline Nudge', 'TJASF: Urgent Reminder for Manuscript Review - {manuscript_id}', 'Dear Dr. {reviewer_name},

This is a friendly reminder that your peer-review report for the manuscript "{manuscript_title}" ({manuscript_id}) is due on {due_date}.

Please log into your Reviewer Portal to access the manuscript files and submit your evaluation report.

Best regards,
TJASF Editorial Office', ARRAY['{reviewer_name}', '{manuscript_title}', '{manuscript_id}', '{due_date}']),
  
  ('coauthor_consent', 'Co-Author Consent Request', 'TJASF: Verification of Authorship Consent for "{manuscript_title}"', 'Dear {coauthor_name},

We are writing to inform you that {submitter_name} has submitted a manuscript entitled "{manuscript_title}" to The Journal of Advanced Scientific Frontiers (TJASF) and has listed you as a co-author.

To confirm your authorship consent, please click the link below:
{consent_link}

If you did not contribute to this work, you can decline using the link.

Best regards,
TJASF Editorial Office', ARRAY['{coauthor_name}', '{submitter_name}', '{manuscript_title}', '{consent_link}'])
ON CONFLICT (slug) DO UPDATE SET 
  title = EXCLUDED.title,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  variables = EXCLUDED.variables;
