'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UploadCloud, FileText, ArrowRight, ShoppingBag, Loader2 } from 'lucide-react';

interface FileItem {
  id: string;
  originalName: string;
  price: string;
  size: number;
  createdAt: string;
}

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => {
        setFiles(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      
      {/* HEADER: Titolo + Tasto Upload */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            x402 Shop
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Discover & Buy P2P Digital Assets</p>
        </div>
        
        <Link href="/upload">
          <button className="bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-white/10">
            <UploadCloud size={18} />
            Upload Asset
          </button>
        </Link>
      </header>

      {/* GALLERY GRID */}
      {loading ? (
        <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-zinc-600" size={40}/></div>
      ) : files.length === 0 ? (
        // Empty State
        <div className="text-center mt-20 border border-dashed border-zinc-800 rounded-2xl p-20">
          <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 text-zinc-600">
            <ShoppingBag size={32}/>
          </div>
          <h3 className="text-xl font-semibold text-zinc-300">Marketplace is empty</h3>
          <p className="text-zinc-500 mt-2 mb-6">Be the first to list a digital asset.</p>
          <Link href="/upload">
            <button className="text-indigo-400 hover:text-indigo-300 underline">Upload now</button>
          </Link>
        </div>
      ) : (
        // Grid Card
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {files.map((file) => (
            <Link href={`/d/${file.id}`} key={file.id} className="group">
              <div className="bg-zinc-900/40 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col h-full">
                
                {/* Thumbnail Icon (Placeholder) */}
                <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl flex items-center justify-center mb-4 group-hover:from-indigo-900/20 group-hover:to-purple-900/20 transition-colors">
                  <FileText size={40} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-100 truncate mb-1" title={file.originalName}>
                    {file.originalName}
                  </h3>
                  <p className="text-xs text-zinc-500 mb-4">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Footer: Price & CTA */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                  <span className="font-mono font-bold text-white text-lg">{file.price} <span className="text-xs text-zinc-500">ETH</span></span>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <ArrowRight size={16} />
                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}