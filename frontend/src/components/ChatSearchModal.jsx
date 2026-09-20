import { useState } from "react";
import { Sparkles, Search, X, Loader2, MessageSquare, User } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { formatMessageTime } from "../lib/utils";

const ChatSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.post("/ai/ask", { query: query.trim() });
      setResult(res.data);
    } catch (err) {
      console.error("Error searching chats:", err);
      setError(err.response?.data?.message || "Failed to search chat history.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestionText) => {
    setQuery(suggestionText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-base-100 border border-base-300 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">Ask AI About Your Chats</h2>
              <p className="text-xs text-base-content/60">Search across all your past conversations with RAG</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle text-base-content/70 hover:text-base-content"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Input Form */}
        <div className="p-4 border-b border-base-300">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/50" />
              <input
                type="text"
                placeholder="e.g. What did Rahul say about the project deadline?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input input-bordered w-full pl-9 pr-4 text-sm focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn btn-primary btn-sm px-4 gap-2 flex items-center"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              <span>Search</span>
            </button>
          </form>

          {/* Quick Suggestions */}
          {!result && !loading && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-base-content/70">
              <span className="font-medium text-base-content/50">Try asking:</span>
              <button
                onClick={() => handleSuggestionClick("What deadlines were mentioned recently?")}
                className="badge badge-outline hover:badge-primary transition-all cursor-pointer py-2"
              >
                What deadlines were mentioned recently?
              </button>
              <button
                onClick={() => handleSuggestionClick("Summarize past project updates")}
                className="badge badge-outline hover:badge-primary transition-all cursor-pointer py-2"
              >
                Summarize past project updates
              </button>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-base-content/60 gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Searching embeddings and analyzing chat history...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Answer Box */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2 text-primary font-semibold text-sm">
                  <Sparkles className="size-4" />
                  <span>AI Answer</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
              </div>

              {/* Cited Sources */}
              {result.sources && result.sources.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="size-3.5" />
                    <span>Cited Source Messages ({result.sources.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {result.sources.map((src) => (
                      <div
                        key={src._id}
                        className="p-3 bg-base-200/60 border border-base-300 rounded-lg hover:border-base-content/20 transition-all text-xs flex items-start gap-3"
                      >
                        <img
                          src={src.senderPic || "/avatar.png"}
                          alt={src.senderName}
                          className="size-7 rounded-full object-cover mt-0.5 border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-base-content truncate">
                              {src.senderName} → {src.receiverName}
                            </span>
                            <span className="text-[10px] text-base-content/50 shrink-0">
                              {src.createdAt ? formatMessageTime(src.createdAt) : ""}
                            </span>
                          </div>
                          <p className="text-base-content/80 text-xs italic bg-base-100/50 p-2 rounded border border-base-300/50">
                            "{src.text}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSearchModal;
