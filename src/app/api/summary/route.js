import "dotenv/config";
import { NextResponse } from "next/server";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { TaskType } from "@google/generative-ai";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
/**
 * Handles POST requests to /api/summary
 * Expects a JSON body with a "sourceText".
 * If sourceText is provided, we first search for a similar document in Qdrant,
 * then use the content of that document to generate a summary.
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

export async function POST(req) {
  const { sourceText } = await req.json();

  if (!sourceText || typeof sourceText !== "string") {
    return NextResponse.json(
      { error: "sourceText is required and must be a string." },
      { status: 400 }
    );
  }

  try {
    // 1. Embeddings setup
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "text-embedding-004",
      taskType: TaskType.RETRIEVAL_QUERY,
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: "ragCollection",
      }
    );

    const queryEmbedding = await embeddings.embedQuery(sourceText);

    const result = await vectorStore.client.search("ragCollection", {
      vector: queryEmbedding,
      limit: 1,
      with_payload: true,
    });

    if (!result || result.length === 0 || !result[0].payload?.content) {
      return NextResponse.json(
        { error: "Source document not found in Qdrant." },
        { status: 404 }
      );
    }

    const retrievedContent = result[0].payload.content;

    // 2. Build summary prompt
    const SYSTEM_PROMPT = `
You are a summarization assistant.
Your task is to generate a **clear, concise, and factual summary** of the provided source text.
Do not add opinions, outside knowledge, or speculation.
The summary must capture the key points of the text in a way that is easy to read.

TEXT TO SUMMARIZE:
${retrievedContent}
`;

    // 3. Use Gemini via official SDK
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }],
        },
      ],
    });

    const summary =
      response.response.candidates[0]?.content?.parts[0]?.text ?? "";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary." },
      { status: 500 }
    );
  }
}
