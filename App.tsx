
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Terminal } from './components/Terminal';
import { FileTree } from './components/FileTree';
import { Settings } from './components/Settings';
import { CodeEditor } from './components/CodeEditor';
import { BotAvatar, BotState } from './components/BotAvatar';
import { CreativeStudio } from './components/CreativeStudio'; // Import Studio
import { fileSystemService } from './services/fileSystem';
import { geminiService } from './services/geminiService';
import { storageService } from './services/storage';
import { FileNode, ChatMessage, StoredKey, AgentConfig, AppSettings } from './types';
import { FolderOpen, Settings as SettingsIcon, Play, MessageSquare, Save, Folder, Bot, Layers, CheckSquare, Square, Cpu, Square as StopIcon, RefreshCw, Sparkles, Image as ImageIcon, Eye, Code, Monitor, Youtube, Globe, Palette } from 'lucide-react';

export default function App() {
  // -- Global State --
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(storageService.getSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'files' | 'agents' | 'studio'>('files'); // Added 'studio'

  // -- File System State --
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isFileSystemReady, setIsFileSystemReady] = useState(false);
  const [fsType, setFsType] = useState<'native' | 'memory'>('native');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // -- Chat & Robot State --
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImages, setChatImages] = useState<string[]>([]); // Base64 images
  const [agentHistories, setAgentHistories] = useState<Record<string, ChatMessage[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Robot State
  const [botState, setBotState] = useState<BotState>('idle');
  const [botMessage, setBotMessage] = useState('');

  // -- Preview & Media State --
  const [activeCenterTab, setActiveCenterTab] = useState<'code' | 'preview'>('code');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  
  // -- Terminal Logs --
  const [logs, setLogs] = useState<{ timestamp: string; message: string; type: 'info' | 'success' | 'error' | 'tool' }[]>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'tool' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  // -- Initialization --
  useEffect(() => {
    const loadedKeys = storageService.getKeys();
    const loadedAgents = storageService.getAgents();
    setKeys(loadedKeys);
    setAgents(loadedAgents);
    
    // Auto-select first agent if exists
    if (loadedAgents.length > 0 && selectedAgentIds.length === 0) {
      setSelectedAgentIds([loadedAgents[0].id]);
    }
  }, []);

  const handleSaveKeys = (newKeys: StoredKey[]) => {
    setKeys(newKeys);
    storageService.saveKeys(newKeys);
  };

  const handleSaveAgents = (newAgents: AgentConfig[]) => {
    setAgents(newAgents);
    storageService.saveAgents(newAgents);
    if (selectedAgentIds.length === 0 && newAgents.length > 0) {
      setSelectedAgentIds([newAgents[0].id]);
    }
  };
  
  const handleCloseSettings = () => {
      setShowSettings(false);
      // Refresh global settings
      setAppSettings(storageService.getSettings());
  };

  // -- File System Operations --
  const refreshFileTree = async () => {
    const root = fileSystemService.getRootHandle();
    if (!root) return;
    try {
      const nodes = await fileSystemService.readDirectoryRecursive(root);
      setFiles(nodes);
    } catch (err: any) {
      addLog(`Failed to refresh tree: ${err.message || err}`, 'error');
    }
  };

  const handleOpenFolder = async () => {
    try {
      await fileSystemService.setRoot();
      const provider = fileSystemService.getProvider();
      setFsType(provider);
      
      setIsFileSystemReady(true);
      if (provider === 'memory') {
          addLog('Running in In-Memory Mode (Sandboxed). Files will vanish on reload.', 'tool');
      } else {
          addLog('Local Folder mounted successfully.', 'success');
      }
      await refreshFileTree();
    } catch (err) {
      addLog('Cancelled folder open or failed to connect.', 'info');
    }
  };

  const handleToggleFolder = (path: string) => {
    setExpandedPaths(prev => {
        const next = new Set(prev);
        if (next.has(path)) {
            next.delete(path);
        } else {
            next.add(path);
        }
        return next;
    });
  };

  const handleFileSelect = async (path: string) => {
    try {
      setSelectedFile(path);
      const content = await fileSystemService.readFile(path);
      setEditorContent(content);
      setActiveCenterTab('code'); // Switch back to code when selecting a file
      addLog(`Opened ${path}`, 'info');
    } catch (err: any) {
      addLog(`Error reading file: ${err.message || err}`, 'error');
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    try {
      await fileSystemService.writeFile(selectedFile, editorContent);
      addLog(`Saved ${selectedFile}`, 'success');
    } catch (err: any) {
      addLog(`Error saving file: ${err.message || err}`, 'error');
    }
  };

  // -- Context Menu Handlers --
  const handleCreateFile = async (parentPath: string) => {
    const name = prompt("Enter file name:");
    if (!name) return;
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    try {
      await fileSystemService.writeFile(fullPath, "");
      await refreshFileTree();
      handleFileSelect(fullPath);
      addLog(`Created file ${fullPath}`, 'success');
    } catch (e: any) {
      addLog(`Failed to create file: ${e.message}`, 'error');
    }
  };

  const handleCreateFolder = async (parentPath: string) => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    try {
      await fileSystemService.createDirectory(fullPath);
      await refreshFileTree();
      setExpandedPaths(prev => new Set(prev).add(fullPath));
      addLog(`Created folder ${fullPath}`, 'success');
    } catch (e: any) {
      addLog(`Failed to create folder: ${e.message}`, 'error');
    }
  };

  const handleDelete = async (path: string) => {
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
    try {
      await fileSystemService.deleteEntry(path);
      if (selectedFile === path) {
        setSelectedFile(null);
        setEditorContent("");
      }
      await refreshFileTree();
      addLog(`Deleted ${path}`, 'info');
    } catch (e: any) {
      addLog(`Failed to delete: ${e.message}`, 'error');
    }
  };


  // -- Agent Selection --
  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentIds(prev => {
      if (prev.includes(agentId)) {
        return prev.filter(id => id !== agentId);
      } else {
        return [...prev, agentId];
      }
    });
  };

  // -- Image Upload --
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              if (reader.result) {
                  setChatImages(prev => [...prev, reader.result as string]);
                  addLog("Image attached to chat context.", 'info');
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleScreenCapture = async () => {
      try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const track = stream.getVideoTracks()[0];
          
          // Capture frame using a hidden video element
          const video = document.createElement('video');
          video.srcObject = stream;
          video.muted = true;
          await video.play();

          // Draw to canvas
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const base64 = canvas.toDataURL('image/png');
              setChatImages(prev => [...prev, base64]);
              addLog("Screen captured successfully.", 'success');
          }

          // Stop sharing immediately
          track.stop();
          video.remove();
          canvas.remove();
      } catch (e: any) {
          addLog(`Screen capture failed: ${e.message}`, 'error');
      }
  };

  const removeImage = (index: number) => {
      setChatImages(prev => prev.filter((_, i) => i !== index));
  };

  // -- AI Interaction --
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      addLog("Operation aborted by user.", 'error');
      setIsProcessing(false);
      setBotState('error');
      setBotMessage('Operation aborted.');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() && chatImages.length === 0) return;
    if (selectedAgentIds.length === 0) {
      addLog("Please select at least one Agent.", 'error');
      return;
    }

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    const activeAgents = agents.filter(a => selectedAgentIds.includes(a.id));
    if (activeAgents.length === 0) return;

    const agentsWithKeys = activeAgents.filter(agent => {
        const keyConfig = keys.find(k => k.id === agent.keyId);
        if (!keyConfig) {
            addLog(`Skipping ${agent.name}: API Key missing.`, 'error');
            return false;
        }
        return true;
    });

    if (agentsWithKeys.length === 0) return;

    const userTimestamp = Date.now();
    const userMsgContent = chatInput;
    const currentImages = [...chatImages];
    
    setChatInput('');
    setChatImages([]); // Clear images after sending
    setIsProcessing(true);
    setBotState('thinking');
    setBotMessage('Analyzing request...');

    setAgentHistories(prev => {
        const next = { ...prev };
        agentsWithKeys.forEach(agent => {
            const userMsg: ChatMessage = { 
                role: 'user', 
                content: userMsgContent, 
                images: currentImages,
                timestamp: userTimestamp 
            };
            next[agent.id] = [...(next[agent.id] || []), userMsg];
        });
        return next;
    });

    try {
      let plan: Record<string, string> | null = null;
      if (agentsWithKeys.length > 1) {
          const plannerAgent = agentsWithKeys[0];
          const keyConfig = keys.find(k => k.id === plannerAgent.keyId)!;
          addLog("Generative Planning Phase initiated...", 'info');
          setBotMessage('Constructing multi-agent plan...');
          
          try {
             plan = await geminiService.generatePlan(
                 keyConfig.key, 
                 keyConfig.provider, 
                 plannerAgent.model, 
                 agentsWithKeys, 
                 userMsgContent
             );
             
             setAgentHistories(prev => {
                 const next = { ...prev };
                 agentsWithKeys.forEach(agent => {
                     const instruction = plan?.[agent.id] || "Assist with the user request.";
                     const planMsg: ChatMessage = { 
                         role: 'system', 
                         content: `[PLANNING INSTRUCTION]: ${instruction}`, 
                         timestamp: Date.now() + 1 
                     };
                     next[agent.id] = [...(next[agent.id] || []), planMsg];
                 });
                 return next;
             });
          } catch (e) {
              addLog("Planning failed, falling back to direct prompt.", 'error');
          }
      }

      if (ac.signal.aborted) return;

      await Promise.all(agentsWithKeys.map(async (agent) => {
          const keyConfig = keys.find(k => k.id === agent.keyId)!;
          const historyLimit = agent.maxContextHistory || 10;
          const rawHistory = (agentHistories[agent.id] || []).filter(m => m.role !== 'system');
          const effectiveHistory = rawHistory.length > historyLimit 
             ? rawHistory.slice(rawHistory.length - historyLimit)
             : rawHistory;

          const history = effectiveHistory
            .filter(m => m.content && typeof m.content === 'string' && m.content.trim() !== '')
            .map(m => ({
              role: m.role === 'model' ? 'model' : 'user',
              parts: [{ text: String(m.content) }] 
            }));

          const instruction = `${agent.systemPrompt}\n\n[ENVIRONMENT]\nCWD: ${agent.rootPath}\nFileSystem Type: ${fsType}\n(If Memory FS, files are temporary).`;
          const finalPrompt = plan ? (plan[agent.id] || userMsgContent) : userMsgContent;

          try {
            const responseText = await geminiService.sendMessage(
                keyConfig.key,
                keyConfig.provider,
                agent.model,
                instruction,
                history,
                finalPrompt,
                currentImages, 
                (toolName, args) => {
                  addLog(`[${agent.name}] Calling ${toolName}...`, 'tool');
                  setBotState('coding');
                  setBotMessage(`Executing: ${toolName}`);
                },
                (toolName, args, result) => {
                   if (['writeFile', 'deleteFile', 'createDirectory'].includes(toolName)) {
                      refreshFileTree();
                      
                      let pathToExpand = '';
                      if (toolName === 'writeFile' && args.path) {
                          const parts = args.path.split('/');
                          if (parts.length > 1) pathToExpand = parts.slice(0, -1).join('/');
                      } else if (toolName === 'createDirectory' && args.path) {
                          pathToExpand = args.path;
                      }

                      if (pathToExpand) {
                          setExpandedPaths(prev => {
                              const next = new Set(prev);
                              const parts = pathToExpand.split('/');
                              let current = '';
                              for (const part of parts) {
                                  current = current ? `${current}/${part}` : part;
                                  next.add(current);
                              }
                              return next;
                          });
                      }
                   }
                   if (toolName === 'deployToPreview' && result.previewUrl) {
                       setPreviewUrl(result.previewUrl);
                       setActiveCenterTab('preview');
                       addLog("Live Preview Deployed.", 'success');
                   }
                },
                ac.signal,
                { temperature: agent.temperature }
            );

            let safeResponse = responseText;
            if (typeof safeResponse !== 'string') {
                safeResponse = JSON.stringify(safeResponse);
            }

            const modelMsg: ChatMessage = { role: 'model', content: safeResponse || " ", timestamp: Date.now() };

            setAgentHistories(prev => ({
                ...prev,
                [agent.id]: [...(prev[agent.id] || []), modelMsg]
            }));
            
            setBotState('success');
            setBotMessage('Task completed successfully.');

          } catch (err: any) {
             if (ac.signal.aborted) return;
             let errorMessage = "An unknown error occurred.";
             if (err instanceof Error) errorMessage = err.message;
             else if (typeof err === 'string') errorMessage = err;
             else errorMessage = "Non-serializable error.";

             if (errorMessage === '[object Object]') errorMessage = "Error: Invalid error object received.";

             addLog(`[${agent.name}] ${errorMessage}`, 'error');
             const errorMsg: ChatMessage = { role: 'model', content: `❌ ${errorMessage}`, timestamp: Date.now() };
             setAgentHistories(prev => ({
                ...prev,
                [agent.id]: [...(prev[agent.id] || []), errorMsg]
             }));
             setBotState('error');
             setBotMessage('An error occurred.');
          }
      }));

    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
      refreshFileTree();
      setTimeout(() => {
          setBotState(prev => prev === 'error' ? 'error' : 'idle');
          setBotMessage(prev => prev === 'An error occurred.' ? prev : '');
      }, 5000);
    }
  };

  const mergedMessages = useMemo(() => {
    let allMsgs: (ChatMessage & { agentName?: string, agentColor?: string })[] = [];
    if (selectedAgentIds.length === 0) return [];
    selectedAgentIds.forEach((id, index) => {
        const agent = agents.find(a => a.id === id);
        if (!agent) return;
        const msgs = agentHistories[id] || [];
        const msgsWithMeta = msgs.map(m => ({
            ...m,
            agentName: m.role === 'model' ? agent.name : undefined,
            agentColor: `hsl(${ (index * 137.5) % 360 }, 70%, 60%)`
        }));
        allMsgs = allMsgs.concat(msgsWithMeta);
    });
    allMsgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return allMsgs;
  }, [selectedAgentIds, agentHistories, agents]);

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-gray-300 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 bg-[#0d0d0d] flex items-center justify-between px-6 border-b border-[#27272a] shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-gray-100 tracking-tight">Gemini Code Studio</span>
          <div className="h-6 w-px bg-[#27272a] mx-2" />
          {!isFileSystemReady && (
            <button onClick={handleOpenFolder} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition shadow-lg shadow-blue-900/20">
              <FolderOpen size={14} /> Open Project
            </button>
          )}
          {isFileSystemReady && (
              <div className="flex items-center gap-3 text-xs bg-[#18181b] px-3 py-1.5 rounded-md border border-[#27272a]">
                  <span className="text-green-500 flex items-center gap-1.5 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/> Mounted</span>
                  <span className="text-gray-600">|</span>
                  <span className={`flex items-center gap-1.5 ${fsType === 'memory' ? 'text-yellow-500' : 'text-blue-400'}`}>
                      {fsType === 'memory' ? <Cpu size={12} /> : <Folder size={12} />}
                      {fsType === 'memory' ? 'In-Memory Sandbox' : 'Local File System'}
                  </span>
              </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-[#27272a] text-xs font-medium rounded-md transition">
            <SettingsIcon size={14} /> Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-72 bg-[#121212] border-r border-[#27272a] flex flex-col shrink-0">
          <div className="flex border-b border-[#27272a] bg-[#0d0d0d]">
            <button 
              onClick={() => setSidebarTab('files')}
              className={`flex-1 py-3 text-xs font-bold tracking-wide flex justify-center items-center gap-2 ${sidebarTab === 'files' ? 'text-blue-400 border-b-2 border-blue-500 bg-[#1e1e1e]/50' : 'text-gray-500 hover:text-gray-300'}`}
              title="Project Files"
            >
              <Folder size={14} /> FILES
            </button>
            <button 
              onClick={() => setSidebarTab('agents')}
              className={`flex-1 py-3 text-xs font-bold tracking-wide flex justify-center items-center gap-2 ${sidebarTab === 'agents' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#1e1e1e]/50' : 'text-gray-500 hover:text-gray-300'}`}
              title="Coding Agents"
            >
              <Bot size={14} /> AGENTS
            </button>
            <button 
              onClick={() => setSidebarTab('studio')}
              className={`flex-1 py-3 text-xs font-bold tracking-wide flex justify-center items-center gap-2 ${sidebarTab === 'studio' ? 'text-pink-400 border-b-2 border-pink-500 bg-[#1e1e1e]/50' : 'text-gray-500 hover:text-gray-300'}`}
              title="Creative Studio (Image Gen)"
            >
              <Palette size={14} /> STUDIO
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'files' && (
              <div className="h-full flex flex-col">
                 {isFileSystemReady && (
                   <div className="flex justify-between items-center px-4 py-2 bg-[#18181b] border-b border-[#27272a]">
                     <span className="text-[10px] font-bold text-gray-500 uppercase">Project Root</span>
                     <button onClick={refreshFileTree} className="text-gray-500 hover:text-white transition p-1 hover:bg-[#27272a] rounded">
                        <RefreshCw size={12} />
                     </button>
                   </div>
                 )}
                 <FileTree 
                    nodes={files} 
                    selectedPath={selectedFile}
                    onFileSelect={handleFileSelect}
                    expandedPaths={expandedPaths}
                    onToggle={handleToggleFolder}
                    onCreateFile={handleCreateFile}
                    onCreateFolder={handleCreateFolder}
                    onDelete={handleDelete}
                />
              </div>
            )}
            {sidebarTab === 'agents' && (
              <div className="p-3 space-y-3">
                {agents.map(agent => {
                  const isSelected = selectedAgentIds.includes(agent.id);
                  return (
                    <div 
                      key={agent.id}
                      className={`group p-3 rounded-lg border transition-all duration-200 select-none flex items-start gap-3 cursor-pointer ${isSelected ? 'bg-purple-900/10 border-purple-500/30 shadow-lg shadow-purple-900/10' : 'bg-[#18181b] border-[#27272a] hover:border-[#3f3f46]'}`}
                      onClick={() => toggleAgentSelection(agent.id)}
                    >
                      <div className={`mt-1 transition-colors ${isSelected ? 'text-purple-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                         {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-purple-200' : 'text-gray-300'}`}>{agent.name}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                          <Layers size={10} /> {agent.rootPath}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1 truncate font-mono">
                          {agent.model}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {agents.length === 0 && (
                  <div className="text-center p-6 text-gray-600 text-xs border border-dashed border-[#27272a] rounded-lg">
                    No agents configured.
                  </div>
                )}
                <button onClick={() => setShowSettings(true)} className="w-full py-2.5 mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 border border-dashed border-blue-900/30 hover:border-blue-500/50 bg-blue-900/5 rounded-lg transition-colors">
                  + Create New Agent
                </button>
              </div>
            )}
            {sidebarTab === 'studio' && (
                <div className="p-6 text-center text-gray-500 text-sm">
                    <Palette size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-gray-400">Creative Mode Active</p>
                    <p className="mt-2 text-xs">The center pane is now dedicated to Creative Studio. Use this for pure chat and image generation.</p>
                </div>
            )}
          </div>
        </aside>

        {/* Center Pane Logic */}
        {sidebarTab === 'studio' ? (
             // --- CREATIVE STUDIO MODE ---
             <main className="flex-1 min-w-0 bg-[#09090b]">
                 <CreativeStudio keys={keys} />
             </main>
        ) : (
            // --- STANDARD IDE MODE ---
            <main className="flex-1 flex flex-col bg-[#09090b] relative min-w-0">
            
            {/* Tab Navigation */}
            <div className="h-10 bg-[#121212] flex items-center px-4 text-xs text-gray-400 border-b border-[#27272a] justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setActiveCenterTab('code')}
                        className={`flex items-center gap-2 h-10 px-2 border-b-2 transition-colors ${activeCenterTab === 'code' ? 'border-blue-500 text-gray-200' : 'border-transparent hover:text-gray-300'}`}
                    >
                        <Code size={14} />
                        <span className="font-mono">{selectedFile ? selectedFile.split('/').pop() : 'No File'}</span>
                    </button>
                    <button 
                        onClick={() => setActiveCenterTab('preview')}
                        className={`flex items-center gap-2 h-10 px-2 border-b-2 transition-colors ${activeCenterTab === 'preview' ? 'border-green-500 text-gray-200' : 'border-transparent hover:text-gray-300'}`}
                    >
                        <Eye size={14} />
                        <span>Live Preview</span>
                    </button>
                </div>
                {activeCenterTab === 'code' && selectedFile && (
                    <button onClick={handleSaveFile} className="flex items-center gap-1.5 px-3 py-1 bg-[#27272a] hover:bg-[#3f3f46] text-gray-200 rounded transition text-xs font-medium">
                        <Save size={12} /> Save
                    </button>
                )}
            </div>

            {/* Editor/Preview Area using persistent visibility for Media */}
            <div className="flex-1 min-h-0 relative bg-[#09090b]">
                
                {/* Code View */}
                <div className="absolute inset-0" style={{ display: activeCenterTab === 'code' ? 'block' : 'none' }}>
                    {selectedFile ? (
                        <CodeEditor 
                            code={editorContent}
                            onChange={setEditorContent}
                            fileName={selectedFile}
                            fontSize={appSettings.editorFontSize}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 bg-[#09090b]">
                            <div className="w-24 h-24 bg-[#121212] rounded-full flex items-center justify-center mb-6 border border-[#27272a]">
                                <FolderOpen size={40} className="opacity-20 text-blue-500" />
                            </div>
                            <p className="text-lg font-medium text-gray-500">No file is open</p>
                            <p className="text-sm text-gray-700 mt-2">Select a file from the explorer</p>
                        </div>
                    )}
                </div>

                {/* Preview View */}
                <div className="absolute inset-0 bg-white" style={{ display: activeCenterTab === 'preview' ? 'block' : 'none' }}>
                    {previewUrl ? (
                        <iframe 
                            src={previewUrl} 
                            className="w-full h-full border-none"
                            title="Live Preview"
                            sandbox="allow-scripts"
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-[#1e1e1e]">
                            <Eye size={40} className="mb-4 opacity-50" />
                            <p>No preview available.</p>
                            <p className="text-sm mt-2">Ask the AI to "Deploy to Preview".</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Bottom Terminal */}
            <div className="h-56 border-t border-[#27272a] flex flex-col bg-[#000000]">
                <Terminal logs={logs} fontSize={appSettings.terminalFontSize} autoScroll={appSettings.autoScrollTerminal} />
            </div>
            </main>
        )}

        {/* Right: AI Chat (Only visible in IDE mode) */}
        {sidebarTab !== 'studio' && (
            <aside className="w-[400px] bg-[#121212] border-l border-[#27272a] flex flex-col shrink-0 z-10 shadow-2xl">
            
            {/* Interactive Agent Avatar */}
            <div className="p-4 bg-gradient-to-b from-[#18181b] to-[#121212] border-b border-[#27272a]">
                <BotAvatar 
                    state={botState} 
                    message={botMessage} 
                    agentName={selectedAgentIds.length === 1 ? agents.find(a => a.id === selectedAgentIds[0])?.name : undefined} 
                />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#121212]">
                {selectedAgentIds.length === 0 && (
                <div className="text-center mt-20 text-gray-600">
                    <Bot size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm">Select an agent to begin</p>
                </div>
                )}
                {mergedMessages.map((m, i) => {
                const showHeader = m.role === 'model' && selectedAgentIds.length > 1;
                let safeContent = "";
                if (typeof m.content === 'string') safeContent = m.content;
                else {
                    try { safeContent = JSON.stringify(m.content || ''); } catch { safeContent = "Error: Non-serializable content."; }
                }
                return (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-[fadeIn_0.3s_ease-out]`}>
                        {showHeader && (
                            <span className="text-[10px] mb-1 px-1 font-bold tracking-wider opacity-80" style={{ color: m.agentColor }}>
                                {m.agentName}
                            </span>
                        )}
                        {m.images && m.images.length > 0 && (
                            <div className="flex gap-2 mb-2 flex-wrap justify-end">
                                {m.images.map((img, idx) => (
                                    <img key={idx} src={img} alt="Uploaded" className="w-20 h-20 object-cover rounded-lg border border-[#333]" />
                                ))}
                            </div>
                        )}
                        {m.role === 'system' ? (
                        <div className="w-full bg-[#18181b] p-3 rounded-lg border border-dashed border-[#333] text-xs text-gray-500 font-mono mb-2">
                            <span className="text-yellow-600 font-bold">SYSTEM:</span> {safeContent}
                        </div>
                        ) : (
                            <div className={`max-w-[95%] p-3.5 rounded-2xl text-sm leading-6 shadow-sm whitespace-pre-wrap ${
                            m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 
                            safeContent.startsWith('❌') ? 'bg-red-900/20 text-red-300 border border-red-900/50' :
                            'bg-[#27272a] text-gray-200 rounded-bl-sm border border-[#333]'
                            }`}>
                            {safeContent}
                            </div>
                        )}
                    </div>
                );
                })}
            </div>

            <div className="p-4 bg-[#121212] border-t border-[#27272a]">
                {chatImages.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                        {chatImages.map((img, i) => (
                            <div key={i} className="relative group">
                                <img src={img} alt="preview" className="h-16 w-16 object-cover rounded-md border border-[#333]" />
                                <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition">
                                    <span className="sr-only">Remove</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative">
                <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    disabled={selectedAgentIds.length === 0 || isProcessing}
                    placeholder={selectedAgentIds.length > 0 ? "Ask the agent to build something..." : "Select an agent first..."}
                    className="w-full bg-[#18181b] text-sm text-gray-100 rounded-xl p-4 pr-12 focus:outline-none border border-[#27272a] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-900/30 resize-none h-28 transition-all placeholder:text-gray-600"
                />
                
                <div className="absolute left-3 bottom-3 flex gap-2">
                    <label className="cursor-pointer p-2 text-gray-500 hover:text-blue-400 hover:bg-[#27272a] rounded-lg transition flex items-center justify-center" title="Upload Image">
                        <ImageIcon size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <button onClick={handleScreenCapture} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-[#27272a] rounded-lg transition flex items-center justify-center" title="Capture Screen for AI">
                        <Monitor size={18} />
                    </button>
                </div>

                {isProcessing ? (
                    <button 
                    onClick={handleStop}
                    className="absolute right-3 bottom-3 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition border border-red-500/20"
                    title="Stop"
                    >
                    <StopIcon size={18} fill="currentColor" />
                    </button>
                ) : (
                    <button 
                    onClick={handleSendMessage}
                    disabled={(!chatInput.trim() && chatImages.length === 0) || selectedAgentIds.length === 0}
                    className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-900/20"
                    >
                    <Play size={18} fill="currentColor" />
                    </button>
                )}
                </div>
                <div className="text-[10px] text-gray-600 mt-2 text-center font-medium">
                Multi-Modal Support • Auto-Preview Deployment • Agentic Workflow
                </div>
            </div>
            </aside>
        )}
      </div>

      {showSettings && (
        <Settings 
          keys={keys} 
          agents={agents} 
          onSaveKeys={handleSaveKeys} 
          onSaveAgents={handleSaveAgents} 
          onClose={handleCloseSettings} 
        />
      )}
    </div>
  );
}
