
import React, { useState, useEffect, useRef } from 'react';
import { Globe, Search, RotateCw, ArrowLeft, ArrowRight, X, Plus, Star, MoreVertical, Shield, Zap, AlertTriangle } from 'lucide-react';

export const MediaBrowser: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proxyMode, setProxyMode] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pageTitle, setPageTitle] = useState('New Tab');

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (iframeSrc && iframeSrc.startsWith('blob:')) {
        URL.revokeObjectURL(iframeSrc);
      }
    };
  }, [iframeSrc]);

  const detectBlockers = (url: string) => {
      // Known sites that block iframes (X-Frame-Options)
      const blockers = ['google.com', 'github.com', 'stackoverflow.com', 'medium.com', 'twitter.com', 'x.com', 'reddit.com', 'facebook.com'];
      return blockers.some(domain => url.includes(domain));
  };

  const loadUrl = async (urlToLoad: string, useProxy: boolean, addToHistory = true) => {
    setIsLoading(true);
    setIframeSrc(null); // Clear to show loading

    let target = urlToLoad.trim();

    // 1. Google Search / Omnibox Logic
    if (!target.includes('.') && !target.startsWith('http')) {
        target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
        useProxy = true; // Google requires proxy
    }
    // 2. Protocol helper
    else if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = `https://${target}`;
    }

    // 3. YouTube Exception (Always Embed, Never Proxy)
    if (target.includes('youtube.com/watch') || target.includes('youtu.be/')) {
        let videoId = '';
        try {
            const urlObj = new URL(target);
            if (urlObj.hostname.includes('youtube.com')) {
                videoId = urlObj.searchParams.get('v') || '';
            } else if (urlObj.hostname.includes('youtu.be')) {
                videoId = urlObj.pathname.slice(1);
            }
        } catch(e) {}

        if (videoId) {
            target = `https://www.youtube.com/embed/${videoId}`;
            useProxy = false;
        }
    }

    // 4. Auto-Detect blockers
    if (detectBlockers(target) && !target.includes('youtube.com/embed')) {
        useProxy = true;
    }

    // Update State
    setCurrentUrl(target);
    setInputUrl(target);
    setProxyMode(useProxy);
    
    // Update Page Title (Simple heuristic)
    try {
        const urlObj = new URL(target);
        setPageTitle(urlObj.hostname);
    } catch {
        setPageTitle(target);
    }

    if (addToHistory) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(target);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }

    if (useProxy) {
        // --- Proxy Mode ---
        try {
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`);
            const data = await response.json();
            
            if (!data.contents) throw new Error("Empty response");

            let html = data.contents;
            // Inject <base> so relative links work
            const baseTag = `<base href="${target}" target="_blank" />`;
            // Inject CSS to hide scrollbars if needed or style google
            const styleTag = `<style>body::-webkit-scrollbar { width: 0 !important; } body { overflow: auto; }</style>`;
            
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${baseTag}${styleTag}`);
            } else {
                html = `${baseTag}${styleTag}${html}`;
            }

            const blob = new Blob([html], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);
            setIframeSrc(blobUrl);

        } catch (e) {
            // Fallback for proxy failure
            const errorHtml = `
                <html>
                <body style="background:#202124;color:#e8eaed;font-family:Roboto,arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
                    <div style="text-align:center">
                        <h2 style="color:#8ab4f8;margin-bottom:10px;">Aw, Snap!</h2>
                        <p>Could not load via proxy.</p>
                        <a href="${target}" target="_blank" style="color:#8ab4f8;text-decoration:none;border:1px solid #5f6368;padding:8px 16px;border-radius:4px;display:inline-block;margin-top:20px;">Open in New Tab</a>
                    </div>
                </body>
                </html>
            `;
            const blob = new Blob([errorHtml], { type: 'text/html' });
            setIframeSrc(URL.createObjectURL(blob));
        }
    } else {
        // --- Direct Mode ---
        setIframeSrc(target);
    }

    setIsLoading(false);
  };

  const handleNavigate = () => {
      if (!inputUrl) return;
      loadUrl(inputUrl, proxyMode);
  };

  const handleBack = () => {
      if (historyIndex > 0) {
          const prev = history[historyIndex - 1];
          setHistoryIndex(historyIndex - 1);
          loadUrl(prev, detectBlockers(prev), false);
      }
  };

  const handleForward = () => {
      if (historyIndex < history.length - 1) {
          const next = history[historyIndex + 1];
          setHistoryIndex(historyIndex + 1);
          loadUrl(next, detectBlockers(next), false);
      }
  };

  const handleReload = () => {
      if (currentUrl) loadUrl(currentUrl, proxyMode, false);
  };

  return (
    <div className="h-full flex flex-col bg-[#202124] overflow-hidden">
      
      {/* Chrome Top Bar (Tabs) */}
      <div className="h-[40px] bg-[#000] flex items-end px-2 gap-2 pt-2">
          {/* Active Tab */}
          <div className="bg-[#35363a] h-full rounded-t-lg px-4 flex items-center gap-3 min-w-[180px] max-w-[240px] relative group">
             <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                 <Globe size={10} className="text-gray-300" />
             </div>
             <span className="text-xs text-gray-200 truncate flex-1">{pageTitle || "New Tab"}</span>
             <button onClick={() => { setIframeSrc(null); setInputUrl(''); setPageTitle("New Tab"); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded-full transition">
                 <X size={10} className="text-gray-400" />
             </button>
             {/* Tab Curve Hack (Visual only) */}
             <div className="absolute bottom-0 -right-2 w-4 h-4 bg-[#000] rounded-bl-xl z-0 pointer-events-none shadow-[-5px_5px_0_#35363a]" />
             <div className="absolute bottom-0 -left-2 w-4 h-4 bg-[#000] rounded-br-xl z-0 pointer-events-none shadow-[5px_5px_0_#35363a]" />
          </div>

          {/* New Tab Button */}
          <button className="h-7 w-7 rounded-full hover:bg-white/10 flex items-center justify-center mb-1.5 transition">
              <Plus size={16} className="text-gray-400" />
          </button>
      </div>

      {/* Chrome Navigation Bar */}
      <div className="h-12 bg-[#35363a] flex items-center px-2 gap-2 border-b border-[#202124]">
         <div className="flex items-center">
            <button onClick={handleBack} disabled={historyIndex <= 0} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 text-gray-400 transition">
                <ArrowLeft size={16} />
            </button>
            <button onClick={handleForward} disabled={historyIndex >= history.length - 1} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 text-gray-400 transition">
                <ArrowRight size={16} />
            </button>
            <button onClick={handleReload} className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition">
                <RotateCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
         </div>

         {/* Omnibox */}
         <div className="flex-1 h-8 bg-[#202124] rounded-full flex items-center px-3 gap-2 border border-[#5f6368] hover:bg-[#303134] focus-within:bg-[#202124] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
             {proxyMode ? <Shield size={12} className="text-purple-400" /> : <Search size={12} className="text-gray-500" />}
             
             <input 
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 placeholder:text-gray-500 h-full w-full"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                placeholder="Search Google or type a URL"
             />

             {currentUrl && (
                <div className="flex items-center gap-1">
                    <button onClick={() => setProxyMode(!proxyMode)} className="p-1 hover:bg-white/10 rounded-full" title={proxyMode ? "Proxy Active" : "Direct Connection"}>
                        {proxyMode ? <Zap size={12} className="text-yellow-400" fill="currentColor" /> : <Star size={12} className="text-gray-500" />}
                    </button>
                </div>
             )}
         </div>

         <button className="p-2 rounded-full hover:bg-white/10 text-gray-400">
             <MoreVertical size={16} />
         </button>
      </div>

      {/* Viewport */}
      <div className="flex-1 bg-[#202124] relative flex flex-col">
        {iframeSrc ? (
            <>
                <iframe 
                    src={iframeSrc}
                    className="flex-1 w-full h-full border-0 bg-white"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                    allowFullScreen
                    title="Browser View"
                />
                
                {/* Info Footer */}
                <div className="bg-[#35363a] px-2 py-0.5 flex justify-between items-center text-[10px] text-gray-500 select-none">
                     <span>{proxyMode ? "Secure Reader Mode (Proxy Active)" : "Direct Connect"}</span>
                     {!proxyMode && !iframeSrc.includes('youtube') && (
                         <span className="flex items-center gap-1 text-yellow-600">
                             <AlertTriangle size={10} /> If content is blank, enable Proxy Mode
                         </span>
                     )}
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                <div className="w-20 h-20 bg-[#35363a] rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <Search size={40} className="text-gray-500" />
                </div>
                <h3 className="text-xl font-medium mb-2">Google</h3>
                <div className="w-96 h-10 bg-[#303134] rounded-full border border-[#5f6368] flex items-center px-4 gap-3 cursor-text hover:bg-[#3c4043] transition">
                    <Search size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-400">Search Google or type a URL</span>
                </div>
                <div className="flex gap-4 mt-8">
                     <div className="flex flex-col items-center gap-2 group cursor-pointer">
                         <div className="w-12 h-12 rounded-full bg-[#303134] flex items-center justify-center group-hover:bg-[#3c4043] transition"><div className="w-6 h-6 bg-red-500 rounded-sm" /></div>
                         <span className="text-xs">YouTube</span>
                     </div>
                     <div className="flex flex-col items-center gap-2 group cursor-pointer">
                         <div className="w-12 h-12 rounded-full bg-[#303134] flex items-center justify-center group-hover:bg-[#3c4043] transition"><div className="w-6 h-6 bg-blue-500 rounded-sm" /></div>
                         <span className="text-xs">React</span>
                     </div>
                     <div className="flex flex-col items-center gap-2 group cursor-pointer">
                         <div className="w-12 h-12 rounded-full bg-[#303134] flex items-center justify-center group-hover:bg-[#3c4043] transition"><div className="w-6 h-6 bg-green-500 rounded-sm" /></div>
                         <span className="text-xs">Docs</span>
                     </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
