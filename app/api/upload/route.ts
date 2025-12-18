import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'database.json');
const UPLOAD_DIR = path.join(process.cwd(), 'private-uploads');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const price = formData.get('price') as string;
    const sellerWallet = formData.get('wallet') as string;

    if (!file || !price || !sellerWallet) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Crea directory se non esiste
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    // Salva File
    const fileId = uuidv4();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(path.join(UPLOAD_DIR, `${fileId}.dat`), buffer);

    // Salva Metadata (Pseudo-DB)
    let db: any = {};
    if (fs.existsSync(DB_PATH)) {
      const fileContent = fs.readFileSync(DB_PATH, 'utf8');
      if (fileContent) db = JSON.parse(fileContent);
    }
    
    db[fileId] = {
      originalName: file.name,
      size: file.size,
      price: price,
      sellerWallet: sellerWallet,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true, fileId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}