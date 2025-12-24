// agent.ts
import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// CONFIGURATION
const MARKET_URL = 'http://localhost:3000'; 
const AGENT_DOWNLOAD_DIR = path.join(process.cwd(), 'agent-downloads');

// 1. Setup Agent Wallet
const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
if (!privateKey) {
    console.error("❌ ERROR: Missing AGENT_PRIVATE_KEY in .env file");
    process.exit(1);
}

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http()
});
const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

// --- Funzione di attesa ---
function waitForStart(): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        console.clear();
        console.log("\n\n");
        console.log("   ╔══════════════════════════════════════════╗");
        console.log("   ║      x402 AUTONOMOUS AGENT SYSTEM        ║");
        console.log("   ║           Status: STANDBY                ║");
        console.log("   ╚══════════════════════════════════════════╝");
        console.log("\n");
        
        rl.question('   > Press [ENTER] to initialize sequence...', () => {
            rl.close();
            resolve();
        });
    });
}

async function runAgent() {

  await waitForStart();

  console.log(`\n\n🤖 AGENT INITIALIZED`);
  console.log(`🆔 Identity: ${account.address}`);
  
  // 2. Discovery Phase
  console.log("\n🔎 PHASE 1: DISCOVERY");
  console.log("   Scanning marketplace for available assets...");
  
  let files;
  try {
    const listRes = await fetch(`${MARKET_URL}/api/files`);
    files = await listRes.json();
  } catch (e) {
    console.error("❌ Connection failed. Is the server running at localhost:3000?");
    return;
  }

  if (!files || files.length === 0) {
    console.log("❌ No assets found in the marketplace.");
    return;
  }
  console.log(`   Found ${files.length} available assets.`);

  // 3. Selection Strategy (Random)
  const randomFile = files[Math.floor(Math.random() * files.length)];
  console.log(`🎯 TARGET ACQUIRED: "${randomFile.originalName}"`);
  console.log(`   ID: ${randomFile.id}`);

  // 4. Handshake Protocol
  console.log("\n🔒 PHASE 2: HANDSHAKE");
  console.log("   Requesting resource access...");
  const initRes = await fetch(`${MARKET_URL}/api/download/${randomFile.id}`, { method: 'POST' });

  if (initRes.status === 402) {
    const challenge = await initRes.json();
    
    // Safety check for offer structure
    let offer;
    if (challenge.offers && challenge.offers.length > 0) {
        offer = challenge.offers[0];
    } else {
        offer = challenge; // Fallback
    }

    if(!offer.amount || !offer.recipient) {
        console.error("❌ Invalid 402 challenge received.");
        return;
    }
    
    console.log(`🛑 HTTP 402 PAYMENT REQUIRED RECEIVED`);
    console.log(`   Price:     ${offer.amount} ETH`);
    console.log(`   Payee:     ${offer.recipient}`);

    // Check Balance
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance < parseEther(offer.amount.toString())) {
        console.error(`❌ INSUFFICIENT FUNDS. Balance: ${formatEther(balance)} ETH`);
        return;
    }

    // 5. Execution (Payment)
    console.log("\n💸 PHASE 3: EXECUTION");
    console.log("   Broadcasting transaction to Base Sepolia...");

    try {
      const hash = await walletClient.sendTransaction({
        to: offer.recipient,
        value: parseEther(offer.amount.toString())
      });

      console.log(`🚀 TX SENT: https://sepolia.basescan.org/tx/${hash}`);
      console.log("⏳ Awaiting block confirmation...");

      await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ Transaction confirmed on-chain.");

      // 6. Redemption (Proof of Payment)
      console.log("\n📥 PHASE 4: REDEMPTION");
      console.log("   Exchanging proof-of-payment (TxHash) for asset...");
      
      const finalRes = await fetch(`${MARKET_URL}/api/download/${randomFile.id}`, {
        method: 'POST',
        headers: {
          'X-Payment': hash // The x402 Proof
        }
      });

      if (finalRes.ok) {
        // Save to disk
        if (!fs.existsSync(AGENT_DOWNLOAD_DIR)) fs.mkdirSync(AGENT_DOWNLOAD_DIR);
        
        const buffer = await finalRes.arrayBuffer();
        const savePath = path.join(AGENT_DOWNLOAD_DIR, `agent_bought_${randomFile.originalName}`);
        fs.writeFileSync(savePath, Buffer.from(buffer));

        console.log(`\n🎉 MISSION SUCCESS`);
        console.log(`   Asset secured at: ${savePath}\n`);
      } else {
        const errorText = await finalRes.text();
        console.error(`❌ REDEMPTION FAILED: ${finalRes.status} - ${errorText}`);
      }

    } catch (e: any) {
      console.error("❌ FATAL ERROR during execution:", e.message);
    }
  } else {
    console.log("⚠️ Resource is not gated by x402 (Status 200) or Server Error.");
  }
}

runAgent();