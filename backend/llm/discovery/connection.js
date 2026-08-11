import mongoose from 'mongoose';
import { decryptSecret, hostFromUri } from '../security/secrets.js';

/**
 * Resolve a mongoose Connection for analytics.
 * mode=self → default app connection
 * mode=mongodb_uri → temporary connection from encrypted URI
 */
export async function getDataConnection(connectionDoc) {
  if (!connectionDoc || connectionDoc.mode === 'self') {
    return {
      db: mongoose.connection.db,
      conn: mongoose.connection,
      release: async () => {},
      dbName: mongoose.connection.name,
      host: mongoose.connection.host || 'self',
    };
  }

  const uri = decryptSecret(connectionDoc.encryptedUri);
  if (!uri) {
    throw new Error('Connection URI missing or could not be decrypted. Set LLM_SECRET and reconnect.');
  }

  const conn = await mongoose.createConnection(uri, {
    maxPoolSize: 4,
    serverSelectionTimeoutMS: 12000,
  }).asPromise();

  return {
    db: conn.db,
    conn,
    release: async () => {
      try {
        await conn.close();
      } catch {
        /* ignore */
      }
    },
    dbName: conn.name,
    host: hostFromUri(uri),
  };
}
