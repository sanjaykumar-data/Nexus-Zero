import * as pdfjsLib from 'pdfjs-dist';
import type { MainToWorker1, Worker1ToMain } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

self.onmessage = async (e: MessageEvent<MainToWorker1>) => {
  const msg = e.data;
  if (msg.type !== 'parse') return;

  try {
    const pdf = await pdfjsLib.getDocument({ data: msg.fileData }).promise;
    const totalPages = pdf.numPages;
    const pages: { pageNumber: number; text: string }[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ');
      pages.push({ pageNumber: i, text });

      const progressMsg: Worker1ToMain = {
        type: 'progress',
        docId: msg.docId,
        page: i,
        totalPages,
      };
      self.postMessage(progressMsg);
    }

    // FIX: fileName is echoed back here instead of looked up from React
    // state in the main thread's onmessage handler, which was captured by
    // a stale closure (see App.tsx comment) and always fell back to a
    // generic placeholder name.
    const doneMsg: Worker1ToMain = {
      type: 'done',
      docId: msg.docId,
      fileName: msg.fileName,
      pages,
    };
    self.postMessage(doneMsg);
  } catch (err) {
    const errorMsg: Worker1ToMain = {
      type: 'error',
      docId: msg.docId,
      message: err instanceof Error ? err.message : 'Failed to parse PDF document.',
    };
    self.postMessage(errorMsg);
  }
};
