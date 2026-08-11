import { Link } from 'react-router-dom';

export default function ArchivesPage() {
  return (
    <div className="max-w-[1160px] mx-auto px-8 py-20">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Archives</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-4">
        Issues &amp; Archives.
      </h1>
      <p className="text-[#667082] text-lg max-w-[700px] mb-12">
        Browse all published volumes and issues of TJASF. Click any issue to view its table of contents.
      </p>

      <div className="bg-[#fcfbfa] border border-[#e6e5e0] rounded-lg p-12 text-center max-w-[700px] mx-auto shadow-sm">
        <p className="font-['Playfair_Display'] text-[#102342] text-xl font-medium mb-3">No Archives Available</p>
        <p className="text-[#667082] text-sm leading-relaxed mb-6">
          The Journal of Advanced Scientific Frontiers (TJASF) has recently launched its inaugural volume. Archived issues will appear here in the future as full volumes and issues are completed and published.
        </p>
        <Link to="/search" className="inline-block px-5 py-3 bg-[#102342] text-white text-xs font-bold rounded-lg hover:bg-[#eb5526] transition-colors shadow-sm">
          Browse Forthcoming Articles
        </Link>
      </div>
    </div>
  );
}
