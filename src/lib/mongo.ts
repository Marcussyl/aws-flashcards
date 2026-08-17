import { setDefaultResultOrder, setServers } from 'node:dns'
import { MongoClient } from 'mongodb'

// Windows resolvers often refuse Node SRV lookups for mongodb+srv://
setDefaultResultOrder('ipv4first')
setServers(['8.8.8.8', '1.1.1.1'])

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClient?: Promise<MongoClient>
}

function getMongoUri() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Missing MONGODB_URI. Copy .env.example to .env.local and add your Atlas connection string.')
  }
  return uri
}

export function getMongoClient() {
  if (!globalForMongo._mongoClient) {
    const client = new MongoClient(getMongoUri(), {
      // Serverless-friendly: Vercel may spawn many short-lived instances.
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 15000,
      serverSelectionTimeoutMS: 20000,
    })
    globalForMongo._mongoClient = client.connect().catch((error) => {
      globalForMongo._mongoClient = undefined
      throw error
    })
  }
  return globalForMongo._mongoClient
}

export async function getDb() {
  const client = await getMongoClient()
  return client.db(process.env.MONGODB_DB ?? 'aws-flashcards')
}
