import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, X, Sparkles, User, ChevronDown } from "lucide-react";
import aiLoadingGif from "@/assets/ai-loading.gif";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type AIProvider = "claude" | "gemini";

const PROVIDER_CONFIG: Record<AIProvider, { label: string; description: string }> = {
  claude: { label: "Claude", description: "Anthropic Claude Sonnet" },
  gemini: { label: "Gemini", description: "Google Gemini 3 Flash" },
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-chat`;

export default function RedaimAIChat({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("claude");
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Bitte melde dich an, um den KI-Assistenten zu nutzen.");
      }
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: allMessages, provider }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Verbindungsfehler" }));
        throw new Error(err.error || `Fehler ${resp.status}`);
      }

      if (!resp.body) throw new Error("Kein Stream erhalten");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const updateAssistant = (content: string) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: "assistant", content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || line.trim() === "") continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              assistantContent += parsed.delta.text;
              updateAssistant(assistantContent);
            }
            if (parsed.choices?.[0]?.delta?.content) {
              assistantContent += parsed.choices[0].delta.content;
              updateAssistant(assistantContent);
            }
          } catch {
            // partial JSON, skip
          }
        }
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${e.message || "Unbekannter Fehler"}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, provider]);

  if (!open && !embedded) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="redaim-ai-fab"
        aria-label="AI Chat öffnen"
      >
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <div className={embedded ? "redaim-ai-embedded" : "redaim-ai-panel"}>
      {/* Header */}
      <div className="redaim-ai-header">
        <div className="redaim-ai-header-left">
          <Bot size={16} />
          <div className="redaim-ai-provider-switch">
            <button type="button" className="redaim-ai-provider-trigger" onClick={() => setProviderMenuOpen(!providerMenuOpen)} aria-expanded={providerMenuOpen} aria-haspopup="menu">
              <span>{PROVIDER_CONFIG[provider].label}</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>
            {providerMenuOpen && (
              <div className="redaim-ai-provider-menu">
                {(Object.keys(PROVIDER_CONFIG) as AIProvider[]).map((key) => (
                  <button
                    key={key}
                    className={`redaim-ai-provider-option ${key === provider ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setProvider(key);
                      setProviderMenuOpen(false);
                    }}
                  >
                    <span className="redaim-ai-provider-name">{PROVIDER_CONFIG[key].label}</span>
                    <span className="redaim-ai-provider-desc">{PROVIDER_CONFIG[key].description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {!embedded && (
          <button type="button" onClick={() => setOpen(false)} className="redaim-ai-close" aria-label="KI-Chat schließen">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="redaim-ai-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="redaim-ai-empty">
            <Sparkles size={28} />
            <p>Frag {PROVIDER_CONFIG[provider].label} — dein KI-Assistent</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`redaim-ai-msg ${msg.role}`}>
            <div className="redaim-ai-msg-icon">
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className="redaim-ai-msg-content">
              {msg.content || (isLoading && i === messages.length - 1 ? "..." : "")}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="redaim-ai-msg assistant">
            <div className="redaim-ai-msg-icon"><Bot size={14} /></div>
            <div className="redaim-ai-msg-content">
              <img src={aiLoadingGif} alt="Generating..." className="redaim-ai-loading-gif" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="redaim-ai-input-area">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={`Nachricht an ${PROVIDER_CONFIG[provider].label}...`}
          rows={1}
          className="redaim-ai-input"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="redaim-ai-send"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
