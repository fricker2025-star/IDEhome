
import React, { useRef, useEffect, useState } from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  fileName: string | null;
  fontSize?: number;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, fileName, fontSize = 14 }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Determine language for Prism
  const getLanguage = (fname: string | null) => {
    if (!fname) return 'javascript';
    if (fname.endsWith('.ts') || fname.endsWith('.tsx')) return 'typescript';
    if (fname.endsWith('.js') || fname.endsWith('.jsx')) return 'javascript';
    if (fname.endsWith('.html')) return 'html';
    if (fname.endsWith('.css')) return 'css';
    if (fname.endsWith('.json')) return 'json';
    if (fname.endsWith('.py')) return 'python';
    return 'javascript';
  };

  const language = getLanguage(fileName);

  // Sync scrolling between textarea and pre block
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Handle Tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      
      onChange(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Trigger Prism highlight
  useEffect(() => {
    if (preRef.current && (window as any).Prism) {
      (window as any).Prism.highlightElement(preRef.current.querySelector('code'));
    }
  }, [code, language]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] relative group">
      <div className="flex-1 relative overflow-hidden font-mono leading-6">
        
        {/* Syntax Highlighting Layer (Bottom) */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className={`absolute inset-0 m-0 p-4 pointer-events-none overflow-hidden whitespace-pre language-${language}`}
          style={{ 
              fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
              fontSize: `${fontSize}px`
          }}
        >
          <code className={`language-${language}`}>{code}</code>
        </pre>

        {/* Editing Layer (Top) */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white p-4 outline-none resize-none whitespace-pre overflow-auto z-10"
          style={{ 
              fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
              fontSize: `${fontSize}px`
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>

      {/* Footer Info */}
      <div className="h-7 bg-[#1e1e1e] text-gray-400 text-xs flex items-center px-4 gap-4 shrink-0 border-t border-[#333] z-20">
          <span className="font-semibold text-blue-400">{fileName ? fileName.split('/').pop() : 'Untitled'}</span>
          <span className="opacity-50">{fileName || ''}</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {language.toUpperCase()}
          </span>
          <span className="opacity-50">UTF-8</span>
      </div>
    </div>
  );
};