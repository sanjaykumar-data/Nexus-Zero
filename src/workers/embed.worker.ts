import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';
import type { MainToWorker2, Worker2ToMain, EmbeddedChunk } from '../types';
import { hybridSearch } from '../services/retrieval';
import { installFetchInterceptor } from '../services/telemetry';

// FIX: this worker downloads the ONNX embedding model over the network the
// first time it runs. That fetch happens inside THIS worker's own global
// scope, not the main thread's — the original build's telemetry only
// patched window.fetch and never saw it. Reporting it here makes the
// "zero egress after load" claim actually verifiable end to end.
installFetchInterceptor('embed-worker', (event) => {
  self.postMessage({ type: 'networkEvent', event } satisfies Worker2ToMain);
});

env.allowLocalModels = false;
env.useBrowserCache = true;

const indexedDocs = new Map<string, EmbeddedChunk[]>();
let embedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
  }
  return embedder;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

self.onmessage = async (e: MessageEvent<MainToWorker2>) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      await getEmbedder();
      self.postMessage({ type: 'modelReady' } satisfies Worker2ToMain);
    } else if (msg.type === 'loadCachedDocs') {
      for (const doc of msg.docs) {
        indexedDocs.set(doc.docId, doc.chunks);
      }
    } else if (msg.type === 'deleteDoc') {
      indexedDocs.delete(msg.docId);
    } else if (msg.type === 'embedChunks') {
      const { docId, chunks } = msg;
      const extractor = await getEmbedder();
      const embeddedChunks: EmbeddedChunk[] = [];
      const BATCH_SIZE = 8;
      const EMBED_DIM = 384;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const texts = batch.map((c) => c.text);
        const output = await extractor(texts, { pooling: 'mean', normalize: true });
        const flat = output.data as Float32Array;

        for (let j = 0; j < batch.length; j++) {
          const startIdx = j * EMBED_DIM;
          const embedding = Array.from(flat.slice(startIdx, startIdx + EMBED_DIM));
          embeddedChunks.push({ ...batch[j], embedding });
        }

        self.postMessage({
          type: 'embedProgress',
          docId,
          chunksDone: Math.min(i + BATCH_SIZE, chunks.length),
          chunksTotal: chunks.length,
        } satisfies Worker2ToMain);
      }

      indexedDocs.set(docId, embeddedChunks);
      self.postMessage({ type: 'embedDone', docId, embeddedChunks } satisfies Worker2ToMain);
    } else if (msg.type === 'search') {
      const { query, settings } = msg;
      const queryEmbedding = await generateEmbedding(query);

      const allChunks: EmbeddedChunk[] = [];
      for (const docChunks of indexedDocs.values()) allChunks.push(...docChunks);

      const results = hybridSearch(query, queryEmbedding, allChunks, settings);
      self.postMessage({ type: 'searchResult', query, results } satisfies Worker2ToMain);
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      docId: 'docId' in msg ? (msg as { docId?: string }).docId : undefined,
      message: err instanceof Error ? err.message : 'Embedding worker error.',
    } satisfies Worker2ToMain);
  }
};
