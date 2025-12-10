
import React, { useState, useEffect } from 'react';
import { StoredKey, AgentConfig, AIProvider, FALLBACK_MODELS, AppSettings } from '../types';
import { Key, Bot, Sliders, Trash2, Edit, Save, Plus, X } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storage';

interface SettingsProps {
  keys: StoredKey[];
  agents: AgentConfig[];
  onSaveKeys: (keys: StoredKey[]) => void;
  onSaveAgents: (agents: AgentConfig[]) => void;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ keys, agents, onSaveKeys, onSaveAgents, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'keys' | 'agents'>('agents');

  // -- Global Settings --
  const [appSettings, setAppSettings] = useState<AppSettings>(storageService.getSettings());

  const handleSaveAppSettings = () => {
    storageService.saveSettings(appSettings);
    // Force reload/re-render of parent might be needed if state isn't lifted, 
    // but standard React flow will handle it if App passes these down.
    // Ideally we assume App.tsx re-reads or we pass a callback, but for now we save.
    // In a real app we'd pass onSaveSettings prop.
  };

  // -- Keys State --
  const [localKeys, setLocalKeys] = useState<StoredKey[]>(keys);
  const [newKeyAlias, setNewKeyAlias] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState<AIProvider>('google');

  // -- Agents State --
  const [localAgents, setLocalAgents] = useState<AgentConfig[]>(agents);
  const [isEditingAgent, setIsEditingAgent] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  // Form State
  const [agentForm, setAgentForm] = useState<{
    name: string;
    keyId: string;
    model: string;
    rootPath: string;
    systemPrompt: string;
    temperature: number;
    maxContextHistory: number;
  }>({
    name: '',
    keyId: '',
    model: '',
    rootPath: '.',
    systemPrompt: 'You are a helpful coding assistant.',
    temperature: 0.7,
    maxContextHistory: 10
  });

  // Dynamic Model Fetching State
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');

  // Effect: Fetch models when the selected Key ID changes
  useEffect(() => {
    async function loadModels() {
        if (!agentForm.keyId) {
            setFetchedModels([]);
            return;
        }

        const keyConfig = localKeys.find(k => k.id === agentForm.keyId);
        if (!keyConfig) return;

        setIsLoadingModels(true);
        setModelError('');
        setFetchedModels([]);

        try {
            const models = await geminiService.fetchModels(keyConfig.provider, keyConfig.key);
            
            if (models.length > 0) {
                setFetchedModels(models);
                if (!agentForm.model) {
                   setAgentForm(prev => ({ ...prev, model: models[0] }));
                }
            } else {
                // Fallback
                const fallbacks = FALLBACK_MODELS[keyConfig.provider] || [];
                setFetchedModels(fallbacks);
                if (fallbacks.length > 0 && !agentForm.model) {
                    setAgentForm(prev => ({ ...prev, model: fallbacks[0] }));
                }
                if (!['puter', 'pollinations'].includes(keyConfig.provider)) {
                   setModelError("Could not fetch models. Using defaults.");
                }
            }
        } catch (e) {
            console.error(e);
            const fallbacks = FALLBACK_MODELS[keyConfig.provider] || [];
            setFetchedModels(fallbacks);
            if (fallbacks.length > 0 && !agentForm.model) {
                setAgentForm(prev => ({ ...prev, model: fallbacks[0] }));
            }
            setModelError("Error fetching models. Using defaults.");
        } finally {
            setIsLoadingModels(false);
        }
    }

    loadModels();
  }, [agentForm.keyId, localKeys]);

  // -- Handlers --

  const handleAddKey = () => {
    if (!newKeyAlias) return;
    const isOptionalKey = ['puter', 'pollinations'].includes(newKeyProvider);
    if (!isOptionalKey && !newKeyValue) return;

    const newKey: StoredKey = {
      id: crypto.randomUUID(),
      alias: newKeyAlias,
      key: newKeyValue,
      provider: newKeyProvider
    };
    const updated = [...localKeys, newKey];
    setLocalKeys(updated);
    onSaveKeys(updated);
    setNewKeyAlias('');
    setNewKeyValue('');
  };

  const handleDeleteKey = (id: string) => {
    const updated = localKeys.filter(k => k.id !== id);
    setLocalKeys(updated);
    onSaveKeys(updated);
  };

  const handleEditAgent = (agent: AgentConfig) => {
      setIsEditingAgent(true);
      setEditingAgentId(agent.id);
      setAgentForm({
          name: agent.name,
          keyId: agent.keyId,
          model: agent.model,
          rootPath: agent.rootPath,
          systemPrompt: agent.systemPrompt,
          temperature: agent.temperature ?? 0.7,
          maxContextHistory: agent.maxContextHistory ?? 10
      });
  };

  const handleNewAgent = () => {
      setIsEditingAgent(true);
      setEditingAgentId(null);
      setAgentForm({
        name: '',
        keyId: '',
        model: '',
        rootPath: '.',
        systemPrompt: 'You are a helpful coding assistant.',
        temperature: 0.7,
        maxContextHistory: 10
      });
  };

  const handleSaveAgent = () => {
    if (!agentForm.name || !agentForm.keyId) return;
    
    // Default model if none selected
    let modelToUse = agentForm.model;
    if (!modelToUse && fetchedModels.length > 0) {
        modelToUse = fetchedModels[0];
    }

    const newConfig: AgentConfig = {
      id: editingAgentId || crypto.randomUUID(),
      name: agentForm.name,
      keyId: agentForm.keyId,
      model: modelToUse,
      rootPath: agentForm.rootPath,
      systemPrompt: agentForm.systemPrompt,
      temperature: agentForm.temperature,
      maxContextHistory: agentForm.maxContextHistory
    };

    let updatedAgents;
    if (editingAgentId) {
        updatedAgents = localAgents.map(a => a.id === editingAgentId ? newConfig : a);
    } else {
        updatedAgents = [...localAgents, newConfig];
    }

    setLocalAgents(updatedAgents);
    onSaveAgents(updatedAgents);
    setIsEditingAgent(false);
    setEditingAgentId(null);
  };

  const handleDeleteAgent = (id: string) => {
    const updated = localAgents.filter(a => a.id !== id);
    setLocalAgents(updated);
    onSaveAgents(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e1e] w-[700px] h-[650px] rounded-xl border border-[#333] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex border-b border-[#333]">
          <button 
            onClick={() => setActiveTab('agents')}
            className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'agents' ? 'bg-[#252526] text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Bot size={16} /> Agents
          </button>
          <button 
            onClick={() => setActiveTab('keys')}
            className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'keys' ? 'bg-[#252526] text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Key size={16} /> API Keys
          </button>
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'general' ? 'bg-[#252526] text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Sliders size={16} /> General
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* --- GENERAL TAB --- */}
          {activeTab === 'general' && (
              <div className="space-y-6 text-gray-300">
                  <div className="bg-[#252526] p-4 rounded-lg border border-[#333] space-y-4">
                      <h3 className="font-semibold text-white mb-2">Editor Settings</h3>
                      
                      <div className="flex justify-between items-center">
                          <label className="text-sm">Editor Font Size ({appSettings.editorFontSize}px)</label>
                          <input 
                            type="range" min="10" max="24" 
                            value={appSettings.editorFontSize}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setAppSettings(p => ({ ...p, editorFontSize: val }));
                            }}
                            className="w-40"
                          />
                      </div>
                  </div>

                  <div className="bg-[#252526] p-4 rounded-lg border border-[#333] space-y-4">
                      <h3 className="font-semibold text-white mb-2">Terminal Settings</h3>
                      
                      <div className="flex justify-between items-center">
                          <label className="text-sm">Terminal Font Size ({appSettings.terminalFontSize}px)</label>
                          <input 
                            type="range" min="10" max="20" 
                            value={appSettings.terminalFontSize}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setAppSettings(p => ({ ...p, terminalFontSize: val }));
                            }}
                            className="w-40"
                          />
                      </div>
                      
                      <div className="flex justify-between items-center">
                          <label className="text-sm">Auto-Scroll on Output</label>
                          <button 
                             onClick={() => setAppSettings(p => ({ ...p, autoScrollTerminal: !p.autoScrollTerminal }))}
                             className={`w-12 h-6 rounded-full relative transition-colors ${appSettings.autoScrollTerminal ? 'bg-blue-600' : 'bg-gray-600'}`}
                          >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${appSettings.autoScrollTerminal ? 'left-7' : 'left-1'}`} />
                          </button>
                      </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 text-center mt-8">
                      Application Version 1.2.0 • Local Storage Enabled
                  </div>
              </div>
          )}


          {/* --- KEYS TAB --- */}
          {activeTab === 'keys' && (
            <div className="space-y-6">
              <div className="bg-[#252526] p-4 rounded-lg border border-[#333]">
                <h3 className="text-white text-sm font-semibold mb-3">Add New Provider</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input 
                    placeholder="Alias (e.g. My Free Tier)" 
                    className="bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                    value={newKeyAlias}
                    onChange={e => setNewKeyAlias(e.target.value)}
                  />
                  <select 
                    className="bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white outline-none"
                    value={newKeyProvider}
                    onChange={e => setNewKeyProvider(e.target.value as AIProvider)}
                  >
                    <option value="google">Google Gemini</option>
                    <option value="pollinations">Pollinations.ai</option>
                    <option value="sambanova">SambaNova</option>
                    <option value="cerebras">Cerebras</option>
                    <option value="groq">Groq</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="mistral">Mistral AI</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="puter">Puter.js</option>
                    <option value="huggingface">Hugging Face</option>
                  </select>
                </div>
                
                {!['puter'].includes(newKeyProvider) ? (
                    <input 
                    type="password"
                    placeholder={newKeyProvider === 'pollinations' ? "Optional (Leave empty for free tier)" : "sk-..."}
                    className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none mb-3"
                    value={newKeyValue}
                    onChange={e => setNewKeyValue(e.target.value)}
                    />
                ) : (
                    <div className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-gray-400 italic mb-3">
                        Authentication handled by Puter.com session.
                    </div>
                )}

                <button 
                  onClick={handleAddKey}
                  disabled={!newKeyAlias || (!['puter', 'pollinations'].includes(newKeyProvider) && !newKeyValue)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded py-2 text-sm font-medium transition disabled:opacity-50"
                >
                  Save Provider
                </button>
              </div>

              <div className="space-y-2">
                {localKeys.map(k => (
                  <div key={k.id} className="flex items-center justify-between p-3 bg-[#2d2d2d] rounded border border-[#333]">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{k.alias}</span>
                      <span className="text-xs text-gray-500 uppercase">{k.provider}</span>
                    </div>
                    <button onClick={() => handleDeleteKey(k.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- AGENTS TAB --- */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              
              {!isEditingAgent ? (
                  <>
                    <button onClick={handleNewAgent} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition shadow-lg shadow-purple-900/20">
                        <Plus size={18} /> Create New Agent
                    </button>

                    <div className="space-y-3">
                        {localAgents.map(a => (
                        <div key={a.id} className="p-4 bg-[#2d2d2d] rounded-lg border border-[#333] flex items-start justify-between group hover:border-purple-500/30 transition">
                            <div className="cursor-pointer flex-1" onClick={() => handleEditAgent(a)}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base font-medium text-white group-hover:text-purple-300 transition-colors">{a.name}</span>
                                    <span className="text-xs bg-black/30 px-2 py-0.5 rounded text-gray-400 border border-[#444]">
                                        {localKeys.find(k=>k.id === a.keyId)?.provider || 'Unknown'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">{a.model}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEditAgent(a)} className="p-2 text-gray-500 hover:text-white bg-[#333] rounded hover:bg-[#444] transition">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDeleteAgent(a.id)} className="p-2 text-gray-500 hover:text-red-400 bg-[#333] rounded hover:bg-[#444] transition">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        ))}
                        {localAgents.length === 0 && <div className="text-center text-gray-500 py-8">No agents found. Create one to start coding.</div>}
                    </div>
                  </>
              ) : (
                  <div className="bg-[#252526] p-5 rounded-lg border border-[#333] animate-[fadeIn_0.2s]">
                    <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-3">
                        <h3 className="text-white font-semibold">{editingAgentId ? 'Edit Agent' : 'New Agent'}</h3>
                        <button onClick={() => setIsEditingAgent(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Agent Name</label>
                                <input 
                                    className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                    value={agentForm.name}
                                    onChange={e => setAgentForm({...agentForm, name: e.target.value})}
                                    placeholder="e.g. Backend Dev"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Provider Key</label>
                                <select 
                                    className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white outline-none"
                                    value={agentForm.keyId}
                                    onChange={e => setAgentForm({...agentForm, keyId: e.target.value})}
                                >
                                    <option value="">Select Key...</option>
                                    {localKeys.map(k => (
                                        <option key={k.id} value={k.id}>{k.alias} ({k.provider})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs text-gray-400">Model</label>
                                {isLoadingModels && <span className="text-xs text-blue-400 animate-pulse">Fetching...</span>}
                                {modelError && <span className="text-xs text-yellow-500">{modelError}</span>}
                            </div>
                            <select 
                                className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white outline-none"
                                value={agentForm.model}
                                onChange={e => setAgentForm({...agentForm, model: e.target.value})}
                                disabled={!agentForm.keyId || isLoadingModels}
                            >
                                {fetchedModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        
                        {/* Advanced Tuning */}
                        <div className="grid grid-cols-2 gap-4 bg-[#1e1e1e] p-3 rounded border border-[#333]">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-gray-400">Temperature</label>
                                    <span className="text-xs text-blue-400 font-mono">{agentForm.temperature}</span>
                                </div>
                                <input 
                                    type="range" min="0" max="2" step="0.1"
                                    className="w-full accent-purple-500"
                                    value={agentForm.temperature}
                                    onChange={e => setAgentForm({...agentForm, temperature: parseFloat(e.target.value)})}
                                />
                                <p className="text-[10px] text-gray-600">Lower = More precise, Higher = More creative.</p>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-gray-400">Context Depth</label>
                                    <span className="text-xs text-blue-400 font-mono">{agentForm.maxContextHistory} msgs</span>
                                </div>
                                <input 
                                    type="range" min="2" max="30" step="2"
                                    className="w-full accent-purple-500"
                                    value={agentForm.maxContextHistory}
                                    onChange={e => setAgentForm({...agentForm, maxContextHistory: parseInt(e.target.value)})}
                                />
                                <p className="text-[10px] text-gray-600">Limit history to save tokens.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Working Directory</label>
                            <input 
                                className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                value={agentForm.rootPath}
                                onChange={e => setAgentForm({...agentForm, rootPath: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">System Instructions</label>
                            <textarea 
                                className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none h-24 resize-none"
                                value={agentForm.systemPrompt}
                                onChange={e => setAgentForm({...agentForm, systemPrompt: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setIsEditingAgent(false)} className="flex-1 py-2 bg-[#333] hover:bg-[#444] text-white rounded text-sm transition">Cancel</button>
                            <button onClick={handleSaveAgent} disabled={!agentForm.name || !agentForm.keyId} className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition disabled:opacity-50">Save Agent</button>
                        </div>
                    </div>
                  </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#252526] p-4 border-t border-[#333] flex justify-between items-center">
          <span className="text-xs text-gray-500 italic">Settings are saved automatically.</span>
          <button onClick={() => { handleSaveAppSettings(); onClose(); }} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition font-medium">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};