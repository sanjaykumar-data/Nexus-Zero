import { AnimatePresence, motion } from 'framer-motion';
import { X, Sliders, Cpu, Sparkles, HardDrive, RotateCcw, Box } from 'lucide-react';
import type { SearchSettings } from '../types';
import { AVAILABLE_MODELS } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SearchSettings;
  onUpdateSettings: (newSettings: SearchSettings) => void;
  onClearDatabase: () => void;
  onChangeModel: (modelId: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearDatabase,
  onChangeModel,
}: SettingsModalProps) {
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
            className="relative w-full max-w-xl overflow-hidden rounded-xl bg-panel border border-line-strong shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-line-strong text-paper">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-paper">Engine &amp; retrieval settings</h3>
                  <p className="text-xs text-faint font-mono">Select the on-device LLM and tune hybrid retrieval</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-md text-faint hover:text-paper hover:bg-surface transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-dim flex items-center gap-1.5 font-mono">
                  <Box className="h-4 w-4" />
                  Active on-device LLM
                </label>
                <div className="grid gap-2">
                  {AVAILABLE_MODELS.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => {
                        onUpdateSettings({ ...settings, selectedModel: model.id });
                        onChangeModel(model.id);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between ${
                        settings.selectedModel === model.id
                          ? 'border-paper bg-surface'
                          : 'border-line bg-ink hover:border-line-strong hover:bg-surface'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-paper">{model.name}</span>
                          {model.recommended && (
                            <span className="text-[10px] bg-surface text-dim border border-line-strong px-1.5 py-0.2 rounded font-mono">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-faint">{model.description}</p>
                      </div>
                      <div className="text-right shrink-0 font-mono text-xs">
                        <span className="text-paper font-medium">{model.size}</span>
                        <span className="block text-[10px] text-faint mt-0.5">VRAM ~{model.vram}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-line">
                <div className="flex justify-between text-xs font-mono text-dim">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Top-K retrieved passages
                  </span>
                  <span className="font-bold text-paper">{settings.topK}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={settings.topK}
                  onChange={(e) => onUpdateSettings({ ...settings, topK: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-line rounded-full appearance-none cursor-pointer accent-white"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-dim">
                  <span>Hybrid balance (BM25 vs. vector cosine)</span>
                  <span className="font-bold text-paper">
                    {(settings.bm25Weight * 100).toFixed(0)}% / {(settings.cosineWeight * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.bm25Weight}
                  onChange={(e) => {
                    const bm25 = parseFloat(e.target.value);
                    const cosine = parseFloat((1 - bm25).toFixed(2));
                    onUpdateSettings({ ...settings, bm25Weight: bm25, cosineWeight: cosine });
                  }}
                  className="w-full h-1.5 bg-line rounded-full appearance-none cursor-pointer accent-white"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-dim">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    LLM temperature
                  </span>
                  <span className="font-bold text-paper">{settings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) => onUpdateSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-line rounded-full appearance-none cursor-pointer accent-white"
                />
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-paper flex items-center gap-1.5 font-mono">
                    <HardDrive className="h-4 w-4" />
                    IndexedDB storage
                  </h4>
                  <p className="text-[11px] text-faint font-mono">Clear cached documents, vectors &amp; model weights</p>
                </div>
                <button
                  onClick={onClearDatabase}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-danger-bg border border-danger/40 text-danger hover:bg-danger-bg/70 text-xs font-mono transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset cache
                </button>
              </div>
            </div>

            <div className="border-t border-line p-4 flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-2 text-paper text-sm font-medium transition-colors">
                Apply &amp; close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
