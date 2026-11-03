import mongoose from "mongoose";

type CachedConnection = {
  promise: Promise<typeof mongoose> | null;
  connectedUri: string | null;
};

const globalForDatabase = globalThis as typeof globalThis & {
  __profile2resumeMongo?: CachedConnection;
};

const cache = (globalForDatabase.__profile2resumeMongo ??= {
  promise: null,
  connectedUri: null,
});

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("MONGODB_URI is not configured");
    this.name = "DatabaseConfigurationError";
  }
}

export function getMongoUri(source: NodeJS.ProcessEnv = process.env): string {
  const uri = source.MONGODB_URI?.trim();
  if (!uri) {
    throw new DatabaseConfigurationError();
  }
  return uri;
}

export async function connectToDatabase(
  source: NodeJS.ProcessEnv = process.env,
): Promise<typeof mongoose> {
  const uri = getMongoUri(source);

  if (cache.promise && cache.connectedUri === uri) {
    return cache.promise;
  }

  if (cache.promise && cache.connectedUri !== uri) {
    await cache.promise.catch(() => undefined);
    cache.promise = null;
    cache.connectedUri = null;
  }

  cache.connectedUri = uri;
  const options = {
    serverSelectionTimeoutMS: 5_000,
    ...(source.MONGODB_DB_NAME?.trim() ? { dbName: source.MONGODB_DB_NAME.trim() } : {}),
  };
  cache.promise = mongoose
    .connect(uri, options)
    .then((connection) => {
      console.info("MongoDB connection established");
      return connection;
    })
    .catch((error: unknown) => {
      cache.promise = null;
      cache.connectedUri = null;
      console.error(
        "MongoDB connection failed",
        error instanceof Error ? error.message : "unknown error",
      );
      throw error;
    });

  return cache.promise;
}

export async function disconnectFromDatabase(): Promise<void> {
  cache.promise = null;
  cache.connectedUri = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
