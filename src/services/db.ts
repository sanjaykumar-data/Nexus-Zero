import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { DocMeta, EmbeddedChunk } from '../types';

interface NexusDB extends DBSchema {
  documents: {
    key: string; // docId (SHA-256 hash of file contents)
    value: DocMeta;
  };
  chunks: {
    key: string; // chunkId
    value: EmbeddedChunk;
    indexes: { 'by-doc': string };
  };
}

const DB_NAME = 'nexus-zero-db';
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<NexusDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<NexusDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'docId' });
        }
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
          chunkStore.createIndex('by-doc', 'docId');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveDocument(doc: DocMeta): Promise<void> {
  const db = await getDB();
  await db.put('documents', doc);
}

export async function getAllDocuments(): Promise<DocMeta[]> {
  const db = await getDB();
  return db.getAll('documents');
}

export async function deleteDocument(docId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['documents', 'chunks'], 'readwrite');
  await tx.objectStore('documents').delete(docId);
  const chunkIndex = tx.objectStore('chunks').index('by-doc');
  let cursor = await chunkIndex.openCursor(IDBKeyRange.only(docId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function saveChunks(chunks: EmbeddedChunk[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('chunks', 'readwrite');
  for (const chunk of chunks) {
    await tx.store.put(chunk);
  }
  await tx.done;
}

export async function getAllEmbeddedChunks(): Promise<EmbeddedChunk[]> {
  const db = await getDB();
  return db.getAll('chunks');
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('documents');
  await db.clear('chunks');
}
