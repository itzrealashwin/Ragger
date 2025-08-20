import "dotenv/config";
import { NextResponse } from "next/server";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";
// const client = new OpenAI();

/**
 * Handles POST requests to /api/chat
 * Expects a JSON body with a "userQuery" property.
 * This endpoint retrieves relevant context from Qdrant and generates
 * a response using a Gemini model.
 */
export async function POST(req) {
  // 1. Extract the user's query from the request body
  const { userQuery } = await req.json();

  if (!userQuery) {
    return NextResponse.json(
      { error: "User query is required" },
      { status: 400 }
    );
  }

  try {
    // 2. Initialize Gemini embeddings for retrieving the user's query.
    // The model and task type are aligned with your indexing setup for accurate results.
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY, // Using the same API key as your indexing
      model: "text-embedding-004", // Matching the model from your indexing route
      taskType: TaskType.RETRIEVAL_QUERY, // Use RETRIEVAL_QUERY for user queries
    });

    // 3. Connect to the existing Qdrant vector store
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: "ragCollection", // Matching the collection name from your indexing route
      }
    );

    // 4. Create a retriever to search for the top 3 most relevant documents
    const retriever = vectorStore.asRetriever({ k: 10 });

    // 5. Retrieve the relevant chunks (documents) from Qdrant
    const relevantChunks = await retriever.invoke(userQuery);

    // 6. Construct a clear system prompt with the retrieved context
    const SYSTEM_PROMPT = `
      You are an AI assistant. Your task is to answer the user's query based ONLY on the
      following context provided. Do not use any external knowledge.
      If the context does not contain the answer, state clearly that you do not have enough information.
      
      Your response MUST be in a JSON format with the following structure:
      {
        "answer": "Your detailed answer based on the context.",
        "sources": []
      }

      Cite the sources of the information from the metadata if available in the "sources" array.
    
      Context:
      ${JSON.stringify(relevantChunks)}
    `;

    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    //  const messages = [
    //   { role: "system", content: SYSTEM_PROMPT },
    //   { role: "user", content: userQuery },
    // ];

    // const response = await client.chat.completions.create({
    //   model: "gpt-4o",
    //   messages,
    //   // temperature: 0.2,
    // });

    // 8. Generate a response using the chat model
    const response = await openai.chat.completions.create({
      model: "deepseek/deepseek-chat-v3-0324:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userQuery },
      ],
      // Note: response_format is not a standard parameter for Gemini via this endpoint.
      // The response will be in the standard OpenAI chat completion format.
      response_format: { type: "json_object" },
    });

    // 9. Return the AI's response and the sources that were used
    return NextResponse.json({
      response: response.choices[0].message.content,
      sources: relevantChunks,
    });
  } catch (error) {
    console.error("Error during chat processing:", error);
    return NextResponse.json(
      { error: "Failed to process chat query." },
      { status: 500 }
    );
  }
}
