import { MongoClient } from 'mongodb';

let activeClient;
let activeDatabase;
let connectionPromise;

function createMongoClient(uri) {
  return new MongoClient(uri);
}

export function connectToDatabase(
  config,
  { clientFactory = createMongoClient } = {},
) {
  if (activeDatabase) {
    return Promise.resolve(activeDatabase);
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const client = clientFactory(config.uri);
  activeClient = client;

  connectionPromise = (async () => {
    try {
      await client.connect();
      activeDatabase = client.db(config.databaseName);
      return activeDatabase;
    } catch (error) {
      if (activeClient === client) {
        activeClient = undefined;
        activeDatabase = undefined;
        connectionPromise = undefined;
      }

      try {
        await client.close();
      } catch {
        // El error de conexión original conserva la causa útil.
      }

      throw error;
    }
  })();

  return connectionPromise;
}

export async function closeDatabaseConnection() {
  const client = activeClient;

  activeClient = undefined;
  activeDatabase = undefined;
  connectionPromise = undefined;

  if (client) {
    await client.close();
  }
}
