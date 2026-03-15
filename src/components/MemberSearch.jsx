import { useState, useRef, useCallback } from 'react';
import { useMembers } from '../hooks/useMembers';
import { IconSearch } from './Icons';

export default function MemberSearch({ onSelect, placeholder = 'Search by name, phone, or ID...' }) {
  const { searchMembers } = useMembers();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef(null);

  const handleSearch = useCallback((value) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const data = await searchMembers(value);
      setResults(data);
      setShowResults(true);
    }, 300);
  }, [searchMembers]);

  const handleSelect = (member) => {
    setQuery(member.name);
    setShowResults(false);
    onSelect?.(member);
  };

  return (
    <div className="relative">
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition"
        />
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#1e2130] border border-[#2d3148] rounded-lg shadow-xl max-h-60 overflow-y-auto animate-slide-in">
          {results.map((member) => (
            <button
              key={member.member_id}
              onClick={() => handleSelect(member)}
              className="w-full px-4 py-3 text-left hover:bg-[#262a3a] border-b border-[#2d3148] last:border-0 transition-colors"
            >
              <div className="font-medium text-sm text-white">{member.name}</div>
              <div className="text-[11px] text-slate-500">
                {member.member_id} • {member.phone_number}
              </div>
            </button>
          ))}
        </div>
      )}
      {showResults && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-[#1e2130] border border-[#2d3148] rounded-lg shadow-xl p-4 text-sm text-slate-500 text-center animate-slide-in">
          No members found
        </div>
      )}
    </div>
  );
}
