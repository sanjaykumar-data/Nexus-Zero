import type { Chunk } from '../types';

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function computeFileHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sentence-aware chunker: splits text into ~512-token chunks with a
 * 64-token overlap, preferring to break on a sentence boundary within the
 * final 15% of the window rather than mid-sentence.
 */
export function chunkPages(
  pages: { pageNumber: number; text: string }[],
  docId: string,
  docName: string,
): Chunk[] {
  const MAX_CHARS = 512 * 4; // ~512 tokens
  const OVERLAP_CHARS = 64 * 4; // ~64 tokens
  const BOUNDARY_WINDOW_CHARS = Math.floor(MAX_CHARS * 0.15);

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const rawText = page.text.replace(/\s+/g, ' ').trim();
    if (!rawText) continue;

    let currentStart = 0;
    while (currentStart < rawText.length) {
      let currentEnd = Math.min(currentStart + MAX_CHARS, rawText.length);

      if (currentEnd < rawText.length) {
        const searchStart = Math.max(currentStart, currentEnd - BOUNDARY_WINDOW_CHARS);
        const searchWindow = rawText.substring(searchStart, currentEnd);
        const sentenceMatches = searchWindow.match(/([.!?])\s+(?=[A-Z0-9"'])/g);

        if (sentenceMatches && sentenceMatches.length > 0) {
          const lastSentence = sentenceMatches[sentenceMatches.length - 1];
          const matchIndex = searchWindow.lastIndexOf(lastSentence);
          currentEnd = searchStart + matchIndex + lastSentence.length;
        } else {
          const lastSpace = searchWindow.lastIndexOf(' ');
          if (lastSpace > 0) currentEnd = searchStart + lastSpace + 1;
        }
      }

      const chunkText = rawText.substring(currentStart, currentEnd).trim();
      if (chunkText.length > 0) {
        chunks.push({
          id: `${docId}:${chunkIndex++}`,
          docId,
          docName,
          text: chunkText,
          pageNumber: page.pageNumber,
          tokenCount: estimateTokens(chunkText),
        });
      }

      if (currentEnd >= rawText.length) break;
      currentStart = Math.max(currentStart + 1, currentEnd - OVERLAP_CHARS);
    }
  }

  return chunks;
}
