import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function StudentsGrid() {
  const [students, setStudents] = useState(null);

  useEffect(() => {
    supabase
      .from('students')
      .select('id, slug, full_name, headline, goal, avatar_url, city')
      .order('sort_order', { ascending: true })
      .order('full_name', { ascending: true })
      .then(({ data }) => setStudents(data || []));
  }, []);

  if (students === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full">
        <div className="text-center mb-10 mt-4">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
            <GraduationCap size={16} /> Summer 2026 Cohort
          </p>
          <h1 className="text-3xl sm:text-4xl uppercase">Meet the Students</h1>
          <p className="text-[#5C5C5C] mt-3 max-w-xl mx-auto">
            Eight Saturdays, twenty seats. These are the makers building their
            portfolios, one week at a time.
          </p>
        </div>

        {students.length === 0 ? (
          <p className="text-center text-[#5C5C5C] italic">The cohort roster is coming soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 pb-10">
            {students.map((s) => (
              <Link
                key={s.id}
                to={`/${s.slug}`}
                className="glass-panel flex flex-col items-center text-center !p-6 hover:-translate-y-1 hover:shadow-lg hover:border-[#3E9E28]/50 transition-all"
              >
                <div className="w-24 h-24 rounded-full bg-[#F4F4F2] border-4 border-[#3E9E28]/30 overflow-hidden flex items-center justify-center text-3xl font-bold text-[#3E9E28] mb-4">
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover" />
                    : (s.full_name?.[0]?.toUpperCase() || '?')}
                </div>
                <h2 className="text-lg">{s.full_name}</h2>
                <p className="text-sm text-[#3E9E28] font-semibold mt-1">
                  {s.headline || 'AI Maker — Summer 2026 Cohort'}
                </p>
                {s.city && <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{s.city}</p>}
                {s.goal && (
                  <p className="text-sm text-[#5C5C5C] mt-3 line-clamp-3">{s.goal}</p>
                )}
                <span className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/40">
                  View profile →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
