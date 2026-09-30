export class DatabaseConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseConfigurationError';
  }
}

export function readDatabaseConfig(environment = process.env) {
  const uri = environment.MONGODB_URI?.trim();
  const databaseName = environment.MONGODB_DB_NAME?.trim();

  if (!uri) {
    throw new DatabaseConfigurationError(
      'Falta la variable de entorno MONGODB_URI.',
    );
  }

  if (!databaseName) {
    throw new DatabaseConfigurationError(
      'Falta la variable de entorno MONGODB_DB_NAME.',
    );
  }

  return { uri, databaseName };
}
