import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f1ed] px-4">
      <div className="text-center max-w-[500px]">
        <div className="font-['Playfair_Display'] font-medium text-[120px] leading-none text-[#102342] tracking-tight">404</div>
        <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342] mt-4 mb-3">Page not found</h1>
        <p className="text-[#667082] text-lg mb-8">The page you're looking for doesn't exist or has been moved. Let's get you back on track.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] transition-colors">
          <Home size={18} /> Back to Home
        </Link>
      </div>
    </div>
  );
}
