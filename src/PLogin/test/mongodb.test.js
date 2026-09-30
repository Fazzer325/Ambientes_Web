import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  closeDatabaseConnection,
  connectToDatabase,
} from '../src/database/mongodb.js';

const config = {
  uri: 'mongodb://example.test:27017',
  databaseName: 'plogin',
};

function createFakeClient({ connectError, waitForConnect } = {}) {
  const databases = new Map();

  return {
    connectCalls: 0,
    closeCalls: 0,
    selectedNames: [],

    async connect() {
      this.connectCalls += 1;
      await waitForConnect?.();

      if (connectError) {
        throw connectError;
      }

      return this;
    },

    db(name) {
      this.selectedNames.push(name);

      if (!databases.has(name)) {
        databases.set(name, { databaseName: name });
      }

      return databases.get(name);
    },

    async close() {
      this.closeCalls += 1;
    },
  };
}

afterEach(async () => {
  await closeDatabaseConnection();
});

test('conecta y devuelve la base de datos configurada', async () => {
  const client = createFakeClient();

  const database = await connectToDatabase(config, {
    clientFactory: () => client,
  });

  assert.equal(database.databaseName, 'plogin');
  assert.deepEqual(client.selectedNames, ['plogin']);
});

test('reutiliza la base de datos en llamadas consecutivas', async () => {
  const client = createFakeClient();
  let factoryCalls = 0;
  const clientFactory = () => {
    factoryCalls += 1;
    return client;
  };

  const first = await connectToDatabase(config, { clientFactory });
  const second = await connectToDatabase(config, { clientFactory });

  assert.strictEqual(second, first);
  assert.equal(factoryCalls, 1);
  assert.equal(client.connectCalls, 1);
});

test('comparte un solo intento entre llamadas concurrentes', async () => {
  let releaseConnection;
  const client = createFakeClient({
    waitForConnect: () => new Promise((resolve) => {
      releaseConnection = resolve;
    }),
  });
  let factoryCalls = 0;
  const clientFactory = () => {
    factoryCalls += 1;
    return client;
  };

  const firstPromise = connectToDatabase(config, { clientFactory });
  const secondPromise = connectToDatabase(config, { clientFactory });

  assert.equal(factoryCalls, 1);
  assert.equal(client.connectCalls, 1);
  releaseConnection();

  const [first, second] = await Promise.all([firstPromise, secondPromise]);
  assert.strictEqual(second, first);
});

test('permite reintentar después de una conexión rechazada', async () => {
  const failedClient = createFakeClient({
    connectError: new Error('network unavailable'),
  });

  await assert.rejects(
    connectToDatabase(config, { clientFactory: () => failedClient }),
    /network unavailable/,
  );

  const recoveredClient = createFakeClient();
  const database = await connectToDatabase(config, {
    clientFactory: () => recoveredClient,
  });

  assert.equal(database.databaseName, 'plogin');
  assert.equal(failedClient.closeCalls, 1);
  assert.equal(recoveredClient.connectCalls, 1);
});

test('cerrar sin conexión activa es seguro', async () => {
  await assert.doesNotReject(closeDatabaseConnection());
});

test('cerrar permite crear una conexión nueva', async () => {
  const firstClient = createFakeClient();
  const secondClient = createFakeClient();

  const first = await connectToDatabase(config, {
    clientFactory: () => firstClient,
  });
  await closeDatabaseConnection();
  const second = await connectToDatabase(config, {
    clientFactory: () => secondClient,
  });

  assert.notStrictEqual(second, first);
  assert.equal(firstClient.closeCalls, 1);
  assert.equal(secondClient.connectCalls, 1);
});

test('descarta una conexión pendiente que fue cerrada', async () => {
  let releaseConnection;
  const pendingClient = createFakeClient({
    waitForConnect: () => new Promise((resolve) => {
      releaseConnection = resolve;
    }),
  });

  const pendingConnection = connectToDatabase(config, {
    clientFactory: () => pendingClient,
  });

  await closeDatabaseConnection();
  releaseConnection();

  await assert.rejects(
    pendingConnection,
    /se cerró antes de completarse/,
  );
  assert.equal(pendingClient.closeCalls, 1);

  const freshClient = createFakeClient();
  const database = await connectToDatabase(config, {
    clientFactory: () => freshClient,
  });

  assert.equal(database.databaseName, 'plogin');
  assert.equal(freshClient.connectCalls, 1);
});
