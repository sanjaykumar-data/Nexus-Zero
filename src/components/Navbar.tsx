import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Cpu, Activity, Settings2, Database, WifiOff, Wifi } from 'lucide-react';
import type { NetworkStats } from '../types';

function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return isOnline;
}

interface NavbarProps {
  networkStats: NetworkStats;
  isWebGPUReady: boolean;
  isEmbeddingReady: boolean;
  isLLMLoading: boolean;
  llmProgress: { progress: number; text: string };
  onOpenSettings: () => void;
  onOpenNetwork: () => void;
}

export function Navbar({
  networkStats,
  isWebGPUReady,
  isEmbeddingReady,
  isLLMLoading,
  llmProgress,
  onOpenSettings,
  onOpenNetwork,
}: NavbarProps) {
  const isOnline = useOnlineStatus();

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-40 w-full border-b border-line bg-ink/90 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-line-strong text-paper">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-[var(--font-display)] font-semibold tracking-tight text-white text-base">
                NEXUS ZERO
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wide uppercase border ${
                  isOnline ? 'border-line text-faint' : 'border-line-strong text-paper'
                }`}
                title={isOnline ? 'Browser reports a network connection' : 'No network connection — app still fully functional'}
              >
                {isOnline ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                {isOnline ? 'Online' : 'Offline — running'}
              </span>
            </div>
            <p className="text-[11px] text-faint font-mono">On-device document intelligence</p>
          </div>
        </div>

        {isLLMLoading && (
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full border border-line bg-surface">
            <div className="h-1.5 w-1.5 rounded-full bg-paper animate-pulse" />
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-[11px] font-mono text-dim gap-4">
                <span className="truncate max-w-[200px]">{llmProgress.text || 'Loading model weights...'}</span>
                <span className="font-semibold text-paper">{Math.round(llmProgress.progress * 100)}%</span>
              </div>
              <div className="w-48 h-[3px] bg-line rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-paper transition-all duration-300"
                  style={{ width: `${llmProgress.progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNetwork}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-line bg-surface hover:border-line-strong hover:bg-surface-2 transition-colors group"
            title="Inspect live network activity across every worker"
          >
            <Activity className="h-4 w-4 text-paper group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="text-[10px] uppercase font-mono text-faint">Net egress</div>
              <div className="text-xs font-mono font-bold text-paper">{networkStats.totalRequests} calls</div>
            </div>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line bg-surface text-xs font-mono">
            <div className="flex items-center gap-1.5" title={isEmbeddingReady ? 'Embedding model ready' : 'Loading embedding model'}>
              <Database className={`h-3.5 w-3.5 ${isEmbeddingReady ? 'text-paper' : 'text-faint animate-spin'}`} />
              <span className="text-dim">Embed</span>
            </div>
            <span className="text-line-strong">|</span>
            <div className="flex items-center gap-1.5" title={isWebGPUReady ? 'WebGPU engine ready' : 'Initializing WebGPU'}>
              <Cpu className={`h-3.5 w-3.5 ${isWebGPUReady ? 'text-paper' : 'text-faint animate-pulse'}`} />
              <span className="text-dim">WebGPU</span>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-md border border-line bg-surface text-dim hover:text-paper hover:border-line-strong transition-colors"
            aria-label="Settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
