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
  constructor(message = "MONGODB_URI is not configured") {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export function getMongoUri(source: NodeJS.ProcessEnv = process.env): string {
  const uri = source.MONGODB_URI?.trim();
  if (!uri) {
    throw new DatabaseConfigurationError();
  }
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new DatabaseConfigurationError("MONGODB_URI must be a valid MongoDB connection string");
  }
  if (!["mongodb:", "mongodb+srv:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new DatabaseConfigurationError("MONGODB_URI must be a valid MongoDB connection string");
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
    const previousConnection = cache.promise;
    await previousConnection.catch(() => undefined);
    if (cache.promise !== previousConnection) {
      return connectToDatabase(source);
    }
    await disconnectFromDatabase();
  }

  cache.connectedUri = uri;
  const options = {
    serverSelectionTimeoutMS: 5_000,
    ...(source.MONGODB_DB_NAME?.trim() ? { dbName: source.MONGODB_DB_NAME.trim() } : {}),
  };
  const connectionPromise = mongoose
    .connect(uri, options)
    .then(async (connection) => {
      await Promise.all(
        Object.values(mongoose.models).map((registeredModel) => registeredModel.init()),
      );
      console.info("MongoDB connection established");
      return connection;
    })
    .catch((error: unknown) => {
      if (cache.promise === connectionPromise) {
        cache.promise = null;
        cache.connectedUri = null;
      }
      console.error(
        "MongoDB connection failed",
        error instanceof Error ? error.message : "unknown error",
      );
      throw error;
    });

  cache.promise = connectionPromise;
  return connectionPromise;
}

export async function disconnectFromDatabase(): Promise<void> {
  const pendingConnection = cache.promise;
  if (pendingConnection) {
    await pendingConnection.catch(() => undefined);
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (cache.promise === pendingConnection) {
    cache.promise = null;
    cache.connectedUri = null;
  }
}
