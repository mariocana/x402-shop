import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.json');

export async function GET() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json([]);
    }
    
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    
    // Convertiamo l'oggetto {id: data} in array [{id, ...data}]
    // Nascondiamo il wallet del venditore per privacy nella lista pubblica
    const files = Object.entries(db).map(([id, data]: any) => ({
      id,
      originalName: data.originalName,
      price: data.price,
      createdAt: data.createdAt,
      size: data.size
    })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Ordina per più recenti

    return NextResponse.json(files);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}