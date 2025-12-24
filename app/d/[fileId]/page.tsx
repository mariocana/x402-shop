'use client';
import { useEffect, useState, use } from 'react';
import { createWalletClient, custom, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains'; 
import { Lock, Unlock, Download, Loader2, ExternalLink, FileText, User } from 'lucide-react';
import { toast } from 'sonner';

// Utility per accorciare l'indirizzo
const shortenAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export default function DownloadPage({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = use(params);

  const [status, setStatus] = useState<'loading' | 'idle' | 'paying' | 'verifying' | 'downloading'>('loading');
  
  // State per i dettagli del file
  const [fileDetails, setFileDetails] = useState<any>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/download/${fileId}`, { method: 'POST' })
      .then(async (res) => {
        if (res.status === 402) {
          const data = await res.json();
          setFileDetails(data); // Salviamo tutto il JSON (fileName, sellerWallet, offers)
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
    if (!fileDetails || !fileDetails.offers) {
      toast.error("Dati mancanti");
      return;
    }

    const offer = fileDetails.offers[0]; // Prendiamo l'offerta

    setStatus('paying');

    if (typeof window.ethereum === 'undefined') {
      toast.error("Installa Metamask");
      setStatus('idle');
      return;
    }

    try {
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum)
      });
      const [account] = await walletClient.requestAddresses();

      // Pagamento P2P
      const hash = await walletClient.sendTransaction({
        account,
        to: offer.recipient, 
        value: parseEther(offer.amount.toString())
      });

      setTxHash(hash); 
      toast.info("Transazione inviata! Verifica in corso...");
      setStatus('verifying');

      await new Promise(r => setTimeout(r, 4000));

      const finalReq = await fetch(`/api/download/${fileId}`, {
        method: 'POST',
        headers: { 'X-Payment': hash }
      });

      if (finalReq.ok) {
        setStatus('downloading');
        const blob = await finalReq.blob();
        
        // Nome file dal backend o header
        const fileName = fileDetails.fileName || "downloaded-file";

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Download completato!");
      } else {
        const err = await finalReq.json();
        throw new Error(err.error || "Verifica fallita");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Errore: " + (e.message || "Fallito"));
      setStatus('idle');
    }
  };

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-white"/></div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-white relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -z-10"></div>

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-3xl p-8 shadow-2xl text-center">
        
        {/* Icona Lock */}
        <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/5">
          {status === 'downloading' ? <Unlock className="text-green-400" size={28} /> : <Lock className="text-red-400" size={28} />}
        </div>

        <h2 className="text-xl font-bold mb-1 text-white">Unlock Digital Asset</h2>
        <p className="text-zinc-500 text-xs mb-6 uppercase tracking-wider">x402 Protocol Secured</p>
        
        {/* --- DETTAGLI FILE (Tabella) --- */}
        <div className="bg-black/40 border border-zinc-800 rounded-xl p-4 mb-6 space-y-3">
            
            {/* Nome File */}
            <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm flex items-center gap-2"><FileText size={14}/> File Name</span>
                <span className="text-white font-medium text-sm truncate max-w-[150px]" title={fileDetails?.fileName}>
                    {fileDetails?.fileName || "Unknown"}
                </span>
            </div>

            <div className="h-[1px] bg-zinc-800 w-full"></div>

            {/* Owner Address */}
            <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm flex items-center gap-2"><User size={14}/> Seller</span>
                <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 px-2 py-1 rounded">
                    {shortenAddress(fileDetails?.sellerWallet)}
                </span>
            </div>

            <div className="h-[1px] bg-zinc-800 w-full"></div>

            {/* Prezzo */}
            <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Price</span>
                <span className="text-xl font-mono font-bold text-white">
                    {fileDetails?.offers?.[0]?.amount || "..."} ETH
                </span>
            </div>
        </div>

        {/* Bottone */}
        <button 
          onClick={handleBuy}
          disabled={status !== 'idle'}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all mb-4
            ${status === 'idle' 
              ? 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
        >
          {status === 'idle' && <>Purchase & Download <Download size={20}/></>}
          {(status === 'paying') && <><Loader2 className="animate-spin"/> Check Wallet...</>}
          {(status === 'verifying') && <><Loader2 className="animate-spin"/> Verifying...</>}
          {(status === 'downloading') && <>Success!</>}
        </button>

        {/* Link Transazione */}
        {txHash && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <a 
              href={`https://sepolia.basescan.org/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              View on BaseScan <ExternalLink size={10} />
            </a>
          </div>
        )}

      </div>
    </div>
  );
}