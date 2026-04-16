const { CosmosClient }    = require("@azure/cosmos");
const { SearchClient,
        SearchIndexClient,
        AzureKeyCredential } = require("@azure/search-documents");
require("dotenv").config();

// Cosmos DB
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key:      process.env.COSMOS_KEY
});
const db = cosmosClient.database(process.env.COSMOS_DATABASE);

// AI Search
const searchClient = new SearchClient(
  process.env.SEARCH_ENDPOINT,
  process.env.SEARCH_INDEX,
  new AzureKeyCredential(process.env.SEARCH_KEY)
);

module.exports = { db, searchClient };