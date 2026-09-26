import React from 'react';
import { ArrowDownAZ, ArrowUpZA, ArrowDownWideNarrow, ArrowUpNarrowWide, SlidersHorizontal } from 'lucide-react';
import { SortField, SortDirection } from '../lib/trackUtils';

interface SortBarProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  totalTracks?: number;
  className?: string;
}

export const SortBar: React.FC<SortBarProps> = ({
  sortField,
  sortDirection,
  onSortChange,
  totalTracks,
  className = '',
}) => {
  const fields: { key: SortField; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'genre', label: 'Genre' },
    { key: 'date', label: 'Date Created' },
    { key: 'size', label: 'Size' },
    { key: 'views', label: 'Views' },
    { key: 'duration', label: 'Duration' },
    { key: 'artist', label: 'Channel' },
  ];

  const handleFieldClick = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set field with appropriate default direction (desc for views, date, size, duration; asc for name, genre, artist)
      const defaultDir: SortDirection = ['views', 'date', 'size', 'duration'].includes(field) ? 'desc' : 'asc';
      onSortChange(field, defaultDir);
    }
  };

  const toggleDirection = () => {
    onSortChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2.5 p-2 bg-[#12141e]/90 border border-slate-800/80 rounded-xl text-xs ${className}`}>
      {/* Field selection pills */}
      <div className="flex flex-wrap items-center gap-1">
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 px-2 py-1 mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-300">Sort by:</span>
        </div>

        {fields.map(({ key, label }) => {
          const isActive = sortField === key;
          return (
            <button
              key={key}
              onClick={() => handleFieldClick(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
              title={`Sort by ${label} (${isActive && sortDirection === 'asc' ? 'Ascending' : 'Descending'})`}
            >
              <span>{label}</span>
              {isActive && (
                <span className="text-[10px] font-mono">
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sort Direction Toggle & Count */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={toggleDirection}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 font-mono text-[11px] transition-colors cursor-pointer"
          title={`Click to switch to ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          {sortDirection === 'asc' ? (
            <>
              <ArrowDownAZ className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ascending</span>
            </>
          ) : (
            <>
              <ArrowUpZA className="w-3.5 h-3.5 text-indigo-400" />
              <span>Descending</span>
            </>
          )}
        </button>

        {totalTracks !== undefined && (
          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline pl-1">
            {totalTracks} {totalTracks === 1 ? 'track' : 'tracks'}
          </span>
        )}
      </div>
    </div>
  );
};
