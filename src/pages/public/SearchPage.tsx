import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Article } from '@/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from('articles')
      .select('*')
      .or(`title.ilike.%${query}%,authors.ilike.%${query}%,abstract.ilike.%${query}%,domain.ilike.%${query}%`)
      .order('publication_date', { ascending: false });
    setResults((data as Article[]) || []);
    setLoading(false);
  };

  const fastFilters = [
    'Physical Sciences',
    'Computational Science',
    'Environmental Systems',
    'Engineering',
    'Social Sciences',
    'Management'
  ];

  const handleFastFilter = async (filter: string) => {
    setQuery(filter);
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from('articles')
      .select('*')
      .or(`title.ilike.%${filter}%,authors.ilike.%${filter}%,abstract.ilike.%${filter}%,domain.ilike.%${filter}%`)
      .order('publication_date', { ascending: false });
    setResults((data as Article[]) || []);
    setLoading(false);
  };

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-20">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Search</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-8">
        Search the TJASF archive.
      </h1>
      <form onSubmit={handleSearch} className="flex items-center bg-white border border-[#e6e5e0] rounded-lg pl-4 h-14 mb-4 max-w-[600px]">
        <SearchIcon size={20} className="text-[#7d8792] mr-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, or keyword..."
          className="flex-1 border-0 outline-none text-sm bg-transparent"
        />
        <button type="submit" className="h-14 bg-[#102342] text-white px-6 text-xs font-bold rounded-r-lg hover:bg-[#1d3556]">
          Search
        </button>
      </form>

      {/* Fast filters */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          {fastFilters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleFastFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                query === f ? 'bg-[#eb5526] border-[#eb5526] text-white' : 'bg-white border-[#e6e5e0] text-[#667082] hover:bg-[#f1f0ec] hover:text-[#102342]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-[#667082]">Searching...</p>}

      {searched && !loading && (
        <div>
          <p className="text-sm text-[#667082] mb-6">{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>
          {results.length === 0 ? (
            <div className="bg-[#f1f0ec] rounded-lg p-12 text-center">
              <p className="text-[#667082] text-lg">No articles found matching your search.</p>
              <p className="text-[#667082] text-sm mt-2">Try different keywords or browse the archives.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((a) => (
                <Link key={a.id} to={`/article/${a.id}`} className="block bg-white rounded-lg border border-[#e6e5e0] p-6 hover:shadow-lg transition-shadow">
                  <div className="text-xs text-[#eb5526] font-bold uppercase tracking-wide mb-2">{a.domain || 'Research'}</div>
                  <h2 className="font-['Playfair_Display'] font-medium text-xl text-[#102342] mb-1">{a.title}</h2>
                  <p className="text-sm text-[#667082] mb-2">{a.authors}</p>
                  <p className="text-sm text-[#667082] line-clamp-2">{a.abstract}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="bg-[#f1f0ec] rounded-lg p-12 text-center">
          <p className="text-[#667082] text-lg">Start searching above.</p>
          <p className="text-[#667082] text-sm mt-2">Search by article title, author name, or research keyword.</p>
        </div>
      )}
    </div>
  );
}
