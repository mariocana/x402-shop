import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';
import path from 'path';

// Configura il client Blockchain
const client = createPublicClient({ chain: baseSepolia, transport: http() });

const DB_PATH = path.join(process.cwd(), 'database.json');
const UPLOAD_DIR = path.join(process.cwd(), 'private-uploads');

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ fileId: string }> }
) {
  // 1. Scompatta i parametri (Fix per Next.js 15)
  const { fileId } = await params;

  // 2. Leggi il Database per trovare Chi vendere e A quanto
  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const fileData = db[fileId];

  if (!fileData) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Estraiamo i dati P2P dinamici
  const SELLER_WALLET = fileData.sellerWallet; // Questo cambia per ogni file!
  const PRICE_ETH = fileData.price;

  // 3. Controlla se c'è l'header X-Payment (Standard x402)
  // Il client deve mandare l'hash della transazione qui
  const paymentHash = req.headers.get('x-payment') || (await req.json().catch(() => ({}))).txHash;

  // --- SCENARIO A: L'utente NON ha pagato (o non ha mandato la prova) ---
  if (!paymentHash) {
    // Ritorniamo 402 Payment Required
    // Inseriamo i dati necessari nell'header o nel body per il client
    return NextResponse.json(
      { 
        error: "Payment Required",
        detail: "Purchase access via x402 protocol",
        offers: [{
            amount: PRICE_ETH,
            currency: "ETH",
            recipient: SELLER_WALLET, // <--- Qui diciamo al client CHI pagare
            network: "base-sepolia"
        }]
      },
      { 
        status: 402,
        headers: {
            // Header Standard x402 per i client automatici
            'WWW-Authenticate': `x402 token="${PRICE_ETH} ETH", recipient="${SELLER_WALLET}"`
        }
      }
    );
  }

  // --- SCENARIO B: L'utente DICE di aver pagato (Verifica) ---
  try {
    const tx = await client.getTransaction({ hash: paymentHash as `0x${string}` });
    
    // Controlli di sicurezza P2P:
    // 1. I soldi sono andati davvero al venditore di QUESTO file?
    const isRecipientCorrect = tx.to?.toLowerCase() === SELLER_WALLET.toLowerCase();
    
    // 2. L'importo è sufficiente?
    const valueSent = tx.value;
    const priceRequired = parseEther(PRICE_ETH);
    
    if (isRecipientCorrect && valueSent >= priceRequired) {
      
      // SUCCESSO: Inviamo il file
      const filePath = path.join(UPLOAD_DIR, `${fileId}.dat`);
      
      if (!fs.existsSync(filePath)) {
         return NextResponse.json({ error: "File corrupted on server" }, { status: 500 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileData.originalName}"`,
          'X-Payment-Status': 'verified'
        },
      });
    } else {
      return NextResponse.json({ error: "Payment Invalid: Wrong recipient or insufficient funds" }, { status: 403 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Transaction lookup failed" }, { status: 400 });
  }
}