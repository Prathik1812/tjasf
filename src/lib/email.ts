import { supabase } from '@/lib/supabase';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    return result;
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
}

// Helper to compile email from DB template or fallback to default
async function compileEmail(slug: string, variables: Record<string, string>, defaultSubject: string, defaultHtml: string) {
  try {
    const { data } = await supabase.from('email_templates').select('*').eq('slug', slug).maybeSingle();
    if (data) {
      let subject = data.subject;
      let body = data.body;

      Object.entries(variables).forEach(([key, val]) => {
        subject = subject.replaceAll(key, val);
        body = body.replaceAll(key, val);
      });

      const htmlBody = body.replace(/\n/g, '<br>');
      const html = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; padding: 24px; border-radius: 8px;">
          <h2 style="color: #102342; border-bottom: 2px solid #eb5526; padding-bottom: 8px;">${data.title}</h2>
          <div style="margin-top: 16px; font-size: 14px; color: #27334a;">
            ${htmlBody}
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #667082; border-top: 1px solid #f1f0ec; padding-top: 12px;">
            <strong>TJASF Editorial Office</strong><br><a href="https://www.tjasf.com">www.tjasf.com</a>
          </p>
        </div>
      `;
      return { subject, html };
    }
  } catch (err) {
    console.error('Error fetching template from DB, using fallback:', err);
  }
  return { subject: defaultSubject, html: defaultHtml };
}

// Submissions confirmation
export async function sendSubmissionEmail(authorName: string, authorEmail: string, manuscriptTitle: string, manuscriptId: string) {
  const fallbackHtml = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; padding: 24px; border-radius: 8px;">
      <h2 style="color: #102342; border-bottom: 2px solid #eb5526; padding-bottom: 8px;">Manuscript Submission Received</h2>
      <p>Dear ${authorName},</p>
      <p>Thank you for submitting your manuscript to <strong>The Journal of Advanced Scientific Frontiers (TJASF)</strong>.</p>
      <div style="background-color: #fbfaf8; border: 1px solid #e6e5e0; padding: 16px; margin: 16px 0; border-radius: 6px;">
        <p style="margin: 0;"><strong>Manuscript ID:</strong> ${manuscriptId}</p>
        <p style="margin: 4px 0 0 0;"><strong>Title:</strong> ${manuscriptTitle}</p>
      </div>
      <h3>Next Steps:</h3>
      <ol>
        <li><strong>Desk Screening:</strong> Our editorial board will review the submission for scope alignment, template compliance, and Turnitin plagiarism index limits (must be below 10%). This process takes approximately 1 week.</li>
        <li><strong>Peer Review:</strong> If the manuscript passes desk screening, it will be assigned to a Section Editor and sent to independent reviewers.</li>
      </ol>
      <p>You can monitor the status of your manuscript at any time by logging into the Author portal.</p>
      <p style="margin-top: 24px;">Kind regards,</p>
      <p><strong>TJASF Editorial Office</strong><br><a href="https://www.tjasf.com">www.tjasf.com</a></p>
    </div>
  `;
  const { subject, html } = await compileEmail(
    'submission_confirmation',
    { '{author_name}': authorName, '{manuscript_title}': manuscriptTitle, '{manuscript_id}': manuscriptId },
    `TJASF: Manuscript Received - ${manuscriptId}`,
    fallbackHtml
  );
  return sendEmail({ to: authorEmail, subject, html });
}

// Reviewer invitation
export async function sendReviewerInvitation(reviewerName: string, reviewerEmail: string, manuscriptTitle: string, manuscriptId: string, abstractText: string) {
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; padding: 24px; border-radius: 8px;">
      <h2 style="color: #102342; border-bottom: 2px solid #eb5526; padding-bottom: 8px;">Review Invitation</h2>
      <p>Dear Dr. ${reviewerName},</p>
      <p>Given your expertise, we would like to invite you to review the manuscript <strong>"${manuscriptTitle}"</strong> (${manuscriptId}) submitted to <strong>The Journal of Advanced Scientific Frontiers (TJASF)</strong>.</p>
      <div style="background-color: #fbfaf8; border: 1px solid #e6e5e0; padding: 16px; margin: 16px 0; border-radius: 6px;">
        <strong>Abstract Preview:</strong>
        <p style="margin: 8px 0 0 0; font-style: italic;">${abstractText}</p>
      </div>
      <p>Please log into your Reviewer Portal to accept or decline this invitation and download the manuscript.</p>
      <p style="margin-top: 24px;">Kind regards,</p>
      <p><strong>TJASF Editorial Office</strong><br><a href="https://www.tjasf.com">www.tjasf.com</a></p>
    </div>
  `;
  return sendEmail({
    to: reviewerEmail,
    subject: `TJASF: Invitation to Review Manuscript - ${manuscriptId}`,
    html
  });
}

// Decision alert
export async function sendDecisionEmail(authorName: string, authorEmail: string, manuscriptTitle: string, manuscriptId: string, decision: string, comments: string) {
  const isRevision = decision === 'revision_requested';
  const fallbackHtml = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; padding: 24px; border-radius: 8px;">
      <h2 style="color: #102342; border-bottom: 2px solid #eb5526; padding-bottom: 8px;">Editorial Decision Notification</h2>
      <p>Dear ${authorName},</p>
      <p>A decision has been reached regarding your manuscript <strong>"${manuscriptTitle}"</strong> (${manuscriptId}) submitted to <strong>The Journal of Advanced Scientific Frontiers (TJASF)</strong>.</p>
      <div style="background-color: #fbfaf8; border: 1px solid #e6e5e0; padding: 16px; margin: 16px 0; border-radius: 6px;">
        <p style="margin: 0;"><strong>Decision:</strong> <span style="text-transform: uppercase; font-weight: bold; color: ${decision.toLowerCase() === 'accepted' || decision.toLowerCase() === 'published' ? 'green' : 'red'}">${decision.replace(/_/g, ' ')}</span></p>
      </div>
      ${comments ? `
        <div style="margin: 16px 0;">
          <strong>Comments / Feedback:</strong>
          <pre style="white-space: pre-wrap; font-family: sans-serif; margin-top: 8px;">${comments}</pre>
        </div>
      ` : ''}
      <p>Please log into your Author portal to view details and check the next steps.</p>
      <p style="margin-top: 24px;">Kind regards,</p>
      <p><strong>TJASF Editorial Board</strong><br><a href="https://www.tjasf.com">www.tjasf.com</a></p>
    </div>
  `;
  const { subject, html } = await compileEmail(
    isRevision ? 'decision_revision' : 'decision_rejection',
    { '{author_name}': authorName, '{manuscript_title}': manuscriptTitle, '{manuscript_id}': manuscriptId },
    `TJASF: Editorial Decision - ${manuscriptId}`,
    fallbackHtml
  );
  return sendEmail({ to: authorEmail, subject, html });
}

// Reviewer acceptance notification to editorial office
export async function sendReviewerAcceptedNotification(reviewerName: string, manuscriptTitle: string, manuscriptId: string) {
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; padding: 24px; border-radius: 8px;">
      <h2 style="color: #102342; border-bottom: 2px solid #eb5526; padding-bottom: 8px;">Reviewer Accepted Invitation</h2>
      <p>Dear Editor,</p>
      <p>This is to notify you that reviewer <strong>${reviewerName}</strong> has accepted the invitation to review the following manuscript:</p>
      <div style="background-color: #fbfaf8; border: 1px solid #e6e5e0; padding: 16px; margin: 16px 0; border-radius: 6px;">
        <p style="margin: 0;"><strong>Manuscript ID:</strong> ${manuscriptId}</p>
        <p style="margin: 4px 0 0 0;"><strong>Title:</strong> ${manuscriptTitle}</p>
      </div>
      <p>The status of this review has been updated to <strong>In Progress</strong> in your editor dashboard.</p>
      <p style="margin-top: 24px;">Kind regards,</p>
      <p><strong>TJASF System Notification</strong><br><a href="https://www.tjasf.com">www.tjasf.com</a></p>
    </div>
  `;
  return sendEmail({
    to: 'editorial@tjasf.com',
    subject: `TJASF: Reviewer Accepted Invitation - ${manuscriptId}`,
    html
  });
}

// Editor assignment notification
export async function sendEditorAssignmentEmail(editorName: string, editorEmail: string, manuscriptTitle: string, manuscriptId: string) {
  const fallbackHtml = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; padding: 24px; border-radius: 8px;">
      <h2 style="color: #102342; border-bottom: 2px solid #eb5526; padding-bottom: 8px;">Manuscript Assignment Notification</h2>
      <p>Dear ${editorName},</p>
      <p>You have been assigned as the editor for the manuscript <strong>"${manuscriptTitle}"</strong> (${manuscriptId}) submitted to <strong>The Journal of Advanced Scientific Frontiers (TJASF)</strong>.</p>
      <p>Please log into your Editor Portal to evaluate the manuscript, verify details, and assign reviewers.</p>
      <p style="margin-top: 24px;">Kind regards,</p>
      <p><strong>TJASF Editorial Office</strong><br><a href="https://www.tjasf.com">www.tjasf.com</a></p>
    </div>
  `;
  const { subject, html } = await compileEmail(
    'editor_assignment',
    { '{editor_name}': editorName, '{manuscript_title}': manuscriptTitle, '{manuscript_id}': manuscriptId },
    `TJASF: Manuscript Assigned to You - ${manuscriptId}`,
    fallbackHtml
  );
  return sendEmail({ to: editorEmail, subject, html });
}

// Reviewer reminder notification
export async function sendReviewReminderEmail(reviewerName: string, reviewerEmail: string, manuscriptTitle: string, manuscriptId: string, dueDate: string) {
  const fallbackHtml = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; padding: 24px; border-radius: 8px;">
      <h2 style="color: #102342; border-bottom: 2px solid #eb5526; padding-bottom: 8px;">Review Deadline Reminder</h2>
      <p>Dear Dr. ${reviewerName},</p>
      <p>This is a friendly reminder that your peer-review report for the manuscript <strong>"${manuscriptTitle}"</strong> (${manuscriptId}) is due soon.</p>
      <div style="background-color: #fbfaf8; border: 1px solid #e6e5e0; padding: 16px; margin: 16px 0; border-radius: 6px;">
        <p style="margin: 0;"><strong>Manuscript ID:</strong> ${manuscriptId}</p>
        <p style="margin: 4px 0 0 0;"><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-GB')}</p>
      </div>
      <p>Please log into your Reviewer Portal to access the manuscript files and submit your evaluation report.</p>
      <p>If you need an extension or have any questions, please reply directly to this email.</p>
      <p style="margin-top: 24px;">Kind regards,</p>
      <p><strong>TJASF Editorial Office</strong><br><a href="https://www.tjasf.com">www.tjasf.com</a></p>
    </div>
  `;
  const { subject, html } = await compileEmail(
    'reviewer_reminder',
    { '{reviewer_name}': reviewerName, '{manuscript_title}': manuscriptTitle, '{manuscript_id}': manuscriptId, '{due_date}': new Date(dueDate).toLocaleDateString('en-GB') },
    `TJASF: Urgent Reminder for Manuscript Review - ${manuscriptId}`,
    fallbackHtml
  );
  return sendEmail({ to: reviewerEmail, subject, html });
}

// Co-Author consent notification
export async function sendCoAuthorConsentEmail(coAuthorName: string, coAuthorEmail: string, manuscriptTitle: string, authorRecordId: string, submitterName: string) {
  const consentUrl = `${window.location.origin}/co-author-consent?id=${authorRecordId}`;
  const fallbackHtml = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; padding: 24px; border-radius: 8px;">
      <h2 style="color: #102342; border-bottom: 2px solid #eb5526; padding-bottom: 8px;">Co-Author Verification Request</h2>
      <p>Dear ${coAuthorName},</p>
      <p>We are writing to inform you that <strong>${submitterName}</strong> has submitted a manuscript entitled <strong>"${manuscriptTitle}"</strong> to <strong>The Journal of Advanced Scientific Frontiers (TJASF)</strong> and has listed you as a co-author.</p>
      <p>To comply with academic publishing ethics and ensure all listed authors have consented to this submission, please verify your authorship by clicking the button below:</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${consentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #eb5526; color: white; text-decoration: none; font-weight: bold; border-radius: 6px;">Verify Authorship Consent</a>
      </div>
      <p>If you did not contribute to this work or do not consent to being listed, you can decline by opening the link and clicking "Decline" or by replying directly to this email.</p>
      <p style="margin-top: 24px;">Kind regards,</p>
      <p><strong>TJASF Editorial Office</strong><br><a href="https://www.tjasf.com">www.tjasf.com</a></p>
    </div>
  `;
  const { subject, html } = await compileEmail(
    'coauthor_consent',
    { '{coauthor_name}': coAuthorName, '{submitter_name}': submitterName, '{manuscript_title}': manuscriptTitle, '{consent_link}': `<a href="${consentUrl}">${consentUrl}</a>` },
    `TJASF: Verification of Authorship Consent for "${manuscriptTitle.substring(0, 40)}..."`,
    fallbackHtml
  );
  return sendEmail({ to: coAuthorEmail, subject, html });
}
