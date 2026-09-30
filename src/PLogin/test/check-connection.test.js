import test from 'node:test';
import assert from 'node:assert/strict';

import { runConnectionCheck } from '../src/check-connection.js';

function createLogger() {
  return {
    infoMessages: [],
    errorMessages: [],
    info(message) {
      this.infoMessages.push(message);
    },
    error(message) {
      this.errorMessages.push(message);
    },
  };
}

test('comprueba Atlas con ping y reporta la base conectada', async () => {
  const logger = createLogger();
  const commands = [];
  let closeCalls = 0;
  const database = {
    async command(command) {
      commands.push(command);
      return { ok: 1 };
    },
  };

  const result = await runConnectionCheck({
    environment: {
      MONGODB_URI: 'mongodb://example.test:27017',
      MONGODB_DB_NAME: 'plogin',
    },
    connect: async () => database,
    close: async () => {
      closeCalls += 1;
    },
    logger,
  });

  assert.equal(result, true);
  assert.deepEqual(commands, [{ ping: 1 }]);
  assert.deepEqual(logger.infoMessages, [
    'Conexión correcta a MongoDB Atlas (base de datos: plogin).',
  ]);
  assert.equal(closeCalls, 1);
});

test('oculta la URI cuando falla la conexión y siempre cierra', async () => {
  const secretUri = 'mongodb+srv://usuario:secreto@example.test/';
  const logger = createLogger();
  let closeCalls = 0;

  const result = await runConnectionCheck({
    environment: {
      MONGODB_URI: secretUri,
      MONGODB_DB_NAME: 'plogin',
    },
    connect: async () => {
      throw new Error(`connection failed for ${secretUri}`);
    },
    close: async () => {
      closeCalls += 1;
    },
    logger,
  });

  assert.equal(result, false);
  assert.equal(closeCalls, 1);
  assert.deepEqual(logger.errorMessages, [
    'No fue posible conectar con MongoDB Atlas. Revisa las credenciales y el acceso de red del clúster.',
  ]);
  assert.equal(logger.errorMessages.join(' ').includes(secretUri), false);
});

test('explica qué variable falta antes de intentar conectar', async () => {
  const logger = createLogger();
  let connectCalls = 0;

  const result = await runConnectionCheck({
    environment: {},
    connect: async () => {
      connectCalls += 1;
    },
    close: async () => {},
    logger,
  });

  assert.equal(result, false);
  assert.equal(connectCalls, 0);
  assert.deepEqual(logger.errorMessages, [
    'Falta la variable de entorno MONGODB_URI.',
  ]);
});
