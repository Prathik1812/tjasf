import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Layout() {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

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
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `hover:text-[#eb5526] transition-colors ${isActive ? 'text-[#eb5526]' : ''}`}>
                {item.label}
              </NavLink>
            ))}
            {profile && (
              <NavLink to="/dashboard" className={({ isActive }) => `hover:text-[#eb5526] transition-colors ${isActive ? 'text-[#eb5526]' : ''}`}>
                Dashboard
              </NavLink>
            )}
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
            <Link to="/dashboard/submit" onClick={() => setMenuOpen(false)} className="text-[#eb5526]">Submit your paper</Link>
          </div>
        )}
      </header>

      <main className="flex-1">
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
        <div className="max-w-[1160px] mx-auto px-8 border-t border-[#263651] py-5 flex justify-between text-[10px] text-[#748198] tracking-wide max-md:flex-col max-md:gap-2">
          <span>&copy; 2026 TJASF. All rights reserved.</span>
          <span>Open access &middot; Peer reviewed &middot; International</span>
        </div>
      </footer>
    </div>
  );
}
