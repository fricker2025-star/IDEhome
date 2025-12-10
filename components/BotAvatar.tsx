import React from 'react';
import { Bot, Zap, Code2, BrainCircuit, CheckCircle2, AlertOctagon } from 'lucide-react';

export type BotState = 'idle' | 'thinking' | 'coding' | 'success' | 'error';

interface BotAvatarProps {
  state: BotState;
  message?: string;
  agentName?: string;
}

export const BotAvatar: React.FC<BotAvatarProps> = ({ state, message, agentName }) => {
  
  const getStateConfig = () => {
    switch (state) {
      case 'thinking':
        return {
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/50',
          icon: <BrainCircuit size={32} className="animate-pulse" />,
          status: 'PLANNING',
          animation: 'animate-[float_3s_ease-in-out_infinite]'
        };
      case 'coding':
        return {
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/50',
          icon: <Code2 size={32} className="animate-bounce" />,
          status: 'CODING',
          animation: 'animate-[pulse_1s_ease-in-out_infinite]'
        };
      case 'success':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/50',
          icon: <CheckCircle2 size={32} />,
          status: 'READY',
          animation: ''
        };
      case 'error':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/50',
          icon: <AlertOctagon size={32} />,
          status: 'ERROR',
          animation: 'animate-shake'
        };
      default: // idle
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-800/50',
          borderColor: 'border-gray-700',
          icon: <Bot size={32} />,
          status: 'IDLE',
          animation: 'hover:animate-[float_4s_ease-in-out_infinite]'
        };
    }
  };

  const config = getStateConfig();

  return (
    <div className={`relative flex items-center gap-4 p-4 rounded-xl border backdrop-blur-sm transition-all duration-500 ${config.bgColor} ${config.borderColor} ${config.animation}`}>
      
      {/* Avatar Circle */}
      <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 ${config.borderColor} bg-black/40 shadow-xl`}>
        <div className={`${config.color} transition-all duration-500`}>
           {config.icon}
        </div>
        
        {/* Status Indicator Dot */}
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1e1e1e] ${
            state === 'thinking' ? 'bg-purple-500 animate-ping' :
            state === 'coding' ? 'bg-blue-500 animate-pulse' :
            state === 'success' ? 'bg-green-500' :
            state === 'error' ? 'bg-red-500' : 'bg-gray-500'
        }`} />
      </div>

      {/* Message Bubble */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold tracking-wider ${config.color}`}>
                {agentName ? agentName.toUpperCase() : 'AI AGENT'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-gray-400 border border-gray-700/50">
                {config.status}
            </span>
        </div>
        <div className="text-sm text-gray-200 leading-tight font-medium truncate">
             {message || (state === 'idle' ? "Awaiting instructions..." : "Processing...")}
        </div>
        {state === 'coding' && (
            <div className="mt-1 flex gap-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-[typing_1s_infinite_0ms]" />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-[typing_1s_infinite_200ms]" />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-[typing_1s_infinite_400ms]" />
            </div>
        )}
      </div>
      
      {/* Background Glow Effect */}
      {state !== 'idle' && (
        <div className={`absolute inset-0 rounded-xl opacity-20 blur-xl -z-10 ${
            state === 'thinking' ? 'bg-purple-600' :
            state === 'coding' ? 'bg-blue-600' :
            state === 'success' ? 'bg-green-600' :
            state === 'error' ? 'bg-red-600' : ''
        }`} />
      )}
    </div>
  );
};