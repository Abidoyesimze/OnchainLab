import { createPublicClient, http, formatEther } from 'viem';
import { mantleSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const privateKey = process.env.MANTLE_SEPOLIA_PRIVATE_KEY;
  if (!privateKey) {
    console.log('No private key found');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = createPublicClient({
    chain: mantleSepolia,
    transport: http('https://rpc.sepolia.mantle.xyz')
  });

  const balance = await client.getBalance({ address: account.address });
  console.log(`Address: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} MNT`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

