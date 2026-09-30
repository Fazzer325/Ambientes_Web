import { config as loadEnvironment } from 'dotenv';
import { fileURLToPath } from 'node:url';

const environmentFile = fileURLToPath(new URL('./.env', import.meta.url));
loadEnvironment({ path: environmentFile, quiet: true });

const { runConnectionCheck } = await import('./src/check-connection.js');
const connected = await runConnectionCheck();

if (!connected) {
  process.exitCode = 1;
}
