import type { RetrievalResult } from '../types';

const SYSTEM_PROMPT = `You are Nexus Zero, a private, on-device document intelligence assistant running with zero network access.
Answer the user's question using ONLY the provided document passages.
Rules:
1. Give accurate, clear answers strictly grounded in the passages provided.
2. When you state a fact, cite its source like this: [Doc: <document name>, Page <n>].
3. If the answer cannot be found in the passages, say: "I cannot find this information in the uploaded documents." Do not invent facts.`;

const NO_CONTEXT_SYSTEM_PROMPT = `You are Nexus Zero, a private, on-device document intelligence assistant.
No matching passages were found in the ingested documents for this question.
Clearly tell the user that no relevant context was found before offering any general knowledge.`;

export interface RagPrompt {
  system: string;
  user: string;
}

/**
 * Builds a { system, user } pair to hand to the LLM engine's own chat
 * template (e.g. web-llm's `messages` array) — deliberately NOT a single
 * pre-formatted ChatML string, since the engine already applies the
 * model's chat template. Passing a fully-templated string as message
 * content would get wrapped a second time and can corrupt generation.
 */
export function buildRagPrompt(query: string, contextResults: RetrievalResult[]): RagPrompt {
  if (contextResults.length === 0) {
    return { system: NO_CONTEXT_SYSTEM_PROMPT, user: query };
  }

  const contextBlocks = contextResults
    .map(
      (result, idx) =>
        `[Passage ${idx + 1}] Source: "${result.chunk.docName}", Page: ${result.chunk.pageNumber}\n${result.chunk.text}`,
    )
    .join('\n\n');

  const user = `CONTEXT PASSAGES:\n${contextBlocks}\n\nQUESTION:\n${query}`;
  return { system: SYSTEM_PROMPT, user };
}
