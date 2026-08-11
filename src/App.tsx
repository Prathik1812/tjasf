import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import DashboardLayout from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

import HomePage from '@/pages/public/HomePage';
import AboutPage from '@/pages/public/AboutPage';
import EditorialBoardPage from '@/pages/public/EditorialBoardPage';
import PoliciesPage from '@/pages/public/PoliciesPage';
import CurrentIssuePage from '@/pages/public/CurrentIssuePage';
import ArchivesPage from '@/pages/public/ArchivesPage';
import SearchPage from '@/pages/public/SearchPage';
import ContactPage from '@/pages/public/ContactPage';
import ArticleDetailPage from '@/pages/public/ArticleDetailPage';
import IssueDetailPage from '@/pages/public/IssueDetailPage';
import JoinUsPage from '@/pages/public/JoinUsPage';

import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

import DashboardHome from '@/pages/dashboard/DashboardHome';
import MyManuscripts from '@/pages/dashboard/MyManuscripts';
import SubmitManuscriptPage from '@/pages/dashboard/SubmitManuscriptPage';
import MyReviewsPage from '@/pages/dashboard/MyReviewsPage';
import ReviewDetailPage from '@/pages/dashboard/ReviewDetailPage';
import EditorWorkspacePage from '@/pages/dashboard/EditorWorkspacePage';
import ManuscriptEditorPage from '@/pages/dashboard/ManuscriptEditorPage';

import ManageUsersPage from '@/pages/admin/ManageUsersPage';
import ManageDomainsPage from '@/pages/admin/ManageDomainsPage';
import ManageEditorialBoardPage from '@/pages/admin/ManageEditorialBoardPage';
import ManageIssuesPage from '@/pages/admin/ManageIssuesPage';
import ManagePoliciesPage from '@/pages/admin/ManagePoliciesPage';
import ManageAnnouncementsPage from '@/pages/admin/ManageAnnouncementsPage';
import ManageHomepagePage from '@/pages/admin/ManageHomepagePage';

import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public site */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/editorial-board" element={<EditorialBoardPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/policies/:slug" element={<PoliciesPage />} />
            <Route path="/current-issue" element={<CurrentIssuePage />} />
            <Route path="/archives" element={<ArchivesPage />} />
            <Route path="/issue/:id" element={<IssueDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/article/:id" element={<ArticleDetailPage />} />
            <Route path="/join" element={<JoinUsPage />} />
          </Route>

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Dashboard */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/dashboard/manuscripts" element={<MyManuscripts />} />
              <Route path="/dashboard/reviews" element={<MyReviewsPage />} />
              <Route path="/dashboard/reviews/:id" element={<ReviewDetailPage />} />
              <Route path="/dashboard/editor" element={<EditorWorkspacePage />} />
              <Route path="/dashboard/editor/:id" element={<ManuscriptEditorPage />} />
              
              {/* Submit (author/reviewer/editor/admin only) */}
              <Route element={<ProtectedRoute allowedRoles={['author', 'reviewer', 'section_editor', 'managing_editor', 'editor_in_chief', 'admin']} />}>
                <Route path="/dashboard/submit" element={<SubmitManuscriptPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/dashboard/admin/users" element={<ManageUsersPage />} />
                <Route path="/dashboard/admin/domains" element={<ManageDomainsPage />} />
                <Route path="/dashboard/admin/editorial-board" element={<ManageEditorialBoardPage />} />
                <Route path="/dashboard/admin/issues" element={<ManageIssuesPage />} />
                <Route path="/dashboard/admin/policies" element={<ManagePoliciesPage />} />
                <Route path="/dashboard/admin/announcements" element={<ManageAnnouncementsPage />} />
                <Route path="/dashboard/admin/homepage" element={<ManageHomepagePage />} />
              </Route>
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
