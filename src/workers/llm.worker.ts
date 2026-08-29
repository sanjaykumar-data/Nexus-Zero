import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm';
import type { MainToWorker3, Worker3ToMain } from '../types';
import { installFetchInterceptor } from '../services/telemetry';

// FIX: same reasoning as embed.worker.ts — the multi-hundred-MB model
// shard download happens inside this worker. Without this, the "Network
// Activity" panel would show 0 requests even while downloading a live
// model, which is worse than no panel at all: it actively misleads.
installFetchInterceptor('llm-worker', (event) => {
  self.postMessage({ type: 'networkEvent', event } satisfies Worker3ToMain);
});

let engine: MLCEngine | null = null;
let isInterrupted = false;
const DEFAULT_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

async function initEngine(modelId: string) {
  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (report) => {
      self.postMessage({
        type: 'modelLoading',
        progress: report.progress,
        text: report.text,
      } satisfies Worker3ToMain);
    },
  });
}

self.onmessage = async (e: MessageEvent<MainToWorker3>) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      if (!('gpu' in navigator)) {
        self.postMessage({
          type: 'webgpuUnavailable',
          error:
            'WebGPU is not available in this browser. Try the latest Chrome or Edge with hardware acceleration enabled.',
        } satisfies Worker3ToMain);
        return;
      }
      await initEngine(msg.modelId || DEFAULT_MODEL);
      self.postMessage({ type: 'modelReady' } satisfies Worker3ToMain);
    } else if (msg.type === 'generate') {
      if (!engine) throw new Error('LLM engine is not initialized yet.');
      isInterrupted = false;

      // FIX: pass system and user content as separate chat messages and let
      // web-llm apply the model's own chat template. The original build
      // built a full hand-rolled ChatML string (including <|im_start|>
      // tags) and passed the whole thing as one user-role message, which
      // the engine's own templating would wrap a second time.
      const completion = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: msg.systemPrompt },
          { role: 'user', content: msg.userPrompt },
        ],
        temperature: msg.temperature ?? 0.2,
        stream: true,
      });

      for await (const chunk of completion) {
        if (isInterrupted) break;
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          self.postMessage({ type: 'token', text: delta } satisfies Worker3ToMain);
        }
      }

      self.postMessage({ type: 'generationDone' } satisfies Worker3ToMain);
    } else if (msg.type === 'interrupt') {
      isInterrupted = true;
      if (engine) await engine.interruptGenerate();
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'LLM worker error.',
    } satisfies Worker3ToMain);
  }
};
