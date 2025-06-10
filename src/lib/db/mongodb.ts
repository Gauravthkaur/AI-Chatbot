import { MongoClient, ServerApiVersion, MongoClientOptions } from 'mongodb';

// Ensure the MongoDB URI is defined
const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// --- Best Practice: Define MongoClientOptions ---
// We define options once to be reused.
const options: MongoClientOptions = {
  // Use the new Server API Stable version
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Set a reasonable pool size. The default is 5.
  maxPoolSize: 10,
  // Set a timeout for the server selection
  serverSelectionTimeoutMS: 5000, // 5 seconds
  // Set a timeout for socket operations
  socketTimeoutMS: 30000, // 30 seconds
  
  // NOTE: The MongoDB Node.js driver automatically enables TLS/SSL 
  // when connecting to a `mongodb+srv://` URI. Explicitly setting `tls: true`
  // is usually not necessary. The problematic options have been removed.
};

// --- Singleton Pattern for Database Connection ---
// This pattern prevents multiple connections from being opened, especially in a serverless environment.

// In development, we use a global variable to preserve the client
// across module reloads caused by HMR (Hot Module Replacement).
// In production, the module is loaded once per server instance, so we can cache it locally.

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Extend the NodeJS Global type to include our cached mongo client
declare global {
  // Using var here as it's required for global declaration merging
  // This is a special case where var is needed for proper type augmentation
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

declare const global: typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  // The module is executed once per server instance.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * A helper function to check if the MongoDB client is connected.
 * It does this by pinging the 'admin' database.
 * @returns {Promise<boolean>} - True if connected, false otherwise.
 */
export async function isMongoConnected(): Promise<boolean> {
  try {
    // Get the client from the promise
    const mongoClient = await clientPromise;
    // Ping the database to check for a successful connection
    await mongoClient.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB and pinged the database.");
    return true;
  } catch (error) {
    console.error("MongoDB connection check failed:", error);
    return false;
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;