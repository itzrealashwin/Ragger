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
  BookMarked,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import AddSourceModal from "./AddSourceModal";
// --- Main Application Component ---
export default function PlaygroundPage() {
  const [ragData, setRagData] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

  const chatWindowRef = useRef(null);

  // --- Utility & Lifecycle Functions ---
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chatHistory]);

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

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: userInput,
    };
    setChatHistory((prev) => [...prev, userMessage]);
    const currentQuery = userInput;
    setUserInput("");
    setIsLoading(true);
    setLoadingMessage("Searching sources...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuery: currentQuery }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to get response.");
      }
      const parsed = JSON.parse(result.response); // now it's an object
      console.log(parsed);
      
      const botResponse = {
        id: crypto.randomUUID(),
        sender: "bot",
        text: parsed.answer, // ✅ now works
        sources: parsed.sources || parsed.citations
      };

  
      setChatHistory((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Chat Error:", error);
      // You can add a toast notification for the error here
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI Sub-Components ---
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

  return (
    <>
      <AddSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        setIsLoading={setIsLoading}
        setLoadingMessage={setLoadingMessage}
        setIsSourceModalOpen={setIsSourceModalOpen}
      />
      <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 text-black dark:text-white">
        {/* Left Panel: Sources */}
        <aside className="w-1/3 max-w-sm bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col p-4">
          <Button
            onClick={() => setIsSourceModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-5 h-5" /> Add New Source
          </Button>
          <div className="flex-grow overflow-y-auto pr-2">
            <h2 className="text-lg font-semibold mb-2">Sources</h2>
            {groupedSources.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No sources added yet.</p>
                <p className="text-sm">Click "+ Add New Source" to begin.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {groupedSources.map((source) => (
                  <li
                    key={source.source}
                    className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg flex items-center gap-3 border border-gray-200 dark:border-gray-800"
                  >
                    <SourceIcon type={source.sourceType} />
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold truncate">{source.source}</p>
                      <p className="text-xs text-gray-500">
                        {source.chunkCount} chunks
                      </p>
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

        {/* Right Panel: Notebook/Chat */}
        <main className="flex-1 flex bg-white dark:bg-gray-900 flex-col h-full">
          <div
            ref={chatWindowRef}
            className="flex-grow overflow-y-auto p-6 md:p-8 space-y-6"
          >
            {chatHistory.length === 0 && (
              <div className="text-center text-gray-500 mt-20">
                <h2 className="text-3xl font-bold">Playground</h2>
                <p className="mt-2">
                  Add sources and ask questions to get started.
                </p>
              </div>
            )}
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-2xl p-4 rounded-xl shadow-sm ${
                    msg.sender === "user"
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                      <h4 className="text-sm font-semibold mb-2">
                        Retrieved Sources:
                      </h4>
                      <div className="space-y-2">
                        {msg.sources.map((source) => (
                          <div
                            key={source.id}
                            className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded-md"
                            title={source.source}
                          >
                            <p className="font-bold flex items-center gap-1.5">
                              <SourceIcon
                                type={source.sourceType}
                                className="w-4 h-4"
                              />{" "}
                              {source.source}
                            </p>
                           
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 md:p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            {isLoading && (
              <div className="flex items-center justify-center mb-2 gap-2 text-gray-500 text-sm">
                <Loader className="w-4 h-4 animate-spin" />
                <span>{loadingMessage}</span>
              </div>
            )}
            <div className="relative max-w-3xl mx-auto">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full p-4 pr-14 rounded-xl resize-none bg-white dark:bg-gray-900"
                placeholder="Ask a question about your sources..."
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

        {isSourceModalOpen && <AddSourceModal />}

        {toastMessage && (
          <div className="fixed bottom-5 right-5 bg-gray-900 text-white py-2 px-4 rounded-lg shadow-lg flex items-center gap-2">
            {toastMessage.message}
            <button onClick={() => setToastMessage(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
