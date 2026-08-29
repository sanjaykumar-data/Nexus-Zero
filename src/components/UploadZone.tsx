import { useRef, useState } from 'react';

import type { ChangeEvent, DragEvent } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Trash2, Layers } from 'lucide-react';

import type { DocMeta } from '../types';



interface UploadZoneProps {

  documents: DocMeta[];

  onUpload: (files: File[]) => void;

  onDeleteDoc: (docId: string) => void;

}



function formatBytes(bytes: number): string {

  if (bytes === 0) return '0 B';

  const k = 1024;

  const sizes = ['B', 'KB', 'MB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;

}



export function UploadZone({ documents, onUpload, onDeleteDoc }: UploadZoneProps) {

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);



  const acceptFiles = (fileList: FileList | null) => {

    if (!fileList || fileList.length === 0) return;

    const pdfFiles = Array.from(fileList).filter((f) => f.type === 'application/pdf');

    if (pdfFiles.length > 0) onUpload(pdfFiles);

  };



  const handleDrop = (e: DragEvent) => {

    e.preventDefault();

    setIsDragOver(false);

    acceptFiles(e.dataTransfer.files);

  };



  const handleChange = (e: ChangeEvent<HTMLInputElement>) => acceptFiles(e.target.files);



  return (

    <div className="flex flex-col gap-6">

      <motion.div

        initial={{ opacity: 0, y: 10 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ duration: 0.4, delay: 0.1 }}

        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}

        onDragLeave={() => setIsDragOver(false)}

        onDrop={handleDrop}

        onClick={() => fileInputRef.current?.click()}

        className={`relative group cursor-pointer rounded-xl border transition-all duration-300 p-8 text-center flex flex-col items-center justify-center gap-3 ${

          isDragOver ? 'border-paper bg-surface scale-[1.01]' : 'border-line bg-panel hover:border-line-strong'

        }`}

      >

        <input ref={fileInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handleChange} />

        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line-strong text-dim group-hover:text-paper group-hover:border-paper transition-colors">

          <UploadCloud className="h-6 w-6 transition-transform group-hover:-translate-y-0.5" />

        </div>

        <div className="space-y-1">

          <p className="text-sm font-medium text-paper">

            <span className="underline decoration-line-strong underline-offset-4">Click to upload</span> or drag and drop PDFs

          </p>

          <p className="text-xs text-faint">Parsed, chunked, and embedded 100% locally in your browser</p>

        </div>

      </motion.div>



      {documents.length > 0 && (

        <div className="flex flex-col gap-3">

          <div className="flex items-center justify-between px-1">

            <h3 className="text-xs font-semibold uppercase tracking-wider text-faint flex items-center gap-2">

              <Layers className="h-3.5 w-3.5" />

              Indexed documents ({documents.length})

            </h3>

            <span className="text-xs text-faint font-mono">

              {documents.reduce((acc, d) => acc + d.chunkCount, 0)} chunks

            </span>

          </div>



          <div className="grid gap-2.5">

            <AnimatePresence initial={false}>

              {documents.map((doc, index) => (

                <motion.div

                  key={doc.docId}

                  layout

                  initial={{ opacity: 0, y: 8 }}

                  animate={{ opacity: 1, y: 0 }}

                  exit={{ opacity: 0, x: -8 }}

                  transition={{ duration: 0.3, delay: index * 0.04 }}

                  className="flex flex-col gap-2 p-3.5 rounded-lg bg-panel border border-line hover:border-line-strong transition-colors group"

                >

                  <div className="flex items-center justify-between gap-3">

                    <div className="flex items-center gap-3 min-w-0 flex-1">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface border border-line text-dim">

                        <FileText className="h-4 w-4" />

                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="text-sm font-medium text-paper truncate">{doc.fileName}</p>

                        <div className="flex items-center gap-2 text-xs text-faint font-mono mt-0.5">

                          <span>{formatBytes(doc.fileSize)}</span>

                          <span>&middot;</span>

                          <span>{doc.pageCount > 0 ? `${doc.pageCount} pages` : 'Reading...'}</span>

                          {doc.chunkCount > 0 && (

                            <>

                              <span>&middot;</span>

                              <span className="text-dim">{doc.chunkCount} chunks</span>

                            </>

                          )}

                        </div>

                      </div>

                    </div>

                    <div className="flex items-center gap-3 shrink-0">

                      {doc.status === 'ready' && (

                        <div className="flex items-center gap-1.5 text-paper bg-surface border border-line-strong px-2.5 py-1 rounded-md text-xs font-mono">

                          <CheckCircle2 className="h-3.5 w-3.5" />

                          <span>Ready</span>

                        </div>

                      )}

                      {(doc.status === 'parsing' || doc.status === 'embedding' || doc.status === 'indexing') && (

                        <div className="flex items-center gap-1.5 text-dim bg-surface border border-line px-2.5 py-1 rounded-md text-xs font-mono">

                          <Loader2 className="h-3.5 w-3.5 animate-spin" />

                          <span className="capitalize">{doc.status}...</span>

                        </div>

                      )}

                      {doc.status === 'error' && (

                        <div className="flex items-center gap-1.5 text-danger bg-danger-bg border border-danger/30 px-2.5 py-1 rounded-md text-xs font-mono">

                          <AlertCircle className="h-3.5 w-3.5" />

                          <span>Failed</span>

                        </div>

                      )}

                      <button

                        onClick={() => onDeleteDoc(doc.docId)}

                        className="p-1.5 rounded-md text-faint hover:text-danger hover:bg-danger-bg transition-colors opacity-80 group-hover:opacity-100"

                        title="Remove document"

                      >

                        <Trash2 className="h-4 w-4" />

                      </button>

                    </div>

                  </div>

                  {doc.status === 'error' && doc.errorMessage && (

                    <p className="text-[11px] text-danger/90 font-mono pl-12">{doc.errorMessage}</p>

                  )}

                </motion.div>

              ))}

            </AnimatePresence>

          </div>

        </div>

      )}

    </div>

  );

}

