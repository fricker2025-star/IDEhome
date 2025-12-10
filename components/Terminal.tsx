
import React, { useEffect, useRef } from 'react';

interface TerminalProps {
  logs: { timestamp: string; message: string; type: 'info' | 'success' | 'error' | 'tool' }[];
  fontSize?: number;
  autoScroll?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ logs, fontSize = 12, autoScroll = true }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(autoScroll);

  // Sync ref with prop
  useEffect(() => {
      shouldAutoScroll.current = autoScroll;
  }, [autoScroll]);

  // Check if we should auto-scroll before the update
  const handleScroll = () => {
    if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        // If user is within 50px of bottom, keep auto-scroll on.
        // If they scroll up, disable it temporarily until they hit bottom again OR if prop forces it.
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        
        if (autoScroll) {
             // If strictly enforcing auto-scroll (e.g. "Always"), we might not want this logic, 
             // but usually "Auto-scroll" means "Scroll if at bottom".
             shouldAutoScroll.current = isAtBottom;
        }
    }
  };

  useEffect(() => {
    if (shouldAutoScroll.current || autoScroll) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  return (
    <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full bg-black font-mono p-2 overflow-auto flex flex-col"
        style={{ fontSize: `${fontSize}px` }}
    >
      <div className="text-gray-400 mb-2 border-b border-gray-800 pb-1 sticky top-0 bg-black z-10 flex justify-between">
          <span>Output Terminal</span>
          {!shouldAutoScroll.current && logs.length > 0 && <span className="text-xs text-blue-500 animate-pulse">⬇ New logs</span>}
      </div>
      {logs.length === 0 && <span className="text-gray-600">Ready...</span>}
      {logs.map((log, i) => (
        <div key={i} className="mb-1 break-words">
          <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
          <span className={
            log.type === 'error' ? 'text-red-500' :
            log.type === 'success' ? 'text-green-500' :
            log.type === 'tool' ? 'text-yellow-500' :
            'text-blue-300'
          }>
            {log.type === 'tool' && '> '}
            {log.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};