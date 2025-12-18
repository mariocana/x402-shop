'use client';
import { useState, useRef } from 'react';
import { UploadCloud, Wallet, DollarSign, ArrowRight, Loader2, ArrowLeft, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState('');
  const [wallet, setWallet] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if(!file || !price || !wallet) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('price', price);
    formData.append('wallet', wallet);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if(!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      setLink(`${window.location.origin}/d/${data.fileId}`);
      toast.success("File uploaded to marketplace!");
    } catch (e) {
      toast.error("Error uploading file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      
      {/* Back Button */}
      <Link href="/" className="absolute top-8 left-8 text-zinc-500 hover:text-white flex items-center gap-2 text-sm transition-colors">
        <ArrowLeft size={16} /> Back to Market
      </Link>

      <div className="w-full max-w-lg bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Upload Asset</h1>
          <p className="text-zinc-400 text-sm">List your file on the x402 marketplace.</p>
        </div>

        {!link ? (
          <div className="space-y-6">
            {/* Drop Zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                ${file ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-zinc-700 hover:border-indigo-500 hover:bg-zinc-800/50'}`}
            >
              <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <>
                  <div className="bg-indigo-500/20 p-3 rounded-full mb-3 text-indigo-400"><UploadCloud size={24} /></div>
                  <p className="font-medium text-indigo-100">{file.name}</p>
                  <p className="text-xs text-indigo-400/60 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                </>
              ) : (
                <>
                  <div className="bg-zinc-800 p-3 rounded-full mb-3 text-zinc-400"><UploadCloud size={24} /></div>
                  <p className="font-medium text-zinc-300">Click to select file</p>
                </>
              )}
            </div>

            {/* Inputs */}
            <div className="grid gap-4">
              <div className="relative group">
                <DollarSign className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  type="number" step="0.0001"
                  placeholder="Price (ETH)" 
                  value={price} 
                  onChange={e => setPrice(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-white placeholder-zinc-600"
                />
              </div>
              <div className="relative group">
                <Wallet className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Your Wallet Address (Receiver)" 
                  value={wallet} 
                  onChange={e => setWallet(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-white placeholder-zinc-600 font-mono text-sm"
                />
              </div>
            </div>

            <button 
              onClick={handleUpload} 
              disabled={loading || !file || !price || !wallet}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>List on Market <ArrowRight size={18}/></>}
            </button>
          </div>
        ) : (
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
              <Check className="text-green-400" />
            </div>
            <h3 className="text-green-400 font-bold text-lg mb-2">Success!</h3>
            <p className="text-zinc-500 text-sm mb-4">Your file is now live on the marketplace.</p>
            
            <div className="grid grid-cols-2 gap-3">
                <Link href="/" className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                    Go to Gallery
                </Link>
                <button 
                    onClick={() => {navigator.clipboard.writeText(link); toast.success('Link copied!');}}
                    className="w-full py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Copy size={14}/> Copy Link
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}