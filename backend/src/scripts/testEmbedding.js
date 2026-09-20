import { config } from "dotenv";
import { GoogleGenAI } from "@google/genai";

config();

async function testResponseKeys() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: "Testing vector embedding response structure",
    config: {
      outputDimensionality: 768,
    },
  });

  console.log("Response object keys:", Object.keys(res));
  console.log("res.embedding:", res.embedding);
  console.log("res.embeddings:", res.embeddings);
  process.exit(0);
}

testResponseKeys();
