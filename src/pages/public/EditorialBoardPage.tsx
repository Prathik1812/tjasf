import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CustomBoardMember {
  id?: string;
  name: string;
  role_title?: string;
  designation?: string;
  institution: string;
  email: string;
  country: string;
}

const DEFAULT_EDITOR_IN_CHIEF: CustomBoardMember = {
  name: 'Dr. Rajesh Thumma',
  role_title: 'Editor in Chief',
  designation: 'Associate Professor',
  institution: 'Anurag University',
  email: 'editor@tjasf.com',
  country: 'India'
};

const DEFAULT_BOARD_MEMBERS: CustomBoardMember[] = [
  {
    name: 'Dr. Veera Venkata Subrahmanya Kumar Bhajana',
    role_title: 'Editorial Board Member',
    designation: 'Associate Professor',
    institution: 'Kalinga Institute of Industrial Technology (KIIT) Deemed to be University',
    email: 'bvvs.kumarfet@kiit.ac.in',
    country: 'India'
  },
  {
    name: 'Dr. Amrit Mukherjee',
    role_title: 'Editorial Board Member',
    designation: 'Senior Assistant Professor',
    institution: 'University of South Bohemia',
    email: 'amukherjee@jcu.cz',
    country: 'Czech Republic'
  },
  {
    name: 'Dr. A. Pramod Kumar',
    role_title: 'Editorial Board Member',
    designation: 'Associate Professor',
    institution: 'NIT Andhra Pradesh',
    email: 'a.pramodkumar@cmrec.ac.in',
    country: 'India'
  },
  {
    name: 'Dr. Abdul Aleem',
    role_title: 'Editorial Board Member',
    designation: 'Assistant Professor',
    institution: 'Vidya Jyothi Institute of Technology',
    email: 'aleemece@vjit.ac.in',
    country: 'India'
  }
];

const DEFAULT_MANAGING_EDITOR: CustomBoardMember = {
  name: 'B Prathik Kumar',
  role_title: 'Managing Editor',
  institution: 'Anurag University',
  email: 'editorial@tjasf.com',
  country: 'India'
};

export default function EditorialBoardPage() {
  const [editorInChief, setEditorInChief] = useState<CustomBoardMember>(DEFAULT_EDITOR_IN_CHIEF);
  const [boardMembers, setBoardMembers] = useState<CustomBoardMember[]>(DEFAULT_BOARD_MEMBERS);
  const [managingEditor, setManagingEditor] = useState<CustomBoardMember>(DEFAULT_MANAGING_EDITOR);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('editorial_board')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (data && data.length > 0) {
          const eic = data.find(m => m.role_title?.toLowerCase().includes('chief'));
          const me = data.find(m => m.name?.toLowerCase().includes('prathik'));
          const membersList = data.filter(m => 
            !m.role_title?.toLowerCase().includes('chief') && 
            !m.name?.toLowerCase().includes('prathik') &&
            !m.name?.toLowerCase().includes('vivek')
          );

          if (eic) {
            setEditorInChief({
              name: eic.name,
              role_title: eic.role_title,
              designation: eic.designation || 'Associate Professor',
              institution: eic.affiliation,
              email: eic.email || 'editor@tjasf.com',
              country: eic.country || 'India'
            });
          }

          if (me) {
            setManagingEditor({
              name: 'B Prathik Kumar',
              role_title: 'Managing Editor',
              institution: me.affiliation || 'Anurag University',
              email: me.email || 'editorial@tjasf.com',
              country: me.country || 'India'
            });
          }

          if (membersList.length > 0) {
            setBoardMembers(membersList.map(m => ({
              id: m.id,
              name: m.name,
              role_title: 'Editorial Board Member',
              designation: m.designation || 'Faculty Member',
              institution: m.affiliation,
              email: m.email || '',
              country: m.country || 'India'
            })));
          }
        }
      } catch (err) {
        console.error('Error fetching editorial board from DB:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderCard = (m: CustomBoardMember) => (
    <div key={m.name} className="bg-white rounded-lg border border-[#e6e5e0] p-6 shadow-sm hover:shadow-md transition-all space-y-2">
      <div className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl mb-3 border-b border-[#f1f0ec] pb-2 flex items-center justify-between">
        <span>{m.name}</span>
      </div>
      
      {m.designation && (
        <div className="text-xs text-[#27334a]">
          <span className="font-semibold text-[#667082]">Designation: </span>
          <span className="font-medium text-[#102342]">{m.designation}</span>
        </div>
      )}
      
      <div className="text-xs text-[#27334a]">
        <span className="font-semibold text-[#667082]">Institution: </span>
        <span className="font-medium text-[#102342]">{m.institution}</span>
      </div>
      
      <div className="text-xs text-[#27334a]">
        <span className="font-semibold text-[#667082]">Email ID: </span>
        <a href={`mailto:${m.email}`} className="font-medium text-[#eb5526] hover:underline font-mono">{m.email}</a>
      </div>
      
      <div className="text-xs text-[#27334a]">
        <span className="font-semibold text-[#667082]">Country: </span>
        <span className="font-medium text-[#102342]">{m.country}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-16">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-3">Editorial Board</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,52px)] leading-[1.08] text-[#102342] mb-4">
        The people behind the journal.
      </h1>
      <p className="text-[#667082] text-base max-w-[700px] mb-12 leading-relaxed">
        Our editorial board comprises distinguished researchers and academics from institutions around the world, committed to maintaining the highest standards of peer review and scientific integrity.
      </p>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : (
        <div className="space-y-14">
          {/* SECTION 1: Editor in Chief */}
          <div>
            <h2 className="font-['Playfair_Display'] font-semibold text-2xl text-[#102342]">
              Editor in Chief
            </h2>
            <hr className="border-t-2 border-[#102342]/10 mt-2 mb-6" />
            <div className="max-w-md">
              {renderCard(editorInChief)}
            </div>
          </div>

          {/* SECTION 2: Editorial Board Members */}
          <div>
            <h2 className="font-['Playfair_Display'] font-semibold text-2xl text-[#102342]">
              Editorial Board Members
            </h2>
            <hr className="border-t-2 border-[#102342]/10 mt-2 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {boardMembers.map((m) => renderCard(m))}
            </div>
          </div>

          {/* SECTION 3: Managing Editor */}
          <div>
            <h2 className="font-['Playfair_Display'] font-semibold text-2xl text-[#102342]">
              Managing Editor
            </h2>
            <hr className="border-t-2 border-[#102342]/10 mt-2 mb-6" />
            <div className="max-w-md">
              {renderCard(managingEditor)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
