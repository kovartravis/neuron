import net from 'node:net';
import type { NeuronMemory } from '../index.js';
import { startUiServer } from '../ui/server.js';

export interface UiCommandOptions {
  port: number;
  noOpen: boolean;
}

function parseUiArgs(args: string[]): UiCommandOptions {
  let port = 3333;
  let noOpen = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port') {
      const val = parseInt(args[++i], 10);
      if (!Number.isNaN(val) && val > 0) port = val;
    } else if (args[i] === '--no-open') {
      noOpen = true;
    }
  }

  return { port, noOpen };
}

async function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(startPort, '127.0.0.1', () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on('error', () => resolve(findFreePort(startPort + 1)));
  });
}

async function openBrowser(url: string): Promise<void> {
  const { execSync } = await import('node:child_process');
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? `open "${url}"` :
    platform === 'win32'  ? `start "" "${url}"` :
                            `xdg-open "${url}"`;
  try { execSync(cmd, { stdio: 'ignore' }); } catch { /* ignore */ }
}

export async function handleUiCommand(
  args: string[],
  memory: NeuronMemory
): Promise<void> {
  const { port: requestedPort, noOpen } = parseUiArgs(args.slice(1));

  const port = await findFreePort(requestedPort);
  const srv = await startUiServer({ memory, port });

  const url = `http://localhost:${srv.port}`;
  console.log(`\n  neuron dashboard running at ${url}\n`);

  if (!noOpen) {
    await openBrowser(url);
  }

  await new Promise<void>((resolve) => {
    process.on('SIGINT',  async () => { await srv.close(); memory.close(); resolve(); process.exit(0); });
    process.on('SIGTERM', async () => { await srv.close(); memory.close(); resolve(); process.exit(0); });
  });
}
