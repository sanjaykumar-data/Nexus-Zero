import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Bookmark, Copy, Check, StopCircle, AlertTriangle } from 'lucide-react';
import type { ChatMessage, RetrievalResult } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  onInterrupt: () => void;
  isGenerating: boolean;
  onOpenCitation: (citation: RetrievalResult) => void;
  hasDocuments: boolean;
}

const SUGGESTED_PROMPTS = [
  'Summarize key findings',
  'What are the safety requirements?',
  'List all operational procedures',
];

export function ChatInterface({
  messages,
  onSendMessage,
  onInterrupt,
  isGenerating,
  onOpenCitation,
  hasDocuments,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] rounded-xl bg-panel border border-line overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line-strong text-paper">
              <Bot className="h-6 w-6" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-semibold text-paper font-[var(--font-display)]">
                Zero-egress document intelligence
              </h3>
              <p className="text-xs text-dim leading-relaxed">
                {hasDocuments
                  ? 'Ask any question across your uploaded documents. Answers are retrieved via BM25 + cosine vector fusion with page-level citations.'
                  : 'Upload a PDF manual or report in the left panel to begin on-device Q&A.'}
              </p>
            </div>
            {hasDocuments && (
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => onSendMessage(prompt)}
                    className="px-3 py-1.5 rounded-full bg-surface hover:bg-surface-2 border border-line text-xs text-dim font-mono transition-colors"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              if (message.role === 'system') {
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger-bg border border-danger/30 text-danger text-xs font-mono max-w-lg">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{message.content}</span>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-strong text-paper mt-1">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`group relative max-w-2xl rounded-xl p-4 sm:p-5 transition-all ${
                      message.role === 'user'
                        ? 'bg-paper text-ink rounded-br-sm'
                        : message.isError
                          ? 'bg-danger-bg border border-danger/30 text-danger rounded-bl-sm'
                          : 'bg-surface border border-line text-paper rounded-bl-sm'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between gap-4 mb-2 pb-1.5 border-b text-[11px] font-mono ${
                        message.role === 'user' ? 'border-ink/10 text-ink/60' : 'border-line text-faint'
                      }`}
                    >
                      <span className="font-semibold">{message.role === 'user' ? 'You' : 'Nexus Zero'}</span>
                      <div className="flex items-center gap-2">
                        <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {message.role === 'assistant' && message.content && (
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className="opacity-0 group-hover:opacity-100 hover:text-paper transition-opacity"
                            title="Copy message"
                          >
                            {copiedId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-paper animate-pulse align-middle" />
                      )}
                    </div>

                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-line space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-faint font-semibold uppercase tracking-wider">
                          <Bookmark className="h-3 w-3" />
                          Retrieved citations ({message.citations.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {message.citations.map((citation, idx) => (
                            <button
                              key={idx}
                              onClick={() => onOpenCitation(citation)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ink border border-line hover:border-line-strong text-xs font-mono text-dim transition-colors"
                            >
                              <span className="text-paper font-bold">#{idx + 1}</span>
                              <span className="truncate max-w-[120px]">{citation.chunk.docName}</span>
                              <span className="text-[10px] text-faint bg-surface px-1 rounded">p.{citation.chunk.pageNumber}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-strong text-dim mt-1">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-line p-3 sm:p-4 bg-panel">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isGenerating || !hasDocuments}
            placeholder={hasDocuments ? 'Ask anything from your documents (100% offline)...' : 'Upload at least one PDF above to begin querying...'}
            className="flex-1 rounded-lg bg-surface border border-line px-4 py-3 text-sm text-paper placeholder-faint focus:border-line-strong focus:outline-none disabled:opacity-50 transition-all"
          />
          {isGenerating ? (
            <button
              type="button"
              onClick={onInterrupt}
              className="flex items-center gap-1.5 px-4 py-3 rounded-lg bg-danger-bg border border-danger/40 text-danger hover:bg-danger-bg/70 text-sm font-medium transition-colors"
            >
              <StopCircle className="h-4 w-4" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !hasDocuments}
              className="flex items-center gap-1.5 px-5 py-3 rounded-lg bg-paper hover:bg-white text-ink font-semibold text-sm disabled:opacity-30 transition-all"
            >
              <span>Query</span>
              <Send className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
