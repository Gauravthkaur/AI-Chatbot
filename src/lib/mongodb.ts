import { MongoClient, ServerApiVersion, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MongoDB URI is not defined in environment variables');
  // Don't throw error during build time for static pages
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn('MongoDB URI is missing. Some features may not work correctly.');
  }
}

const options: MongoClientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  // In case URI is not available, create a dummy client that will throw when used
  clientPromise = Promise.reject(new Error('MongoDB URI is not configured'));
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so the value is preserved across module reloads
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect()
      .then(connectedClient => {
        console.log('MongoDB connected successfully');
        return connectedClient;
      })
      .catch(error => {
        console.error('MongoDB connection error:', error);
        throw error;
      });
  }
  clientPromise = globalWithMongo._mongoClientPromise!;
} else {
  // In production mode, don't use a global variable
  client = new MongoClient(uri!, options);
  clientPromise = client.connect()
    .then(connectedClient => {
      console.log('MongoDB connected successfully in production');
      return connectedClient;
    })
    .catch(error => {
      console.error('MongoDB production connection error:', error);
      throw error;
    });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;