export interface ModelOption {
  id: string;
  name: string;
  size: string;
  vram: string;
  description: string;
  recommended?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (1.5B)',
    size: '950 MB',
    vram: '1.2 GB',
    description: 'Fast, accurate reasoning for technical and safety manuals. Recommended default.',
    recommended: true,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (0.5B Ultra-Fast)',
    size: '380 MB',
    vram: '600 MB',
    description: 'Lightweight model for low-spec laptops or mobile browsers.',
  },
  {
    id: 'SmolLM2-1.35B-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 (1.35B)',
    size: '890 MB',
    vram: '1.1 GB',
    description: 'Optimized on-device instruction model by Hugging Face.',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 (1B)',
    size: '880 MB',
    vram: '1.1 GB',
    description: 'Compact Meta architecture for summarization and factual Q&A.',
  },
];

export interface DocMeta {
  docId: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  chunkCount: number;
  createdAt: number;
  status: 'parsing' | 'embedding' | 'indexing' | 'ready' | 'error';
  errorMessage?: string;
}

export interface Chunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  pageNumber: number;
  tokenCount: number;
}

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

export interface RetrievalResult {
  chunk: Chunk;
  bm25Score: number;
  cosineScore: number;
  fusionScore: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  citations?: RetrievalResult[];
  isStreaming?: boolean;
  isError?: boolean;
}

export interface SearchSettings {
  topK: number;
  bm25Weight: number;
  cosineWeight: number;
  temperature: number;
  selectedModel: string;
}

export interface NetworkEvent {
  url: string;
  method: string;
  bodyBytes: number;
  timestamp: number;
  source: 'main' | 'embed-worker' | 'llm-worker';
}

export interface NetworkStats {
  totalRequests: number;
  egressBytes: number;
  history: NetworkEvent[];
}

// A network event can be reported by ANY thread (main or a worker), since
// model/asset downloads happen inside the workers, not the main thread.
// This is what makes the "zero egress" panel actually true instead of
// only reflecting main-thread activity.
export interface NetworkEventMessage {
  type: 'networkEvent';
  event: NetworkEvent;
}

export type MainToWorker1 = {
  type: 'parse';
  docId: string;
  fileName: string;
  fileData: ArrayBuffer;
};

export type Worker1ToMain =
  | { type: 'progress'; docId: string; page: number; totalPages: number }
  | {
      type: 'done';
      docId: string;
      fileName: string;
      pages: { pageNumber: number; text: string }[];
    }
  | { type: 'error'; docId: string; message: string };

export type MainToWorker2 =
  | { type: 'init' }
  | { type: 'embedChunks'; docId: string; docName: string; chunks: Chunk[] }
  | { type: 'loadCachedDocs'; docs: { docId: string; chunks: EmbeddedChunk[] }[] }
  | { type: 'search'; query: string; settings: SearchSettings }
  | { type: 'deleteDoc'; docId: string };

export type Worker2ToMain =
  | { type: 'modelReady' }
  | { type: 'embedProgress'; docId: string; chunksDone: number; chunksTotal: number }
  | { type: 'embedDone'; docId: string; embeddedChunks: EmbeddedChunk[] }
  | { type: 'searchResult'; query: string; results: RetrievalResult[] }
  | { type: 'error'; docId?: string; message: string }
  | NetworkEventMessage;

export type MainToWorker3 =
  | { type: 'init'; modelId: string }
  | {
      type: 'generate';
      systemPrompt: string;
      userPrompt: string;
      temperature?: number;
    }
  | { type: 'interrupt' };

export type Worker3ToMain =
  | { type: 'modelLoading'; progress: number; text: string }
  | { type: 'modelReady' }
  | { type: 'token'; text: string }
  | { type: 'generationDone'; totalTokens?: number }
  | { type: 'webgpuUnavailable'; error: string }
  | { type: 'error'; message: string }
  | NetworkEventMessage;
