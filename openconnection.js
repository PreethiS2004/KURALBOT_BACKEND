const { MongoClient } = require("mongodb");

const client = new MongoClient(
  "mongodb+srv://preethi:kuralbot@cluster0.fp877.mongodb.net/"
);
function connectToMongoDB() {
  try {
    client.connect();
    console.log("Connected to MongoDB open");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
  return client;
}


module.exports = { client, connectToMongoDB };

