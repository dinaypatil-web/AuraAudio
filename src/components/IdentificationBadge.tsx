import React from 'react';
import { Radio, Folder, FolderTree, Music, Youtube, Disc3 } from 'lucide-react';
import { ItemIdentificationType } from '../types/music';

interface IdentificationBadgeProps {
  type: ItemIdentificationType;
  subType?: string; // e.g. 'subfolder', 'disc', 'album', 'stream'
  depth?: number;
  countLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IdentificationBadge: React.FC<IdentificationBadgeProps> = ({
  type,
  subType,
  depth = 1,
  countLabel,
  size = 'md',
  className = '',
}) => {
  if (type === 'channel') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wide bg-red-950/80 border border-red-700/60 text-red-300 shadow-sm ${
          size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs px-3 py-1' : 'text-[10px]'
        } ${className}`}
        title="Verified Creator Channel"
      >
        <Radio className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-red-400 animate-pulse`} />
        <span>CHANNEL</span>
        {countLabel && (
          <>
            <span className="text-red-700">·</span>
            <span className="text-red-200 font-medium normal-case">{countLabel}</span>
          </>
        )}
      </span>
    );
  }

  if (type === 'folder') {
    const isSub = depth > 1 || subType === 'subfolder' || subType === 'disc';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wide ${
          isSub
            ? 'bg-amber-950/80 border border-amber-600/60 text-amber-300'
            : 'bg-amber-900/60 border border-amber-500/50 text-amber-200'
        } shadow-sm ${size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs px-3 py-1' : 'text-[10px]'} ${className}`}
        title={isSub ? `Nested Subfolder (Level ${depth})` : 'Channel Directory Folder'}
      >
        {isSub ? (
          <FolderTree className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-amber-400`} />
        ) : (
          <Folder className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-amber-400 fill-amber-400/20`} />
        )}
        <span>{isSub ? `SUBFOLDER${depth > 1 ? ` L${depth}` : ''}` : 'FOLDER'}</span>
        {countLabel && (
          <>
            <span className="text-amber-700">·</span>
            <span className="text-amber-100 font-medium normal-case">{countLabel}</span>
          </>
        )}
      </span>
    );
  }

  // Track badge
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wide bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 shadow-sm ${
        size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs px-3 py-1' : 'text-[10px]'
      } ${className}`}
      title="Complete Audio Track"
    >
      <Music className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-400`} />
      <span>TRACK</span>
      {countLabel && (
        <>
          <span className="text-emerald-700">·</span>
          <span className="text-emerald-200 font-medium normal-case">{countLabel}</span>
        </>
      )}
    </span>
  );
};
