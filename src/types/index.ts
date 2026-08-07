export type UserRole =
  | 'author'
  | 'reviewer'
  | 'section_editor'
  | 'managing_editor'
  | 'editor_in_chief'
  | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  title: string;
  affiliation: string;
  department: string;
  orcid: string;
  bio: string;
  avatar_url: string;
  reviewer_domains: string[];
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
}

export interface EditorialBoardMember {
  id: string;
  name: string;
  role_title: string;
  affiliation: string;
  domain: string;
  bio: string;
  photo_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type ManuscriptStatus =
  | 'draft'
  | 'submitted'
  | 'technical_screening'
  | 'desk_review'
  | 'under_review'
  | 'revision_requested'
  | 'accepted'
  | 'rejected'
  | 'published';

export interface Manuscript {
  id: string;
  submitter_id: string;
  title: string;
  abstract: string;
  keywords: string[];
  reference_text: string;
  domain_id: string | null;
  status: ManuscriptStatus;
  file_url: string;
  file_name: string;
  conflict_of_interest: boolean;
  funding_received: boolean;
  ai_used: boolean;
  previously_submitted: boolean;
  original_work: boolean;
  copyright_agreement: boolean;
  policies_agreement: boolean;
  editor_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ManuscriptAuthor {
  id: string;
  manuscript_id: string;
  name: string;
  email: string;
  corresponding: boolean;
  affiliation: string;
  department: string;
  sort_order: number;
}

export type ReviewStatus =
  | 'pending_invitation'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'submitted';

export type ReviewDecision =
  | 'accept'
  | 'minor_revision'
  | 'major_revision'
  | 'reject';

export interface Review {
  id: string;
  manuscript_id: string;
  reviewer_id: string;
  status: ReviewStatus;
  decision: ReviewDecision | null;
  comments: string;
  confidential_notes: string;
  due_date: string | null;
  invited_at: string;
  responded_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface Volume {
  id: string;
  number: number;
  year: number;
  title: string;
  created_at: string;
}

export interface Issue {
  id: string;
  volume_id: string;
  number: number;
  title: string;
  publication_date: string | null;
  cover_url: string;
  is_published: boolean;
  created_at: string;
}

export interface Article {
  id: string;
  manuscript_id: string | null;
  issue_id: string | null;
  title: string;
  authors: string;
  abstract: string;
  keywords: string[];
  reference_text: string;
  domain: string;
  doi: string;
  pdf_url: string;
  pages: string;
  article_id: string | null;
  publication_date: string;
  views: number;
  created_at: string;
}

export interface Policy {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  last_updated: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  pinned: boolean;
  created_at: string;
}

export interface HomepageContent {
  key: string;
  value: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  event: string;
  subject: string;
  body: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: string;
  ip: string;
  created_at: string;
}
