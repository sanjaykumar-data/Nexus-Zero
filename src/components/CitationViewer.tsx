import { AnimatePresence, motion } from 'framer-motion';
import { X, FileText, CheckCircle2, Bookmark, BarChart3, Hash } from 'lucide-react';
import type { RetrievalResult } from '../types';

interface CitationViewerProps {
  citation: RetrievalResult | null;
  onClose: () => void;
}

export function CitationViewer({ citation, onClose }: CitationViewerProps) {
  return (
    <AnimatePresence>
      {citation && (
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
                  <Bookmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-paper flex items-center gap-2">
                    Source citation
                    <span className="text-xs px-2 py-0.5 rounded bg-surface border border-line text-dim font-mono">
                      Page {citation.chunk.pageNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-faint font-mono truncate max-w-sm">{citation.chunk.docName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-md text-faint hover:text-paper hover:bg-surface transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-surface border border-line">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-faint uppercase flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Fused rank
                  </span>
                  <span className="text-lg font-bold font-mono text-paper">{(citation.fusionScore * 100).toFixed(1)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-faint uppercase">BM25 keyword</span>
                  <span className="text-lg font-bold font-mono text-dim">{(citation.bm25Score * 100).toFixed(1)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-faint uppercase">Vector cosine</span>
                  <span className="text-lg font-bold font-mono text-dim">{(citation.cosineScore * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-faint">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    Raw chunk passage
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {citation.chunk.tokenCount} estimated tokens
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-ink border border-line text-sm leading-relaxed text-paper whitespace-pre-wrap">
                  {citation.chunk.text}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-line text-xs text-dim font-mono">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-paper" />
                <span>Retrieved 100% locally from browser in-memory vector space. Zero telemetry emitted.</span>
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
