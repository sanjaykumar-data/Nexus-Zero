import type { EmbeddedChunk, RetrievalResult, SearchSettings } from '../types';
import { buildBM25Index, bm25Search } from './bm25';

export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Hybrid retrieval: fusionScore = bm25Weight * bm25Norm + cosineWeight * cosineScore.
 * Deck default is 0.4 / 0.6, tunable live via the settings panel.
 */
export function hybridSearch(
  query: string,
  queryEmbedding: number[],
  chunks: EmbeddedChunk[],
  settings: SearchSettings,
): RetrievalResult[] {
  if (chunks.length === 0) return [];

  const bm25Index = buildBM25Index(chunks);
  const bm25Scores = bm25Search(query, bm25Index);

  let maxBM25 = 0;
  for (const score of bm25Scores.values()) {
    if (score > maxBM25) maxBM25 = score;
  }

  const results: RetrievalResult[] = [];
  for (const chunk of chunks) {
    const rawBM25 = bm25Scores.get(chunk.id) || 0;
    const bm25Norm = maxBM25 > 0 ? rawBM25 / maxBM25 : 0;

    const rawCosine = cosineSimilarity(queryEmbedding, chunk.embedding);
    const cosineScore = Math.max(0, Math.min(1, (rawCosine + 1) / 2));

    const fusionScore = settings.bm25Weight * bm25Norm + settings.cosineWeight * cosineScore;

    results.push({
      chunk: {
        id: chunk.id,
        docId: chunk.docId,
        docName: chunk.docName,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        tokenCount: chunk.tokenCount,
      },
      bm25Score: Number(bm25Norm.toFixed(4)),
      cosineScore: Number(cosineScore.toFixed(4)),
      fusionScore: Number(fusionScore.toFixed(4)),
    });
  }

  results.sort((a, b) => b.fusionScore - a.fusionScore);
  return results.slice(0, settings.topK);
}
