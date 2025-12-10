import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  options: { label: string; action: () => void; danger?: boolean }[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#252526] border border-[#444] rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ top: y, left: x }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => {
            option.action();
            onClose();
          }}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2
            ${option.danger ? 'text-red-400 hover:text-white hover:bg-red-600' : 'text-gray-200'}
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
