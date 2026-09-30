import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import {
  DatabaseConfigurationError,
  readDatabaseConfig,
} from './config/database-config.js';
import {
  closeDatabaseConnection,
  connectToDatabase,
} from './database/mongodb.js';

const CONNECTION_ERROR_MESSAGE =
  'No fue posible conectar con MongoDB Atlas. Revisa las credenciales y el acceso de red del clúster.';
const CLOSE_ERROR_MESSAGE =
  'La comprobación terminó, pero no fue posible cerrar la conexión de MongoDB.';

export async function runConnectionCheck({
  environment = process.env,
  connect = connectToDatabase,
  close = closeDatabaseConnection,
  logger = console,
} = {}) {
  let succeeded = false;

  try {
    const config = readDatabaseConfig(environment);
    const database = await connect(config);

    await database.command({ ping: 1 });
    logger.info(
      `Conexión correcta a MongoDB Atlas (base de datos: ${config.databaseName}).`,
    );
    succeeded = true;
  } catch (error) {
    logger.error(
      error instanceof DatabaseConfigurationError
        ? error.message
        : CONNECTION_ERROR_MESSAGE,
    );
  } finally {
    try {
      await close();
    } catch {
      logger.error(CLOSE_ERROR_MESSAGE);
      succeeded = false;
    }
  }

  return succeeded;
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const succeeded = await runConnectionCheck();

  if (!succeeded) {
    process.exitCode = 1;
  }
}
