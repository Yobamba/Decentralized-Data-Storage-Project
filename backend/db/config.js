import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const connectionString = process.env.MONGODB_ATLAS_URL_STRING;
const client = new MongoClient(connectionString);
let conn;


try {
 conn = await client.connect();
} catch(e) {
 console.error(e);
}
// Database name
let db = conn.db("ADADProject"); 
export default db;


