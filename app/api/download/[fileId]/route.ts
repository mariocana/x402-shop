import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';
import path from 'path';

const client = createPublicClient({ chain: baseSepolia, transport: http() });
const DB_PATH = path.join(process.cwd(), 'database.json');
const UPLOAD_DIR = path.join(process.cwd(), 'private-uploads');

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  // 1. Verifica DB
  if (!fs.existsSync(DB_PATH)) return NextResponse.json({ error: "DB error" }, { status: 500 });
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const fileData = db[fileId];

  if (!fileData) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // 2. Controllo Header Pagamento
  const paymentHash = req.headers.get('x-payment') || (await req.json().catch(() => ({}))).txHash;

  if (!paymentHash) {
    // --- QUI AGGIUNGIAMO I DATI EXTRA ---
    return NextResponse.json(
      { 
        error: "Payment Required",
        // Dati descrittivi per la UI
        fileName: fileData.originalName, 
        sellerWallet: fileData.sellerWallet,
        fileSize: fileData.size,
        // Dati tecnici per il pagamento
        offers: [{
            amount: fileData.price,
            recipient: fileData.sellerWallet,
            currency: "ETH"
        }]
      },
      { status: 402 }
    );
  }

  // 3. Verifica Transazione
  try {
    const tx = await client.getTransaction({ hash: paymentHash as `0x${string}` });
    
    // Check Address e Importo
    if (
      tx.to?.toLowerCase() === fileData.sellerWallet.toLowerCase() && 
      tx.value >= parseEther(fileData.price)
    ) {
      const filePath = path.join(UPLOAD_DIR, `${fileId}.dat`);
      if (!fs.existsSync(filePath)) return NextResponse.json({ error: "File missing" }, { status: 404 });

      const fileBuffer = fs.readFileSync(filePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileData.originalName}"`,
        },
      });
    }
  } catch (e) {
    console.error(e);
  }
  
  return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
}