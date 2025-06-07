import { MongoClient, ServerApiVersion, MongoClientOptions } from 'mongodb';

// Don't validate during build
const isBuildPhase = typeof process !== 'undefined' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || 
   process.env.NEXT_PHASE === 'phase-export');

const uri = process.env.MONGODB_URI;

// Only log in non-build environments
if (!uri && !isBuildPhase) {
  console.warn('MongoDB URI is not defined in environment variables');
}

const options: MongoClientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient | null>;

// During build, return a resolved promise with null
if (isBuildPhase) {
  clientPromise = Promise.resolve(null);
} 
// In development, use a global variable to preserve the connection
else if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient | null>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    if (uri) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect()
        .then(connectedClient => {
          console.log('MongoDB connected successfully in development');
          return connectedClient;
        })
        .catch(error => {
          console.error('MongoDB connection error in development:', error);
          return null;
        });
    } else {
      globalWithMongo._mongoClientPromise = Promise.resolve(null);
    }
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} 
// In production
else if (uri) {
  client = new MongoClient(uri, options);
  clientPromise = client.connect()
    .then(connectedClient => {
      console.log('MongoDB connected successfully in production');
      return connectedClient;
    })
    .catch(error => {
      console.error('MongoDB connection error in production:', error);
      return null;
    });
} else {
  clientPromise = Promise.resolve(null);
}

// Export a module-scoped MongoClient promise.
// This allows the client to be shared across functions.
export default clientPromise;