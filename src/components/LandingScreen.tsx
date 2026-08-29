import { motion } from 'framer-motion';
import { ArrowRight, Radio, Lock } from 'lucide-react';
import { Vault3D } from './Vault3D';

const PIPELINE_STEPS = [
  { n: '01', label: 'Parse', detail: 'pdf.js reads every page locally' },
  { n: '02', label: 'Chunk', detail: '512 tokens, sentence-aware' },
  { n: '03', label: 'Embed', detail: 'MiniLM-L6, 384 dimensions' },
  { n: '04', label: 'Retrieve', detail: 'BM25 + cosine fusion' },
  { n: '05', label: 'Generate', detail: 'Qwen2.5 on WebGPU' },
];

interface LandingScreenProps {
  onEnter: () => void;
}

export function LandingScreen({ onEnter }: LandingScreenProps) {
  return (
    <div className="relative min-h-screen bg-ink text-paper overflow-hidden">
      {/* Signature 3D element, positioned as ambient background-right rather
          than a boxed hero image — the vault feels like it inhabits the
          page rather than illustrating it. */}
      <Vault3D className="absolute inset-y-0 right-[-10%] w-[70%] md:w-[55%] opacity-90" />

      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/95 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen px-6 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between py-8">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 border border-line-strong rounded-sm flex items-center justify-center">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <span className="font-[var(--font-display)] font-semibold tracking-tight text-lg">
              NEXUS ZERO
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-dim tracking-wide uppercase">
            <Radio className="h-3 w-3" />
            <span>Zero network egress</span>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center max-w-2xl py-12">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-xs tracking-[0.2em] uppercase text-dim mb-6"
          >
            On-device document intelligence
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-[var(--font-display)] font-semibold leading-[0.95] tracking-tight text-[clamp(2.5rem,7vw,5rem)]"
          >
            Sealed from
            <br />
            the network.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-dim text-base sm:text-lg leading-relaxed max-w-lg"
          >
            Every document you upload is parsed, indexed, and queried entirely
            inside this browser tab. Nothing you write, upload, or ask ever
            reaches a server — offshore, underground, or offline entirely.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={onEnter}
            className="group mt-10 inline-flex items-center gap-3 self-start rounded-full border border-line-strong bg-surface px-6 py-3.5 text-sm font-medium tracking-wide hover:bg-paper hover:text-ink transition-colors duration-300"
          >
            Enter workspace
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </main>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="pb-10"
        >
          <div className="flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
            {PIPELINE_STEPS.map((step) => (
              <div key={step.n} className="min-w-[9rem]">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-faint">{step.n}</span>
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                <p className="text-xs text-faint mt-0.5">{step.detail}</p>
              </div>
            ))}
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
