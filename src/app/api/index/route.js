import "dotenv/config";
import { NextResponse } from "next/server";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const sourceType = formData.get("sourceType");

    if (!sourceType) {
      return NextResponse.json(
        { error: "sourceType is required" },
        { status: 400 }
      );
    }

    let docs;
    let sourceName = "unknown";

    // Determine which loader to use based on the source type
    switch (sourceType) {
      case "text":
        const text = formData.get("text");
        if (!text)
          return NextResponse.json(
            { error: 'Text content is required for sourceType "text"' },
            { status: 400 }
          );
        sourceName = "pasted-text";
        docs = [{ pageContent: text, metadata: { source: sourceName } }];
        break;

      case "file":
        const file = formData.get("file"); // This is a File object
        if (!file)
          return NextResponse.json(
            { error: 'A file is required for sourceType "file"' },
            { status: 400 }
          );
        sourceName = file.name;

        const fileBlob = new Blob([await file.arrayBuffer()], {
          type: file.type,
        });
        let loader;

        if (file.type === "application/pdf") {
          loader = new PDFLoader(fileBlob);
        } else if (file.type === "text/csv") {
          loader = new CSVLoader(fileBlob);
        } else {
          return NextResponse.json(
            { error: "Unsupported file type. Please use PDF or CSV." },
            { status: 400 }
          );
        }

        docs = await loader.load();
        // Add the source to each document's metadata
        docs.forEach((doc) => (doc.metadata.source = sourceName));
        break;

      case "url":
        const url = formData.get("url");
        if (!url)
          return NextResponse.json(
            { error: 'A URL is required for sourceType "url"' },
            { status: 400 }
          );
        sourceName = url;
        const webLoader = new CheerioWebBaseLoader(url);
        docs = await webLoader.load();
        // Add the source to each document's metadata
        docs.forEach((doc) => (doc.metadata.source = sourceName));
        break;

      default:
        return NextResponse.json(
          { error: "Invalid sourceType provided" },
          { status: 400 }
        );
    }

    // Initialize the text splitter for chunking
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await textSplitter.splitDocuments(docs);

    // Initialize the Google Generative AI embeddings model
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY, // Make sure to add this to your .env.local
      model: "text-embedding-004",
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    // Create and store the embeddings in Qdrant
    await QdrantVectorStore.fromDocuments(splitDocs, embeddings, {
      url: process.env.QDRANT_URL,
      collectionName: "ragCollection",
      apiKey: process.env.QDRANT_API_KEY, // Add this line
    });

    return NextResponse.json({
      success: true,
      message: `Indexing of ${sourceName} done.`,
    });
  } catch (error) {
    console.error("Error during indexing:", error);
    return NextResponse.json(
      { error: "Failed to index documents." },
      { status: 500 }
    );
  }
}
