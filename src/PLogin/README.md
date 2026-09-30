# Conexión de PLogin a MongoDB Atlas

Este módulo contiene únicamente la base de conexión a MongoDB Atlas. No
incluye registro, inicio de sesión, rutas HTTP ni modelos de usuario.

## Requisitos

- Node.js 20.19.0 o una versión posterior.
- Un clúster de MongoDB Atlas con un usuario de base de datos.
- Tu dirección IP habilitada en **Network Access** de Atlas.

## Configuración

Desde esta carpeta instala las dependencias:

```powershell
npm.cmd install
```

Copia el archivo de ejemplo:

```powershell
Copy-Item .env.example .env
```

Edita `.env` con tus datos reales:

```dotenv
MONGODB_URI=tu_uri_de_mongodb_atlas
MONGODB_DB_NAME=nombre_de_tu_base_de_datos
```

El archivo `.env` está excluido de Git. Si el usuario o la contraseña
contienen caracteres especiales, usa sus valores codificados para una URL.

## Comprobar la conexión

Ejecuta:

```powershell
npm.cmd run db:check
```

La comprobación carga `.env`, abre la conexión, ejecuta `ping` contra Atlas y
cierra el cliente. Si funciona, verás el nombre de la base conectada. Los
errores no muestran la URI ni las credenciales.

## Reutilizar la conexión

El backend futuro puede importar las mismas funciones:

```js
import 'dotenv/config';
import { readDatabaseConfig } from './src/config/database-config.js';
import {
  closeDatabaseConnection,
  connectToDatabase,
} from './src/database/mongodb.js';

const database = await connectToDatabase(readDatabaseConfig());

// Usa `database.collection('nombre')` para acceder a una colección.

await closeDatabaseConnection();
```
