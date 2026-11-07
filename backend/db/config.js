import { MongoClient } from "mongodb";
const connectionString = "<YOUR_MONGODB_ATALS_URL_STRING>"; // TODO: Replace <YOUR_MONGODB_ATLAS_URL_STRING> with your actual MongoDB Atlas connection string
const client = new MongoClient(connectionString);
let conn;
try {
 conn = await client.connect();
} catch(e) {
 console.error(e);
}
// Database name
let db = conn.db("<YOUR_DATABASE_NAME>"); // TODO: Replace <YOUR_DATABASE_NAME> with your actual database name
export default db;


