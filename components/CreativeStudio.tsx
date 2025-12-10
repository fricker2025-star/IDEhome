
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { StoredKey } from '../types';
import { Send, Image as ImageIcon, Sparkles, Loader2, Download, Trash2, Bot } from 'lucide-react';

interface CreativeStudioProps {
  keys: StoredKey[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
  images?: string[];
  generatedImages?: string[]; // Images created by the AI
}

export const CreativeStudio: React.FC<CreativeStudioProps> = ({ keys }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-select Google key if available (best for image gen)
  useEffect(() => {
    if (!selectedKeyId && keys.length > 0) {
        const googleKey = keys.find(k => k.provider === 'google');
        if (googleKey) setSelectedKeyId(googleKey.id);
        else setSelectedKeyId(keys[0].id);
    }
  }, [keys, selectedKeyId]);

  useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && uploadedImages.length === 0) || !selectedKeyId) return;

    const keyConfig = keys.find(k => k.id === selectedKeyId);
    if (!keyConfig) return;

    const userMsg: Message = { role: 'user', text: input, images: [...uploadedImages] };
    setMessages(prev => [...prev, userMsg]);
    
    setInput('');
    setUploadedImages([]);
    setIsProcessing(true);

    try {
        // Convert history for API
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }] // Simplified history
        }));

        // Determine model: use an image-capable model if possible
        let model = 'gemini-2.5-flash-image'; 
        if (keyConfig.provider !== 'google') {
            // Fallback for others
            model = 'gpt-4o'; // Generic fallback name, handled by service
        }

        const { text, generatedImages } = await geminiService.sendCreativeMessage(
            keyConfig.key,
            keyConfig.provider,
            model,
            history,
            userMsg.text,
            userMsg.images || []
        );

        setMessages(prev => [...prev, { 
            role: 'model', 
            text: text,
            generatedImages: generatedImages 
        }]);

    } catch (e: any) {
        setMessages(prev => [...prev, { role: 'model', text: `Error: ${e.message}` }]);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.result) setUploadedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-white">
        
        {/* Header */}
        <div className="h-14 border-b border-[#27272a] flex items-center justify-between px-6 bg-[#121212]">
            <div className="flex items-center gap-2 text-purple-400">
                <Sparkles size={20} />
                <span className="font-bold tracking-wide">Creative Studio</span>
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Provider:</span>
                <select 
                    className="bg-[#18181b] border border-[#333] rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-purple-500"
                    value={selectedKeyId}
                    onChange={(e) => setSelectedKeyId(e.target.value)}
                >
                    {keys.map(k => (
                        <option key={k.id} value={k.id}>{k.alias} ({k.provider})</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth" ref={scrollRef}>
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                    <Sparkles size={64} className="mb-4" />
                    <p className="text-lg font-medium">Start creating...</p>
                    <p className="text-sm">Generate images, brainstorm ideas, or just chat.</p>
                </div>
            )}
            
            {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* User Uploads */}
                    {msg.images && msg.images.length > 0 && (
                        <div className="flex gap-2 mb-2">
                            {msg.images.map((img, idx) => (
                                <img key={idx} src={img} className="w-40 h-40 object-cover rounded-lg border border-[#333]" />
                            ))}
                        </div>
                    )}

                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-lg ${
                        msg.role === 'user' 
                        ? 'bg-purple-600 text-white rounded-br-sm' 
                        : 'bg-[#1e1e1e] text-gray-200 border border-[#333] rounded-bl-sm'
                    }`}>
                        {msg.text}
                    </div>

                    {/* AI Generated Images */}
                    {msg.generatedImages && msg.generatedImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-4 w-full max-w-2xl">
                            {msg.generatedImages.map((img, idx) => (
                                <div key={idx} className="relative group rounded-xl overflow-hidden border border-[#333]">
                                    <img src={img} className="w-full h-auto object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                        <a href={img} download={`generated-${i}-${idx}.png`} className="p-2 bg-white text-black rounded-full hover:scale-110 transition">
                                            <Download size={20} />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {isProcessing && (
                <div className="flex items-center gap-2 text-gray-500 animate-pulse">
                    <Bot size={16} />
                    <span className="text-sm">Creating...</span>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#121212] border-t border-[#27272a]">
            {uploadedImages.length > 0 && (
                <div className="flex gap-2 mb-3">
                    {uploadedImages.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-[#333] group">
                            <img src={img} className="w-full h-full object-cover" />
                            <button onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="relative">
                <input 
                    className="w-full bg-[#1e1e1e] text-gray-200 rounded-full pl-12 pr-12 py-3 border border-[#333] focus:border-purple-500 focus:ring-1 focus:ring-purple-900/50 outline-none transition"
                    placeholder="Describe an image or ask a question..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={!selectedKeyId || isProcessing}
                />
                <label className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-purple-400 transition">
                    <ImageIcon size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <button 
                    onClick={handleSend} 
                    disabled={!input.trim() || isProcessing}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition disabled:opacity-50 disabled:bg-gray-700"
                >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
        </div>
    </div>
  );
};
