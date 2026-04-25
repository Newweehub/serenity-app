import OpenAI from 'openai';
import { config } from '../config/index.js';

// Singleton client pointed at Azure AI Foundry
export const openaiClient = new OpenAI({
  apiKey:   config.openai.apiKey,
  baseURL:  `${config.openai.endpoint}/openai/deployments/${config.openai.deployment}`,
  defaultQuery: { 'api-version': config.openai.apiVersion },
  defaultHeaders: { 'api-key': config.openai.apiKey },
});

export const MODEL = config.openai.deployment;
