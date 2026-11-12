import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Menu, X, Download, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Layout() {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { to: '/about', label: 'About' },
    { to: '/editorial-board', label: 'Editorial Board' },
    { to: '/current-issue', label: 'Current Issue' },
    { to: '/archives', label: 'Archives' },
    { to: '/policies', label: 'Policies' },
    { to: '/search', label: 'Search' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf8]">
      <div className="bg-[#08172f] text-[#dbe1eb] text-[11px] tracking-wide">
        <div className="max-w-[1160px] mx-auto px-8 flex items-center justify-between h-9">
          <span>Advancing knowledge across scientific frontiers</span>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-white transition-colors">About TJASF</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            {profile ? (
              <button onClick={handleSignOut} className="hover:text-white transition-colors">Sign out</button>
            ) : (
              <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
            )}
          </div>
        </div>
      </div>

      <header className="bg-[#fbfaf8] border-b border-[#e6e5e0] sticky top-0 z-50">
        <div className="max-w-[1160px] mx-auto px-8 flex items-center justify-between h-[92px] gap-10">
          <Link to="/" aria-label="TJASF home" className="brand">
            <img src="/assets/images/TJASF_logo_light.svg" alt="TJASF" />
          </Link>
          <button className="hidden max-md:block bg-none border-0 text-[#102342]" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className={`${menuOpen ? 'flex' : 'flex'} items-center gap-7 text-[13px] font-semibold text-[#27334a] max-md:hidden`}>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} viewTransition className={({ isActive }) => `hover:text-[#eb5526] transition-colors ${isActive ? 'text-[#eb5526]' : ''}`}>
                {item.label}
              </NavLink>
            ))}
            {profile && (
              <NavLink to="/dashboard" viewTransition className={({ isActive }) => `hover:text-[#eb5526] transition-colors ${isActive ? 'text-[#eb5526]' : ''}`}>
                Dashboard
              </NavLink>
            )}
            <a href="/assets/templates/TJASF_PaperTemplate.docx" download className="text-[#27334a] border-l border-[#d8d8d1] pl-7 flex items-center gap-2 hover:text-[#eb5526] transition-colors">
              <Download size={15} /> Download Template
            </a>
            <Link to="/dashboard/submit" className="text-[#eb5526] border-l border-[#d8d8d1] pl-7 flex items-center gap-2 hover:text-[#d7461c] transition-colors">
              Submit your paper <ArrowRight size={15} />
            </Link>
          </nav>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-[#e6e5e0] bg-[#fbfaf8] px-8 py-5 flex flex-col gap-4 text-sm font-semibold text-[#27334a]">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className="hover:text-[#eb5526]">
                {item.label}
              </NavLink>
            ))}
            {profile && (
              <NavLink to="/dashboard" onClick={() => setMenuOpen(false)} className="hover:text-[#eb5526]">Dashboard</NavLink>
            )}
            <a href="/assets/templates/TJASF_PaperTemplate.docx" download className="text-[#27334a] flex items-center gap-2 hover:text-[#eb5526] transition-colors">
              <Download size={15} /> Download Template
            </a>
            <Link to="/dashboard/submit" onClick={() => setMenuOpen(false)} className="text-[#eb5526]">Submit your paper</Link>
          </div>
        )}
      </header>

      <main key={location.pathname} className="flex-1 page-transition">
        <Outlet />
      </main>

      <footer className="bg-[#08172f] text-[#c5ceda] pt-[69px]">
        <div className="max-w-[1160px] mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 pb-16">
          <div className="col-span-2 md:col-span-1 footer-brand">
            <img src="/assets/images/TJASF_logo_light.svg" alt="TJASF" />
            <p className="text-xs text-[#8390a2] mt-4">The Journal of Advanced Scientific Frontiers.</p>
          </div>
          <div className="flex flex-col gap-3 text-xs">
            <strong className="text-white text-[11px] uppercase tracking-wider mb-2">Explore</strong>
            <Link to="/about" className="hover:text-white">About the journal</Link>
            <Link to="/current-issue" className="hover:text-white">Current Issue</Link>
            <Link to="/archives" className="hover:text-white">Issues &amp; archives</Link>
            <Link to="/search" className="hover:text-white">Search</Link>
          </div>
          <div className="flex flex-col gap-3 text-xs">
            <strong className="text-white text-[11px] uppercase tracking-wider mb-2">Publish with us</strong>
            <Link to="/dashboard/submit" className="hover:text-white">Submit a manuscript</Link>
            <Link to="/editorial-board" className="hover:text-white">Editorial Board</Link>
            <Link to="/join" className="hover:text-white">Join the Editorial Board</Link>
            <Link to="/policies" className="hover:text-white">Publication ethics</Link>
          </div>
          <div className="flex flex-col gap-3 text-xs">
            <strong className="text-white text-[11px] uppercase tracking-wider mb-2">Connect</strong>
            <Link to="/contact" className="hover:text-white">Contact us</Link>
            {profile ? (
              <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="hover:text-white">Sign in</Link>
                <Link to="/register" className="hover:text-white">Create an account</Link>
              </>
            )}
          </div>
        </div>

        {/* Social & Locale Bar (Elsevier style) */}
        <div className="max-w-[1160px] mx-auto px-8 pb-6 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-[#cad3e1]">
            <Globe size={15} className="text-[#8390a2]" />
            <span className="text-[12px] font-medium tracking-wide">Global &middot; Open Access</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://www.linkedin.com/company/the-journal-of-advanced-scientific-frontiers/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#cad3e1] hover:text-[#0a66c2] transition-colors p-1.5 rounded hover:bg-[#102342] flex items-center justify-center"
              aria-label="TJASF on LinkedIn"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom divider and copyright */}
        <div className="max-w-[1160px] mx-auto px-8 border-t border-[#263651] py-5 flex justify-between items-center text-[10px] text-[#748198] tracking-wide max-md:flex-col max-md:gap-2">
          <span>&copy; {new Date().getFullYear()} TJASF. All rights reserved.</span>
          <span>Open access &middot; Peer reviewed &middot; International</span>
        </div>
      </footer>
    </div>
  );
}
