import type { Chunk } from '../types';

export interface BM25Index {
  docLengths: Map<string, number>;
  avgDocLength: number;
  totalDocs: number;
  invertedIndex: Map<string, Map<string, number>>;
  idf: Map<string, number>;
}

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/** Builds a BM25 inverted index with Robertson-Sparck Jones IDF. */
export function buildBM25Index(chunks: Chunk[]): BM25Index {
  const docLengths = new Map<string, number>();
  const invertedIndex = new Map<string, Map<string, number>>();
  let totalLength = 0;

  for (const chunk of chunks) {
    const tokens = tokenize(chunk.text);
    const len = tokens.length;
    docLengths.set(chunk.id, len);
    totalLength += len;

    const termFreqs = new Map<string, number>();
    for (const token of tokens) {
      termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
    }
    for (const [term, freq] of termFreqs.entries()) {
      if (!invertedIndex.has(term)) invertedIndex.set(term, new Map());
      invertedIndex.get(term)!.set(chunk.id, freq);
    }
  }

  const totalDocs = chunks.length;
  const avgDocLength = totalDocs > 0 ? totalLength / totalDocs : 1;
  const idf = new Map<string, number>();

  for (const [term, postings] of invertedIndex.entries()) {
    const docFreq = postings.size;
    const val = Math.log((totalDocs - docFreq + 0.5) / (docFreq + 0.5) + 1);
    idf.set(term, Math.max(0.01, val));
  }

  return { docLengths, avgDocLength, totalDocs, invertedIndex, idf };
}

/** Searches the BM25 index with the standard k1=1.5, b=0.75 parameters. */
export function bm25Search(
  query: string,
  index: BM25Index,
  k1 = 1.5,
  b = 0.75,
): Map<string, number> {
  const scores = new Map<string, number>();
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || index.totalDocs === 0) return scores;

  for (const token of queryTokens) {
    const postings = index.invertedIndex.get(token);
    const tokenIDF = index.idf.get(token);
    if (!postings || tokenIDF === undefined) continue;

    for (const [chunkId, freq] of postings.entries()) {
      const docLen = index.docLengths.get(chunkId) || index.avgDocLength;
      const numerator = freq * (k1 + 1);
      const denominator = freq + k1 * (1 - b + b * (docLen / index.avgDocLength));
      const score = tokenIDF * (numerator / denominator);
      scores.set(chunkId, (scores.get(chunkId) || 0) + score);
    }
  }

  return scores;
}
