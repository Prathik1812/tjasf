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

// Submissions confirmation
export async function sendSubmissionEmail(authorName: string, authorEmail: string, manuscriptTitle: string, manuscriptId: string) {
  const html = `
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
  return sendEmail({
    to: authorEmail,
    subject: `TJASF: Manuscript Received - ${manuscriptId}`,
    html
  });
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
  const html = `
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
  return sendEmail({
    to: authorEmail,
    subject: `TJASF: Editorial Decision - ${manuscriptId}`,
    html
  });
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
