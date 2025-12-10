
import React, { useState } from 'react';
import { Youtube, Search } from 'lucide-react';

export const YouTubePlayer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const handleLoad = () => {
    if (!url) return;
    // Extract Video ID
    let videoId = '';
    
    // Handle standard watch URLs
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v') || '';
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1);
    }

    if (videoId) {
      setEmbedUrl(`https://www.youtube.com/embed/${videoId}`);
    } else {
        alert("Invalid YouTube URL");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#000]">
      {/* Search Bar */}
      <div className="p-3 bg-[#121212] border-b border-[#27272a] flex gap-2">
        <div className="relative flex-1">
            <Youtube className="absolute left-3 top-2.5 text-red-500" size={16} />
            <input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                placeholder="Paste YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
                className="w-full bg-[#18181b] border border-[#333] rounded-md py-2 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-red-500"
            />
        </div>
        <button 
            onClick={handleLoad}
            className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-gray-200 rounded-md text-sm font-medium transition"
        >
            Load
        </button>
      </div>

      {/* Player Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {embedUrl ? (
            <iframe 
                src={embedUrl}
                title="YouTube video player"
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            />
        ) : (
            <div className="text-center text-gray-600">
                <Youtube size={64} className="mx-auto mb-4 opacity-20" />
                <p>Enter a URL to watch while you code.</p>
            </div>
        )}
      </div>
    </div>
  );
};
