import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Policy } from '@/types';

function parseMarkdown(text: string) {
  if (!text) return '';
  const rawLines = text.replace(/\r/g, '').split('\n');
  
  // Pre-process to merge table rows that were wrapped/split across multiple lines
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();
    if (line.startsWith('|') && !line.endsWith('|')) {
      while (i + 1 < rawLines.length) {
        i++;
        const nextLine = rawLines[i].trim();
        line += ' ' + nextLine;
        if (nextLine.endsWith('|')) {
          break;
        }
      }
    }
    lines.push(line);
  }

  const elements: React.ReactNode[] = [];
  let key = 0;
  let inList = false;
  let listItems: React.ReactNode[] = [];

  let inTable = false;
  let tableHeaders: React.ReactNode[] = [];
  let tableRows: React.ReactNode[] = [];

  const parseInline = (lineText: string) => {
    const brParts = lineText.split('<br>');
    return brParts.map((subText, subIdx) => {
      const parts = subText.split('**');
      const inlineElements = parts.map((part, index) => {
        if (index % 2 === 1) {
          return <strong key={index} className="font-bold text-[#102342]">{part}</strong>;
        }
        return part;
      });
      return (
        <span key={subIdx}>
          {inlineElements}
          {subIdx < brParts.length - 1 && <br />}
        </span>
      );
    });
  };

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${key++}`} className="list-disc pl-5 my-4 space-y-2 text-[#27334a]">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable) {
      elements.push(
        <div key={`table-${key++}`} className="overflow-x-auto my-6 rounded-lg border border-[#e6e5e0] shadow-sm">
          <table className="min-w-full border-collapse">
            {tableHeaders.length > 0 && (
              <thead className="bg-[#08172f] text-white">
                <tr>{tableHeaders}</tr>
              </thead>
            )}
            <tbody className="bg-white text-sm text-[#27334a]">
              {tableRows}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      if (line.includes('---')) {
        continue;
      }
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (!inTable) {
        inTable = true;
        tableHeaders = cells.map((cell, idx) => (
          <th key={idx} className="border border-[#e6e5e0] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center bg-[#08172f] text-white">
            {parseInline(cell)}
          </th>
        ));
      } else {
        tableRows.push(
          <tr key={key++} className="hover:bg-[#fbfaf8] transition-colors odd:bg-white even:bg-[#fbfaf8]/40">
            {cells.map((cell, idx) => (
              <td key={idx} className="border border-[#e6e5e0] px-6 py-4 text-center leading-relaxed">
                {parseInline(cell)}
              </td>
            ))}
          </tr>
        );
      }
    } else {
      flushTable();
      if (line.startsWith('###')) {
        flushList();
        elements.push(
          <h3 key={key++} className="font-['Playfair_Display'] font-semibold text-lg text-[#102342] mt-6 mb-2">
            {parseInline(line.replace(/^###\s*/, ''))}
          </h3>
        );
      } else if (line.startsWith('##')) {
        flushList();
        elements.push(
          <h2 key={key++} className="font-['Playfair_Display'] font-semibold text-xl text-[#102342] mt-8 mb-3 border-b border-[#e6e5e0] pb-2">
            {parseInline(line.replace(/^##\s*/, ''))}
          </h2>
        );
      } else if (line.startsWith('#')) {
        flushList();
        elements.push(
          <h1 key={key++} className="font-['Playfair_Display'] font-semibold text-2xl text-[#102342] mt-10 mb-4">
            {parseInline(line.replace(/^#\s*/, ''))}
          </h1>
        );
      } else if (line.startsWith('-') || line.startsWith('*')) {
        inList = true;
        listItems.push(
          <li key={key++} className="text-sm text-[#27334a] leading-relaxed">
            {parseInline(line.replace(/^[-*]\s*/, ''))}
          </li>
        );
      } else if (/^\d+\.\s*/.test(line)) {
        flushList();
        const itemText = line.replace(/^\d+\.\s*/, '');
        elements.push(
          <div key={key++} className="pl-4 my-2 text-sm text-[#27334a] leading-relaxed flex gap-2">
            <span className="font-bold text-[#eb5526]">{line.match(/^\d+\./)?.[0]}</span>
            <span>{parseInline(itemText)}</span>
          </div>
        );
      } else if (line === '') {
        flushList();
      } else {
        flushList();
        elements.push(
          <p key={key++} className="text-sm text-[#27334a] leading-[1.7] mb-4">
            {parseInline(lines[i].trim())}
          </p>
        );
      }
    }
  }
  flushList();
  flushTable();
  return elements;
}

export default function PoliciesPage() {
  const { slug } = useParams();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('policies')
        .select('*')
        .order('category', { ascending: true });
      if (data) {
        setPolicies(data as Policy[]);
        const activeSlug = slug || (data as Policy[])[0]?.slug;
        if (activeSlug) {
          const found = (data as Policy[]).find((p) => p.slug === activeSlug);
          if (found) setActivePolicy(found);
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  const categories = Array.from(new Set(policies.map((p) => p.category))).sort();

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-20">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Policies</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-4">
        Publication policies &amp; ethics.
      </h1>
      <p className="text-[#667082] text-lg max-w-[700px] mb-12">
        TJASF is committed to the highest standards of publication ethics. Our policies ensure transparency, integrity, and fairness throughout the editorial process.
      </p>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : policies.length === 0 ? (
        <div className="bg-[#f1f0ec] rounded-lg p-12 text-center">
          <p className="text-[#667082] text-lg">Policies will be published here soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
          <aside className="md:sticky md:top-28 self-start">
            {categories.map((cat) => (
              <div key={cat} className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#102342] mb-2">{cat}</h3>
                <div className="flex flex-col gap-1">
                  {policies.filter((p) => p.category === cat).map((p) => (
                    <Link
                      key={p.id}
                      to={`/policies/${p.slug}`}
                      className={`text-sm py-1.5 px-3 rounded transition-colors ${
                        activePolicy?.id === p.id ? 'bg-[#eb5526] text-white font-semibold' : 'text-[#667082] hover:bg-[#f1f0ec]'
                      }`}
                    >
                      {p.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-8 bg-white border border-[#e6e5e0] rounded-lg p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#102342] mb-2">Author Template</h4>
              <p className="text-xs text-[#667082] mb-4">Please download and use our official Word template to format your manuscript before submission.</p>
              <a
                href="/assets/templates/TJASF_Paper_Template.docx"
                download
                className="inline-flex w-full justify-center items-center gap-1.5 px-4 py-2.5 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c] transition-colors text-center font-semibold"
              >
                Download Template (.docx)
              </a>
            </div>
          </aside>
          <div className="min-w-0">
            {activePolicy ? (
              <div className="bg-white rounded-lg border border-[#e6e5e0] p-8 shadow-sm">
                <h2 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342] mb-2">{activePolicy.title}</h2>
                <p className="text-xs text-[#667082] mb-6">
                  Last updated: {new Date(activePolicy.last_updated).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <div className="prose prose-lg max-w-none text-[#27334a] leading-[1.7]">
                  {parseMarkdown(activePolicy.content)}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#e6e5e0] p-8 shadow-sm">
                <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-4">Select a policy to read</h2>
                <p className="text-[#667082]">Browse our policies using the menu on the left. Click any policy title to read the full text.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
