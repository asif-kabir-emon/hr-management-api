import { MongoClient } from "mongodb";

const uri =
  "mongodb+srv://assignment2:lF3oZFs3luDvj9JL@userc1.twqeubr.mongodb.net";
const dbName = "nztrip-attendance-system";

async function dropAllCollections() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      console.log(`Dropping ${collection.name}`);
      await db.collection(collection.name).drop();
    }

    console.log("All collections dropped.");

    await client.db(dbName).dropDatabase();
    console.log(`Database ${dbName} dropped.`);
  } finally {
    await client.close();
  }
}

dropAllCollections().catch(console.error);
