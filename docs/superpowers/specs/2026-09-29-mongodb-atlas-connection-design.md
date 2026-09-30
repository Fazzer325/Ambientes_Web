# MongoDB Atlas Connection Design

## Goal

Create the foundation for a Node.js module in `src/PLogin` that connects to
MongoDB Atlas. This scope includes only database configuration, connection
lifecycle management, and a command that verifies connectivity. It excludes
registration, login, HTTP routes, and user models.

## Architecture

`src/PLogin` will be an independent Node.js package using ECMAScript modules
and the official `mongodb` driver. Keeping its package metadata inside the
directory prevents the connection module from affecting the unrelated static
web projects in the repository.

The package will contain:

- `package.json` and a lockfile for reproducible dependencies and scripts.
- `.env.example` documenting `MONGODB_URI` and `MONGODB_DB_NAME` without real
  credentials.
- `.gitignore` preventing `.env` and local dependency files from being
  committed.
- A configuration module that loads and validates the required environment
  variables.
- A database module that owns one reusable `MongoClient`, exposes connection
  and shutdown operations, and does not reveal the connection string in
  errors.
- A command-line script that checks the Atlas connection with `ping` and
  always closes the client before exiting.

## Data Flow

Running `npm run db:check` loads `.env`, validates both required values,
connects to the configured Atlas deployment, selects the configured database,
executes the MongoDB `ping` command, prints a success message, and closes the
connection. A missing setting causes an immediate, readable configuration
error. A network or authentication problem produces a concise connection
error without echoing credentials.

Future backend code can import the same database module and reuse the active
connection rather than creating a new client for every operation.

## Error Handling and Security

Secrets remain only in the untracked `.env` file. The example file contains
placeholders. Errors identify the failing phase but never include the complete
MongoDB URI. The connectivity command sets a failing process exit code and
still attempts an orderly shutdown.

## Testing and Verification

Node's built-in test runner will verify environment validation and connection
lifecycle behavior without requiring Atlas credentials. Tests will be written
before production code and will use dependency injection at the Mongo client
boundary so lifecycle behavior can be exercised deterministically.

The implementation will also be checked by running the connectivity command
without `.env`, which must fail with a clear configuration message. A real
Atlas `ping` requires the developer to copy `.env.example` to `.env` and add
their own Atlas URI and database name.

## Success Criteria

- `src/PLogin` installs and runs independently on a Node.js version supported
  by the selected MongoDB driver.
- Required configuration is validated before attempting a connection.
- Consumers reuse one active database connection.
- The check command reports success only after Atlas responds to `ping`.
- Secrets and local dependencies are excluded from version control.
- Automated tests pass without access to Atlas.
