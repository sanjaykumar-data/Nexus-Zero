import { AnimatePresence, motion } from 'framer-motion';
import { X, ShieldCheck, Activity, Radio, Lock, RefreshCw } from 'lucide-react';
import type { NetworkStats } from '../types';

interface NetworkPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: NetworkStats;
  onReset: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0.00 KB';
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function NetworkPanel({ isOpen, onClose, stats, onReset }: NetworkPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-panel border border-line-strong shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-line-strong text-paper">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-paper">Zero-egress network radar</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface border border-line-strong text-paper">
                      <Lock className="h-3 w-3" />
                      Air-gapped
                    </span>
                  </div>
                  <p className="text-xs text-faint font-mono">Tracks fetch calls from the main thread and every worker</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-md text-faint hover:text-paper hover:bg-surface transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-surface border border-line flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-faint mb-2">
                    <Activity className="h-4 w-4" />
                    Total requests
                  </div>
                  <span className="text-3xl font-extrabold font-mono text-paper">{stats.totalRequests}</span>
                  <p className="text-[11px] text-faint font-mono mt-1">Should rise only during first-time model download — never during Q&amp;A</p>
                </div>
                <div className="p-4 rounded-lg bg-surface border border-line flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-faint mb-2">
                    <Radio className="h-4 w-4" />
                    Request body sent
                  </div>
                  <span className="text-3xl font-extrabold font-mono text-paper">{formatBytes(stats.egressBytes)}</span>
                  <p className="text-[11px] text-faint font-mono mt-1">Document text and prompts never leave this device</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface border border-line space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-paper flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="h-4 w-4" />
                  Deadzone / privacy wall guarantee
                </h4>
                <p className="text-xs text-dim leading-relaxed">
                  Ingested documents and embeddings stay in this browser tab's memory and IndexedDB. Every entry below
                  is a request downloading model weights on first load, cached afterward — no document content is
                  ever sent anywhere.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-faint">
                  <span>Request log (most recent first)</span>
                  <button onClick={onReset} className="flex items-center gap-1 hover:text-paper transition-colors">
                    <RefreshCw className="h-3 w-3" />
                    Reset counter
                  </button>
                </div>
                <div className="p-4 rounded-lg bg-ink border border-line text-xs font-mono space-y-2 min-h-[100px]">
                  {stats.history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 h-full py-6 text-faint">
                      <Lock className="h-6 w-6" />
                      <span>No network requests recorded this session</span>
                    </div>
                  ) : (
                    <div className="w-full space-y-2">
                      {stats.history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-[11px] text-dim border-b border-line pb-1.5">
                          <span className="font-bold text-paper shrink-0">{h.method}</span>
                          <span className="truncate flex-1" title={h.url}>{h.url}</span>
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-surface text-faint border border-line">{h.source}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-line p-4 flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-2 text-paper text-sm font-medium transition-colors">
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
