import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Streamdown } from "streamdown";
import { MessageSquare, Send, Bot, User, Loader2 } from "lucide-react";

interface Message { role: "user" | "assistant"; content: string; }

export default function AIAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your TradeFlow AI assistant. I can help you analyze market conditions, explain trading instruments, calculate risk, and provide personalized trade suggestions. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const ask = trpc.assistant.chat.useMutation({
    onSuccess: (data: { response: string }) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: (err: { message: string }) => {
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I encountered an error: ${err.message}` }]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    ask.mutate({ message: input });
    setInput("");
  };

  const suggestions = [
    "What is EUR/USD and how do I trade it?",
    "Explain leverage and margin requirements",
    "How do I manage risk with stop loss?",
    "What are synthetic indices?",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px w-6 bg-foreground/30"></div>
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Intelligence</span>
        </div>
        <h1 className="font-serif text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6" /> AI Trading Assistant
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-foreground text-background" : "bg-secondary"}`}>
              {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div className={`max-w-[75%] rounded p-3 text-sm ${msg.role === "assistant" ? "bg-card border border-border" : "bg-foreground text-background"}`}>
              {msg.role === "assistant" ? <Streamdown>{msg.content}</Streamdown> : msg.content}
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-card border border-border rounded p-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setInput(s)}
              className="text-xs border border-border px-3 py-1.5 hover:border-foreground/50 hover:bg-secondary/50 transition-colors rounded">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-border flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about markets, instruments, risk management..."
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={ask.isPending || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
