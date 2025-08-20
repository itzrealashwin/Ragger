**🚀 RAG Project with Next.js, Clerk, and Qdrant**

A Retrieval-Augmented Generation (RAG) application built with Next.js.
It combines Clerk (authentication), Qdrant (vector database), and Google’s Generative AI (embeddings + LLM responses) to provide a question-answering system that can reason over your own data.

✨ Features

Source Indexing: Upload files (PDF, CSV), paste raw text, or provide a URL to index content into Qdrant.

Chat Interface: Ask natural language questions about your indexed data.

Authentication: Secure sign-in and user management powered by Clerk.

Scalable Vector Search: Efficient and scalable similarity search with Qdrant.

🔧 Use Cases

📝 Personal Knowledge Base – Store and query your notes, articles, and documents.

🤖 Customer Support Bot – Train on product documentation for instant support.

🔍 Research Assistant – Search and synthesize from a corpus of papers.

📚 Educational Tool – Let students query their course materials interactively.

📡 API Structure
1. /api/index

Method: POST

Handles indexing of new data sources into Qdrant.
```
Request Body:

{
  "sourceType": "text | file | url",
  "text": "optional - raw text",
  "file": "optional - pdf/csv file",
  "url": "optional - webpage url"
}


Response:

// Success
{ "success": true, "message": "Indexing of [sourceName] done." }

// Error
{ "error": "Bad Request / Internal Server Error" }
```
2. /api/chat

Method: POST

Retrieves relevant context from Qdrant and generates an AI-powered answer.
```
Request Body:

{
  "userQuery": "What is retrieval-augmented generation?"
}


Response:

{
  "response": "The generated answer.",
  "sources": [
    { "source": "pasted-text", "page_content": "..." }
  ]
}
```
⚙️ Getting Started
📌 Prerequisites

Node.js 18+

npm / yarn

Clerk Account

Qdrant Cloud Account

Google AI Studio API Key

📥 Installation
```
git clone <your-repository-url>
cd <your-repository-name>
npm install
```
🔑 Environment Variables

Create .env.local in the root directory:
```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Google Generative AI
GOOGLE_API_KEY=AIzaSy...

# Qdrant Vector Database
QDRANT_URL=https://...
QDRANT_API_KEY=...

# Optional
OAUTH_URL=...
```

Get your keys from:

Clerk → Dashboard → API Keys

Google AI → AI Studio → Get API Key

Qdrant → Cloud Dashboard

▶️ Running the App
```
npm run dev
```

Then open: http://localhost:3000

🔐 Authentication

Clerk is used for secure authentication & user management.
Make sure to configure callback URLs and settings in the Clerk Dashboard according to your deployment environment.
