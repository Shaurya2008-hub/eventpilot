"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { usePlanStore } from "@/store/plan-store";
import { processChatSubmission } from "@/lib/planClient";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  AlertCircle,
  Loader2,
  Bot,
  User,
} from "lucide-react";

export function ChatDrawer() {
  const plan = usePlanStore((s) => s.plan);
  const chatMessages = usePlanStore((s) => s.chatMessages);
  const addChatMessage = usePlanStore((s) => s.addChatMessage);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isLoading, isOpen]);

  // Focus input when opening drawer
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!plan) return null;

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query || isLoading) return;

    setInputText("");
    await processChatSubmission(
      plan,
      query,
      {
        onUserMessage: (content) => addChatMessage({ role: "user", content }),
        onAssistantMessage: (content, isError) =>
          addChatMessage({ role: "assistant", content, isError }),
        setLoading: setIsLoading,
      },
      { timeoutMs: 10000 }
    );
  };

  return (
    <div className="no-print">
      {/* Floating Chat Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="chat-drawer-panel"
        aria-label={isOpen ? "Close AI planning assistant chat" : "Open AI planning assistant chat"}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-background shadow-xl transition-all duration-200 hover:scale-105 hover:bg-accent-hover focus-visible:ring-4 focus-visible:ring-ring sm:h-auto sm:w-auto sm:rounded-2xl sm:px-4 sm:py-3.5"
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
            <span className="hidden text-sm font-bold sm:inline">
              Ask AI Assistant
            </span>
          </div>
        )}
      </button>

      {/* Chat Drawer Panel */}
      {isOpen && (
        <section
          id="chat-drawer-panel"
          aria-labelledby="chat-drawer-title"
          className="fixed bottom-24 right-4 z-50 flex h-[540px] max-h-[82vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4 sm:right-6 sm:w-96"
        >
          {/* Drawer Header */}
          <header className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3
                  id="chat-drawer-title"
                  className="text-sm font-bold text-foreground"
                >
                  EventPilot Assistant
                </h3>
                <p className="text-[11px] text-muted">
                  Ask about budget, timeline, or vendors
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close chat window"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          {/* Scrollable Message History */}
          <div
            role="log"
            aria-live="polite"
            aria-label="Chat message history"
            className="flex-1 overflow-y-auto p-4 space-y-3.5"
          >
            {chatMessages.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-3">
                  <Bot className="h-6 w-6" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  How can I help with your celebration?
                </h4>
                <p className="mt-1 text-xs text-muted max-w-[260px]">
                  Ask questions about your {plan.input.occasion} in {plan.input.city}, budget optimizations, or ceremony timelines.
                </p>
                <div className="mt-4 flex flex-col gap-1.5 w-full text-left">
                  <button
                    type="button"
                    onClick={() => setInputText("How can we reduce our catering expenses?")}
                    className="rounded-lg border border-border/80 bg-background/60 p-2 text-xs text-muted hover:border-accent hover:text-foreground transition-colors"
                  >
                    💡 &ldquo;How can we reduce catering expenses?&rdquo;
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputText("What are important things to verify with our venue?")}
                    className="rounded-lg border border-border/80 bg-background/60 p-2 text-xs text-muted hover:border-accent hover:text-foreground transition-colors"
                  >
                    🏰 &ldquo;What should we verify with the venue?&rdquo;
                  </button>
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        isUser
                          ? "bg-accent text-background font-bold"
                          : "bg-surface-hover text-accent border border-border"
                      }`}
                      aria-hidden="true"
                    >
                      {isUser ? (
                        <User className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? "rounded-tr-none bg-accent text-background font-medium"
                          : msg.isError
                          ? "rounded-tl-none border border-rose-500/30 bg-rose-500/10 text-rose-300"
                          : "rounded-tl-none border border-border/80 bg-background text-foreground"
                      }`}
                    >
                      {msg.isError && (
                        <div className="flex items-center gap-1 font-semibold text-rose-400 mb-1 text-[11px]">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>Notice</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-accent border border-border text-xs"
                  aria-hidden="true"
                >
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div
                  role="status"
                  aria-label="Assistant is thinking"
                  className="inline-flex items-center gap-2 rounded-2xl rounded-tl-none border border-border/80 bg-background px-3.5 py-2.5 text-xs text-muted"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="border-t border-border bg-background p-3 flex items-center gap-2"
          >
            <label htmlFor="chat-drawer-input" className="sr-only">
              Ask a question about your plan
            </label>
            <input
              ref={inputRef}
              id="chat-drawer-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about budget, timeline..."
              disabled={isLoading}
              maxLength={400}
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              aria-label="Send message"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-background transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
