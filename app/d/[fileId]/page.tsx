'use client';
import { useEffect, useState, use } from 'react';
import { createWalletClient, custom, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains'; 
import { Lock, Unlock, Download, Loader2, ExternalLink } from 'lucide-react'; // Aggiunto ExternalLink
import { toast } from 'sonner';

export default function DownloadPage({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = use(params);

  const [status, setStatus] = useState<'loading' | 'idle' | 'paying' | 'verifying' | 'downloading'>('loading');
  const [meta, setMeta] = useState<any>(null);
  const [txHash, setTxHash] = useState<string | null>(null); // <--- NUOVO STATO

  // 1. Fetch Iniziale
  useEffect(() => {
    fetch(`/api/download/${fileId}`, { method: 'POST' })
      .then(async (res) => {
        if (res.status === 402) {
          const data = await res.json();
          if (data.offers && data.offers.length > 0) {
            setMeta(data.offers[0]);
          } else {
            setMeta(data);
          }
          setStatus('idle');
        } else if (res.status === 404) {
          toast.error("File not found");
          setStatus('idle');
        }
      })
      .catch((err) => {
        console.error(err);
        setStatus('idle');
      });
  }, [fileId]);

  const handleBuy = async () => {
    if (!meta || !meta.amount || !meta.recipient) {
      toast.error("Missing data");
      return;
    }

    setStatus('paying');

    if (typeof window.ethereum === 'undefined') {
      toast.error("Install Metamask");
      setStatus('idle');
      return;
    }

    try {
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum)
      });
      const [account] = await walletClient.requestAddresses();

      // 2. Invio Transazione
      const hash = await walletClient.sendTransaction({
        account,
        to: meta.recipient, 
        value: parseEther(meta.amount.toString())
      });

      // --- NUOVO: Salviamo Hash appena generata ---
      setTxHash(hash); 
      
      toast.info("Tx send! Checking on-chain...");
      setStatus('verifying');

      // Attesa propagazione (4 secondi)
      await new Promise(r => setTimeout(r, 4000));

      // 3. Invio Hash al server
      const finalReq = await fetch(`/api/download/${fileId}`, {
        method: 'POST',
        headers: { 'X-Payment': hash }
      });

      if (finalReq.ok) {
        setStatus('downloading');
        const blob = await finalReq.blob();
        
        const contentDisposition = finalReq.headers.get('Content-Disposition');
        let fileName = "file-download";
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) fileName = match[1];
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Download completed!");
      } else {
        const err = await finalReq.json();
        throw new Error(err.error || "Verification failed");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Errore: " + (e.message || "Failed"));
      setStatus('idle');
    }
  };

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-white"/></div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-white">
      <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-md border border-zinc-700/50 rounded-3xl p-8 shadow-2xl text-center">
        
        <div className="mx-auto w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
          {status === 'downloading' ? <Unlock className="text-green-400" size={32} /> : <Lock className="text-red-400" size={32} />}
        </div>

        <h2 className="text-2xl font-bold mb-2">            
          {meta?.originalName ? meta.originalName : ""}
        </h2>
        
        <div className="bg-black/40 border border-zinc-800 rounded-xl p-5 mb-8 flex justify-between items-center">
          <span className="text-zinc-400 text-sm">Price</span>
          <span className="text-2xl font-mono font-bold text-white">
            {meta?.amount ? meta.amount : "..."} ETH
          </span>
        </div>

        <div className="bg-black/40 border border-zinc-800 rounded-xl p-5 mb-8 flex justify-between items-center">
          <span className="text-zinc-400 text-sm">Owner</span>
          <span className="text-2xl font-mono font-bold text-white">
            {meta?.sellerWallet ? meta.sellerWallet : ""}
          </span>
        </div>

        {/* --- BOTTONE PRINCIPALE --- */}
        <button 
          onClick={handleBuy}
          disabled={status !== 'idle'}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all mb-4
            ${status === 'idle' 
              ? 'bg-white text-black hover:bg-zinc-200' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
        >
          {status === 'idle' && <>Unlock <Download size={20}/></>}
          {(status === 'paying') && <><Loader2 className="animate-spin"/> Wallet confirm...</>}
          {(status === 'verifying') && <><Loader2 className="animate-spin"/>On-chain check...</>}
          {(status === 'downloading') && <>Downloading file...</>}
        </button>

        {/* --- NUOVO: LINK ALLA TRANSAZIONE --- */}
        {txHash && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <a 
              href={`https://sepolia.basescan.org/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-colors p-2"
            >
              See Tx on BaseScan <ExternalLink size={12} />
            </a>
            {status === 'verifying' && (
               <p className="text-xs text-zinc-500 mt-1">
                The operation may take a few seconds...
                </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}