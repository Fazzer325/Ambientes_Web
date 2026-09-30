import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DatabaseConfigurationError,
  readDatabaseConfig,
} from '../src/config/database-config.js';

test('normaliza una configuración completa de MongoDB', () => {
  const config = readDatabaseConfig({
    MONGODB_URI: '  mongodb://localhost:27017  ',
    MONGODB_DB_NAME: '  plogin  ',
  });

  assert.deepEqual(config, {
    uri: 'mongodb://localhost:27017',
    databaseName: 'plogin',
  });
});

for (const value of ['cris', 'https://example.test']) {
  test(`rechaza una URI que no usa el protocolo de MongoDB (${value})`, () => {
    assert.throws(
      () => readDatabaseConfig({
        MONGODB_URI: value,
        MONGODB_DB_NAME: 'plogin',
      }),
      (error) => {
        assert.ok(error instanceof DatabaseConfigurationError);
        assert.equal(
          error.message,
          'MONGODB_URI debe comenzar con mongodb+srv:// o mongodb://.',
        );
        return true;
      },
    );
  });
}

for (const value of [undefined, '', '   ']) {
  test(`rechaza MONGODB_URI sin contenido (${JSON.stringify(value)})`, () => {
    assert.throws(
      () => readDatabaseConfig({
        MONGODB_URI: value,
        MONGODB_DB_NAME: 'plogin',
      }),
      (error) => {
        assert.ok(error instanceof DatabaseConfigurationError);
        assert.equal(error.message, 'Falta la variable de entorno MONGODB_URI.');
        return true;
      },
    );
  });
}

for (const value of [undefined, '', '   ']) {
  test(`rechaza MONGODB_DB_NAME sin contenido (${JSON.stringify(value)})`, () => {
    assert.throws(
      () => readDatabaseConfig({
        MONGODB_URI: 'mongodb://localhost:27017',
        MONGODB_DB_NAME: value,
      }),
      (error) => {
        assert.ok(error instanceof DatabaseConfigurationError);
        assert.equal(error.message, 'Falta la variable de entorno MONGODB_DB_NAME.');
        return true;
      },
    );
  });
}
