import { useState, useEffect, useRef, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { UploadZone } from './components/UploadZone';
import { ChatInterface } from './components/ChatInterface';
import { CitationViewer } from './components/CitationViewer';
import { NetworkPanel } from './components/NetworkPanel';
import { SettingsModal } from './components/SettingsModal';
import type {
  DocMeta,
  EmbeddedChunk,
  RetrievalResult,
  ChatMessage,
  SearchSettings,
  NetworkStats,
  Worker1ToMain,
  Worker2ToMain,
  Worker3ToMain,
} from './types';
import { chunkPages, computeFileHash } from './services/chunker';
import {
  saveDocument,
  getAllDocuments,
  saveChunks,
  getAllEmbeddedChunks,
  deleteDocument,
  clearAllData,
} from './services/db';
import { buildRagPrompt } from './services/prompt';
import { telemetry, installFetchInterceptor } from './services/telemetry';

// FIX: the main thread's own fetch calls (if any — e.g. favicon, dev-server
// HMR pings) are tracked the same way as the workers', through the same
// isomorphic interceptor, feeding the same aggregating store.
installFetchInterceptor('main', (event) => telemetry.recordEvent(event));

const DEFAULT_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

export default function Workspace() {
  const [documents, setDocuments] = useState<DocMeta[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<RetrievalResult | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNetworkPanelOpen, setIsNetworkPanelOpen] = useState(false);
  const [networkStats, setNetworkStats] = useState<NetworkStats>(telemetry.getStats());

  const [isEmbeddingReady, setIsEmbeddingReady] = useState(false);
  const [isWebGPUReady, setIsWebGPUReady] = useState(false);
  const [isLLMLoading, setIsLLMLoading] = useState(false);
  const [llmProgress, setLlmProgress] = useState<{ progress: number; text: string }>({ progress: 0, text: '' });

  const [settings, setSettings] = useState<SearchSettings>({
    topK: 4,
    bm25Weight: 0.4,
    cosineWeight: 0.6,
    temperature: 0.2,
    selectedModel: DEFAULT_MODEL,
  });

  // FIX: derived, not a manually-toggled boolean. The original build set a
  // single `isProcessing` flag to false the instant ANY one document
  // finished embedding — which incorrectly re-enabled the UI while a
  // second, concurrently-uploaded document was still parsing.
  const isProcessing = useMemo(
    () => documents.some((d) => d.status === 'parsing' || d.status === 'embedding' || d.status === 'indexing'),
    [documents],
  );
  const hasReadyDocuments = useMemo(() => documents.some((d) => d.status === 'ready'), [documents]);

  const parseWorkerRef = useRef<Worker | null>(null);
  const embedWorkerRef = useRef<Worker | null>(null);
  const llmWorkerRef = useRef<Worker | null>(null);
  const activeStreamIdRef = useRef<string | null>(null);

  const handleModelChange = (newModelId: string) => {
    setIsWebGPUReady(false);
    setIsLLMLoading(true);
    setLlmProgress({ progress: 0, text: 'Switching on-device model...' });
    llmWorkerRef.current?.postMessage({ type: 'init', modelId: newModelId });
  };

  useEffect(() => {
    const unsubscribe = telemetry.subscribe(setNetworkStats);

    parseWorkerRef.current = new Worker(new URL('./workers/parse.worker.ts', import.meta.url), { type: 'module' });
    embedWorkerRef.current = new Worker(new URL('./workers/embed.worker.ts', import.meta.url), { type: 'module' });
    llmWorkerRef.current = new Worker(new URL('./workers/llm.worker.ts', import.meta.url), { type: 'module' });

    embedWorkerRef.current.postMessage({ type: 'init' });
    setIsLLMLoading(true);
    llmWorkerRef.current.postMessage({ type: 'init', modelId: DEFAULT_MODEL });

    parseWorkerRef.current.onmessage = (e: MessageEvent<Worker1ToMain>) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setDocuments((prev) =>
          prev.map((d) => (d.docId === msg.docId ? { ...d, pageCount: msg.totalPages } : d)),
        );
      } else if (msg.type === 'done') {
        // FIX: fileName comes straight from the worker message (which
        // echoes what we sent it), not from a `documents.find(...)` lookup
        // against React state captured by this effect's stale closure.
        const rawChunks = chunkPages(msg.pages, msg.docId, msg.fileName);
        setDocuments((prev) =>
          prev.map((d) => (d.docId === msg.docId ? { ...d, chunkCount: rawChunks.length, status: 'embedding' } : d)),
        );
        embedWorkerRef.current?.postMessage({
          type: 'embedChunks',
          docId: msg.docId,
          docName: msg.fileName,
          chunks: rawChunks,
        });
      } else if (msg.type === 'error') {
        setDocuments((prev) =>
          prev.map((d) => (d.docId === msg.docId ? { ...d, status: 'error', errorMessage: msg.message } : d)),
        );
      }
    };

    embedWorkerRef.current.onmessage = async (e: MessageEvent<Worker2ToMain>) => {
      const msg = e.data;
      if (msg.type === 'networkEvent') {
        telemetry.recordEvent(msg.event);
      } else if (msg.type === 'modelReady') {
        setIsEmbeddingReady(true);
      } else if (msg.type === 'embedDone') {
        await saveChunks(msg.embeddedChunks);
        setDocuments((prev) => {
          const updated = prev.map((d) => (d.docId === msg.docId ? { ...d, status: 'ready' as const } : d));
          const target = updated.find((d) => d.docId === msg.docId);
          if (target) saveDocument(target);
          return updated;
        });
      } else if (msg.type === 'searchResult') {
        handleRetrievedContext(msg.query, msg.results);
      } else if (msg.type === 'error') {
        // FIX: worker errors used to be dropped silently, leaving a
        // document stuck on "Embedding..." forever with no explanation.
        if (msg.docId) {
          setDocuments((prev) =>
            prev.map((d) => (d.docId === msg.docId ? { ...d, status: 'error', errorMessage: msg.message } : d)),
          );
        } else {
          setIsGenerating(false);
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'system', content: `Retrieval error: ${msg.message}`, timestamp: Date.now() },
          ]);
        }
      }
    };

    llmWorkerRef.current.onmessage = (e: MessageEvent<Worker3ToMain>) => {
      const msg = e.data;
      if (msg.type === 'networkEvent') {
        telemetry.recordEvent(msg.event);
      } else if (msg.type === 'modelLoading') {
        setLlmProgress({ progress: msg.progress, text: msg.text });
      } else if (msg.type === 'modelReady') {
        setIsLLMLoading(false);
        setIsWebGPUReady(true);
      } else if (msg.type === 'webgpuUnavailable') {
        setIsLLMLoading(false);
        setIsWebGPUReady(false);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'system', content: msg.error, timestamp: Date.now() },
        ]);
      } else if (msg.type === 'token') {
        const streamId = activeStreamIdRef.current;
        if (streamId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, content: m.content + msg.text } : m)),
          );
        }
      } else if (msg.type === 'generationDone') {
        const streamId = activeStreamIdRef.current;
        if (streamId) {
          setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, isStreaming: false } : m)));
          activeStreamIdRef.current = null;
        }
        setIsGenerating(false);
      } else if (msg.type === 'error') {
        // FIX: a generation failure used to leave isGenerating stuck true
        // forever (the "Stop" button would never go away).
        const streamId = activeStreamIdRef.current;
        if (streamId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamId
                ? { ...m, content: m.content || 'Generation failed.', isStreaming: false, isError: true }
                : m,
            ),
          );
          activeStreamIdRef.current = null;
        }
        setIsGenerating(false);
      }
    };

    (async () => {
      const storedDocs = await getAllDocuments();
      const storedChunks = await getAllEmbeddedChunks();
      if (storedDocs.length > 0) {
        setDocuments(storedDocs);
        const grouped: Record<string, EmbeddedChunk[]> = {};
        for (const c of storedChunks) {
          (grouped[c.docId] ??= []).push(c);
        }
        const docsPayload = Object.keys(grouped).map((docId) => ({ docId, chunks: grouped[docId] }));
        embedWorkerRef.current?.postMessage({ type: 'loadCachedDocs', docs: docsPayload });
      }
    })();

    return () => {
      unsubscribe();
      parseWorkerRef.current?.terminate();
      embedWorkerRef.current?.terminate();
      llmWorkerRef.current?.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const docId = await computeFileHash(buffer);

      if (documents.some((d) => d.docId === docId)) continue;

      const newDoc: DocMeta = {
        docId,
        fileName: file.name,
        fileSize: file.size,
        pageCount: 0,
        chunkCount: 0,
        createdAt: Date.now(),
        status: 'parsing',
      };
      setDocuments((prev) => [...prev, newDoc]);
      await saveDocument(newDoc);

      parseWorkerRef.current?.postMessage({
        type: 'parse',
        docId,
        fileName: file.name,
        fileData: buffer,
      });
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    await deleteDocument(docId);
    embedWorkerRef.current?.postMessage({ type: 'deleteDoc', docId });
    setDocuments((prev) => prev.filter((d) => d.docId !== docId));
  };

  const handleSendMessage = (query: string) => {
    if (isGenerating) return;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);
    embedWorkerRef.current?.postMessage({ type: 'search', query, settings });
  };

  const handleRetrievedContext = (query: string, results: RetrievalResult[]) => {
    // FIX: buildRagPrompt now returns { system, user } instead of one
    // pre-templated ChatML string, avoiding double chat-templating inside
    // the LLM worker.
    const { system, user } = buildRagPrompt(query, results);
    const assistantMessageId = crypto.randomUUID();
    activeStreamIdRef.current = assistantMessageId;

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        citations: results,
        isStreaming: true,
      },
    ]);

    llmWorkerRef.current?.postMessage({
      type: 'generate',
      systemPrompt: system,
      userPrompt: user,
      temperature: settings.temperature,
    });
  };

  const handleInterrupt = () => {
    llmWorkerRef.current?.postMessage({ type: 'interrupt' });
    setIsGenerating(false);
    const streamId = activeStreamIdRef.current;
    if (streamId) {
      setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, isStreaming: false } : m)));
      activeStreamIdRef.current = null;
    }
  };

  const handleClearDatabase = async () => {
    await clearAllData();
    setDocuments([]);
    setMessages([]);
    setIsSettingsOpen(false);
  };

  return (
    <div className="min-h-screen bg-ink text-paper font-sans flex flex-col relative">
      <div className="grain-overlay" />
      <Navbar
        networkStats={networkStats}
        isWebGPUReady={isWebGPUReady}
        isEmbeddingReady={isEmbeddingReady}
        isLLMLoading={isLLMLoading}
        llmProgress={llmProgress}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNetwork={() => setIsNetworkPanelOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-4 min-w-0">
          <UploadZone documents={documents} onUpload={handleUpload} onDeleteDoc={handleDeleteDoc} />
          {isProcessing && (
            <p className="text-[11px] text-warn font-mono px-1">
              Processing documents — querying is disabled until at least one is ready.
            </p>
          )}
        </div>

        <div className="lg:col-span-8 min-w-0">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onInterrupt={handleInterrupt}
            isGenerating={isGenerating}
            onOpenCitation={setSelectedCitation}
            hasDocuments={hasReadyDocuments}
          />
        </div>
      </main>

      <CitationViewer citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      <NetworkPanel
        isOpen={isNetworkPanelOpen}
        onClose={() => setIsNetworkPanelOpen(false)}
        stats={networkStats}
        onReset={() => telemetry.reset()}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onClearDatabase={handleClearDatabase}
        onChangeModel={handleModelChange}
      />
    </div>
  );
}
