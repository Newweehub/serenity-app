const { AzureOpenAI } = require("openai");
require("dotenv").config();

const client = new AzureOpenAI({
  endpoint:   process.env.AZURE_OPENAI_ENDPOINT,
  apiKey:     process.env.AZURE_OPENAI_KEY,
  apiVersion: "2024-12-01-preview",
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT
});

async function chat(systemPrompt, userMessage, history = []) {
  const messages = [
    { role: "system",  content: systemPrompt },
    ...history,
    { role: "user",    content: userMessage }
  ];
  const response = await client.chat.completions.create({
    model:      process.env.AZURE_OPENAI_DEPLOYMENT,
    messages,
    max_tokens: 1000,
    temperature: 0.7
  });
  return response.choices[0].message.content;
}

module.exports = { chat };