"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  Paperclip,
  Send,
  FileText,
  Globe,
  Trash2,
  Loader,
  Server,
  X,
  Plus,
  ArrowRight,
  Bot,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AddSourceModal from "./AddSourceModal";

export default function PlaygroundPage() {
  const [ragData, setRagData] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [sources, setSources] = useState([]);

  const [summary, setSummary] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const chatWindowRef = useRef(null);

  // Scroll chat automatically
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Grouped sources
  const groupedSources = useMemo(() => {
    const sourceMap = new Map();
    ragData.forEach((chunk) => {
      if (sourceMap.has(chunk.source)) {
        sourceMap.get(chunk.source).chunkCount++;
      } else {
        sourceMap.set(chunk.source, {
          sourceType: chunk.sourceType,
          chunkCount: 1,
        });
      }
    });
    return Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      ...data,
    }));
  }, [ragData]);

  // Fetch AI summary whenever ragData changes
  useEffect(() => {
    if (ragData.length === 0) {
      setSummary("");
      return;
    }
    console.log("RAG DATA", ragData);
    
    const fetchSummary = async () => {
      setIsSummaryLoading(true);
      setSummary("");
      try {
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceText: ragData[0].name }),
        });
        const result = await response.json();
        setSummary(result.summary || "No summary available.");
        console.log(result);
        
      } catch (error) {
        console.error("Summary Error:", error);
        setSummary("⚠️ Failed to fetch summary.");
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [ragData]);

  // Handle chat
  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: userInput,
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, userMessage]);

    const currentQuery = userInput;
    setUserInput("");
    setIsLoading(true);
    setLoadingMessage("Thinking...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuery: currentQuery }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to get response.");

      const parsed = JSON.parse(result.response);
      const botResponse = {
        id: crypto.randomUUID(),
        sender: "bot",
        text: parsed.answer,
        sources: parsed.sources || parsed.citations,
        timestamp: new Date(),
      };

      setChatHistory((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Chat Error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "bot",
          text: "⚠️ Something went wrong while fetching the answer.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Icon Renderer
  const SourceIcon = ({ type, className }) => {
    const baseClass = "w-5 h-5";
    switch (type) {
      case "File":
        return (
          <FileText
            className={`${baseClass} ${className || "text-green-600"}`}
          />
        );
      case "URL":
        return (
          <Globe className={`${baseClass} ${className || "text-purple-600"}`} />
        );
      case "Text":
        return (
          <Server className={`${baseClass} ${className || "text-blue-600"}`} />
        );
      default:
        return null;
    }
  };

  const handleAddSource = (newSource) => {
    setSources((prev) => {
      // If exists, update (loading → false). Otherwise, add new.
      const existing = prev.find((s) => s.name === newSource.name);
      if (existing) {
        return prev.map((s) => (s.name === newSource.name ? newSource : s));
      }
      return [...prev, newSource];
    });
  };
  return (
    <>
      <AddSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        setIsLoading={setIsLoading}
        setLoadingMessage={setLoadingMessage}
        setIsSourceModalOpen={setIsSourceModalOpen}
        onAddSource={handleAddSource} // 👈 new callback
      />

      <div className="grid grid-cols-12 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 text-black dark:text-white">
        {/* Left Panel: Sources */}
        <aside className="col-span-3 border-r border-gray-200 dark:border-gray-800 flex flex-col p-4">
          <Button
            onClick={() => setIsSourceModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-5 h-5" /> Add New Source
          </Button>
          <div className="flex-grow overflow-y-auto pr-2">
            <h2 className="text-lg font-semibold mb-2">Sources</h2>
            {sources.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No sources added yet.</p>
                <p className="text-sm">Click "+ Add New Source" to begin.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {sources.map((source, idx) => (
                  <li
                              onClick={() => setRagData([source])}

                    key={idx}
                    className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg flex items-center gap-3 border border-gray-200 dark:border-gray-800"
                  >
                    <SourceIcon type={source.type} />
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold truncate">{source.name}</p>
                      {source.loading ? (
                        <div className="animate-pulse mt-1 h-3 bg-gray-300 dark:bg-gray-700 rounded w-20" />
                      ) : (
                        <p className="text-xs text-gray-500">Indexed ✓</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            onClick={() => setRagData([])}
            variant="destructive"
            className="mt-4 flex items-center justify-center gap-2 text-sm"
          >
            <Trash2 className="w-4 h-4" /> Clear All Sources
          </Button>
        </aside>

        {/* Middle Panel: AI Summary */}
        <section className="col-span-4 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col">
          <h2 className="text-xl font-bold mb-4">AI Summary</h2>
          {isSummaryLoading ? (
            <div className="flex justify-center items-center flex-1 text-gray-500">
              <Loader className="w-6 h-6 animate-spin mr-2" /> Generating
              summary...
            </div>
          ) : summary ? (
            <div className="overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm text-sm leading-relaxed">
              {summary}
            </div>
          ) : (
            <p className="text-gray-500">
              Add sources to generate an AI summary.
            </p>
          )}
        </section>

        {/* Right Panel: Chat */}
        <main className="col-span-5 flex flex-col">
          <div
            ref={chatWindowRef}
            className="flex-grow overflow-y-auto p-6 space-y-6"
          >
            {chatHistory.length === 0 && (
              <div className="text-center text-gray-500 mt-20">
                <h2 className="text-2xl font-bold">Chat with AI</h2>
                <p className="mt-2">
                  Ask questions about your sources after reviewing the summary.
                </p>
              </div>
            )}

            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                    <Bot className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                )}
                <div
                  className={`max-w-md p-4 rounded-xl shadow-sm ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                  <p className="text-xs mt-2 opacity-70">
                    {msg.timestamp?.toLocaleTimeString()}
                  </p>
                </div>
                {msg.sender === "user" && (
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-800">
                    <User className="w-5 h-5 text-indigo-700 dark:text-indigo-200" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start gap-2 items-center text-gray-500 text-sm">
                <Loader className="w-4 h-4 animate-spin" />
                <span>{loadingMessage}</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="relative max-w-3xl mx-auto flex items-center">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full p-4 pr-14 rounded-xl resize-none bg-gray-50 dark:bg-gray-800 text-sm"
                placeholder="Ask a question..."
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 p-0 bg-indigo-600 hover:bg-indigo-700"
                disabled={!userInput.trim() || isLoading}
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </main>
      </div>

      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-gray-900 text-white py-2 px-4 rounded-lg shadow-lg flex items-center gap-2">
          {toastMessage.message}
          <button onClick={() => setToastMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
