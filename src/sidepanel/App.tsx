import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getStorageItem, setStorageItem } from "../core/storage/storageAdapter";
import {
  Bot,
  Send,
  Settings2,
  Sparkles,
  User,
  Plus,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronDown,
  Check,
  Loader2,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useProviderSettings } from "../shared/hooks/useProviderSettings";
import { fetchModelsForProvider, type ModelInfo } from "../core/ai/model-fetcher";
import type { ProviderConfig } from "../shared/types";
import type { BackgroundToSidepanelPortMessage } from "../core/ai/port-contracts";
import type { ConfirmationRequest, NormalizedToolResult } from "../core/ai/types";
import {
  loadConversationIndex,
  loadMessages,
  saveMessages,
  createConversation,
  setActiveConversation,
  touchConversation,
  deleteConversation,
  type StoredMessage,
  type ConversationMeta,
} from "../core/storage/conversationStorage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ToolEvent {
  type: "tool-call" | "tool-result";
  id: string; // unique render key
  toolName: string;
  result?: NormalizedToolResult;
}

interface PendingConfirmation {
  confirmationId: string;
  turnId: string;
  request: ConfirmationRequest;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const MarkdownContent = ({ content }: { content: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      // Paragraphs — no extra margin on first/last
      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
      // Headings
      h1: ({ children }) => <h1 className="text-[15px] font-bold mb-2 mt-1">{children}</h1>,
      h2: ({ children }) => <h2 className="text-[14px] font-semibold mb-1.5 mt-1">{children}</h2>,
      h3: ({ children }) => <h3 className="text-[13px] font-semibold mb-1 mt-1">{children}</h3>,
      // Inline code
      code: ({ children, className }) => {
        const isBlock = className?.includes("language-");
        if (isBlock) {
          return (
            <code className="block rounded-md bg-muted/80 border px-3 py-2 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
              {children}
            </code>
          );
        }
        return (
          <code className="rounded bg-muted/70 border px-1 py-0.5 font-mono text-[11px]">{children}</code>
        );
      },
      // Code block wrapper
      pre: ({ children }) => (
        <pre className="my-2 rounded-md bg-muted/80 border overflow-hidden">{children}</pre>
      ),
      // Lists
      ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>,
      ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>,
      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
      // Blockquote
      blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-muted-foreground/40 pl-3 italic text-muted-foreground">
          {children}
        </blockquote>
      ),
      // Links
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
          {children}
        </a>
      ),
      // Horizontal rule
      hr: () => <hr className="my-3 border-border" />,
      // Tables (from remark-gfm)
      table: ({ children }) => (
        <div className="my-2 overflow-x-auto rounded-md border">
          <table className="w-full text-[12px]">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
      th: ({ children }) => <th className="px-3 py-1.5 text-left font-medium border-b">{children}</th>,
      td: ({ children }) => <td className="px-3 py-1.5 border-b border-border/50">{children}</td>,
      // Strong / em
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
    }}
  >
    {content}
  </ReactMarkdown>
);

const MessageBubble = ({ msg }: { msg: Message }) => (
  <div className={`flex w-full items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
    <div
      className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
        msg.role === "user"
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {msg.role === "user" ? <User className="size-3" /> : <Bot className="size-3" />}
    </div>
    <div
      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
        msg.role === "user"
          ? "bg-primary text-primary-foreground whitespace-pre-wrap"
          : "border bg-card text-foreground"
      }`}
    >
      {msg.role === "user" ? msg.content : <MarkdownContent content={msg.content} />}
    </div>
  </div>
);

const TypingIndicator = () => (
  <div className="flex items-start gap-2.5">
    <div className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
      <Bot className="size-3" />
    </div>
    <div className="rounded-2xl border bg-card px-3.5 py-3 shadow-sm">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const ToolConfirmationCard = ({
  confirmation,
  onApprove,
  onDeny,
}: {
  confirmation: PendingConfirmation;
  onApprove: () => void;
  onDeny: () => void;
}) => {
  const args = confirmation.request.input;
  const hasArgs = Boolean(args && typeof args === "object" && Object.keys(args as object).length > 0);
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        <Wrench className="size-3" />
      </div>
      <div className="flex-1 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 shadow-sm dark:border-amber-800/40 dark:bg-amber-900/10">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-3.5" />
          Tool call requested
        </div>
        <div className="mt-1.5 font-mono text-[11px] rounded-md bg-amber-100/80 px-2 py-1 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          {confirmation.request.toolName}
        </div>
        {hasArgs && (
          <pre className="mt-1.5 max-h-24 overflow-auto rounded-md bg-muted/60 px-2 py-1.5 text-[10px] text-muted-foreground">
            {JSON.stringify(args as Record<string, unknown>, null, 2)}
          </pre>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            className="h-7 flex-1 gap-1.5 text-[12px] bg-green-600 hover:bg-green-700 text-white"
            onClick={onApprove}
            size="sm"
          >
            <CheckCircle2 className="size-3.5" />
            Allow
          </Button>
          <Button
            className="h-7 flex-1 gap-1.5 text-[12px]"
            onClick={onDeny}
            size="sm"
            variant="outline"
          >
            <XCircle className="size-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

const ToolResultBadge = ({ result }: { result: NormalizedToolResult }) => (
  <div className="flex items-center gap-2 pl-9 text-[11px] text-muted-foreground">
    {result.isError ? (
      <XCircle className="size-3 shrink-0 text-destructive" />
    ) : (
      <CheckCircle2 className="size-3 shrink-0 text-green-600" />
    )}
    <span className={result.isError ? "text-destructive" : ""}>
      {result.isError ? `Tool cancelled: ${result.name}` : `✓ ${result.name} completed`}
    </span>
  </div>
);

const ConversationItem = ({
  meta,
  isActive,
  onSelect,
  onDelete,
}: {
  meta: ConversationMeta;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) => (
  <div
    className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
      isActive ? "bg-accent" : "hover:bg-muted/60"
    }`}
    onClick={onSelect}
  >
    <div className="min-w-0 flex-1">
      <div className="truncate text-[12px] font-medium">{meta.title}</div>
      <div className="text-[10px] text-muted-foreground">
        {new Date(meta.updatedAt).toLocaleDateString()}
      </div>
    </div>
    <Button
      className="size-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground"
      onClick={(e) => { e.stopPropagation(); onDelete(); }}
      size="icon"
      variant="ghost"
    >
      <Trash2 className="size-3" />
    </Button>
  </div>
);

const ModelSwitcher = ({
  activeProvider,
  saveProvider,
}: {
  activeProvider: ProviderConfig;
  saveProvider: (c: ProviderConfig) => Promise<void>;
}) => {
  const [open, setOpen] = React.useState(false);
  const [models, setModels] = React.useState<ModelInfo[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && models.length === 0) {
      setLoading(true);
      fetchModelsForProvider(activeProvider.providerId, activeProvider.apiKey, activeProvider.baseUrl)
        .then((res) => {
          if (res.ok) setModels(res.models);
        })
        .finally(() => setLoading(false));
    }
  }, [open, activeProvider]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 rounded-sm text-[10px] text-muted-foreground capitalize outline-none hover:bg-muted/40 hover:text-foreground px-1 py-0.5 -ml-1 transition-colors">
          {activeProvider.providerId} · {activeProvider.model} <ChevronDown className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0">
        <Command>
          <CommandInput className="h-8 text-[11px]" placeholder="Search models..." />
          <CommandList className="max-h-[240px]">
            <CommandEmpty className="py-2 text-center text-[11px] text-muted-foreground">
              {loading ? (
                <span className="flex items-center justify-center gap-1"><Loader2 className="size-3 animate-spin"/> Loading...</span>
              ) : "No models found."}
            </CommandEmpty>
            <CommandGroup className="capitalize" heading={activeProvider.providerId}>
              {models.map((model) => (
                <CommandItem
                  key={model.id}
                  onSelect={() => {
                    if (activeProvider.model !== model.id) {
                      void saveProvider({ ...activeProvider, model: model.id });
                    }
                    setOpen(false);
                  }}
                  value={model.id}
                >
                  <Check
                    className={`mr-2 size-3.5 shrink-0 ${
                      activeProvider.model === model.id ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="text-[11px] truncate">{model.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export const App = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [toolEvents, setToolEvents] = React.useState<ToolEvent[]>([]);
  const [input, setInput] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [pendingConfirmation, setPendingConfirmation] = React.useState<PendingConfirmation | null>(null);
  const [autoApprove, setAutoApprove] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [conversations, setConversations] = React.useState<ConversationMeta[]>([]);
  const [activeConvId, setActiveConvId] = React.useState<string | null>(null);

  const endOfMessagesRef = React.useRef<HTMLDivElement>(null);
  const portRef = React.useRef<chrome.runtime.Port | null>(null);
  const streamingTextRef = React.useRef<string>("");

  const { store, saveProvider } = useProviderSettings();
  const activeProvider = store.providers.find((p) => p.enabled);
  const autoApproveRef = React.useRef(false);
  autoApproveRef.current = autoApprove;

  // Load persisted autoApprove on mount
  React.useEffect(() => {
    void getStorageItem<boolean>("ai.chat.autoApprove").then((v) => {
      if (v) setAutoApprove(true);
    });
  }, []);

  const toggleAutoApprove = () => {
    setAutoApprove((prev) => {
      const next = !prev;
      void setStorageItem("ai.chat.autoApprove", next);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Scroll to bottom
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolEvents, pendingConfirmation, isStreaming]);

  // ---------------------------------------------------------------------------
  // Port connection (once, permanent)
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    if (!chrome.runtime?.connect) return;
    const port = chrome.runtime.connect({ name: "chat-port" });
    portRef.current = port;

    port.onMessage.addListener((message: unknown) => {
      const payload = message as BackgroundToSidepanelPortMessage;

      if (payload.type === "chat/token") {
        streamingTextRef.current += payload.delta;
        const snapshot = streamingTextRef.current;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id === payload.turnId) {
            return [...prev.slice(0, -1), { ...last, content: snapshot }];
          }
          return [...prev, { id: payload.turnId, role: "assistant", content: snapshot }];
        });
      }

      if (payload.type === "chat/confirmation-required") {
        if (autoApproveRef.current) {
          // Auto-approve: send decision immediately without showing card
          port.postMessage({
            type: "chat/confirm-tool",
            confirmationId: payload.request.id,
            decision: "approved",
          });
          setToolEvents((prev) => [
            ...prev,
            { type: "tool-call", id: payload.request.id, toolName: payload.request.toolName },
          ]);
        } else {
          setIsStreaming(false);
          setPendingConfirmation({
            confirmationId: payload.request.id,
            turnId: payload.turnId,
            request: payload.request,
          });
          setToolEvents((prev) => [
            ...prev,
            { type: "tool-call", id: payload.request.id, toolName: payload.request.toolName },
          ]);
        }
      }

      if (payload.type === "chat/tool-result") {
        setPendingConfirmation(null);
        setIsStreaming(true); // resume streaming after tool
        setToolEvents((prev) =>
          prev.map((e) =>
            e.toolName === payload.result.name && e.type === "tool-call"
              ? { ...e, type: "tool-result" as const, result: payload.result }
              : e,
          ),
        );
      }

      if (payload.type === "chat/done") {
        setIsStreaming(false);
        setPendingConfirmation(null);
        setMessages((prev) => {
          void saveCurrentConversation(prev);
          return prev;
        });
        streamingTextRef.current = "";
      }

      if (payload.type === "chat/error") {
        setIsStreaming(false);
        setPendingConfirmation(null);
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: `❌ ${payload.error.message}` },
        ]);
        streamingTextRef.current = "";
      }
    });

    return () => port.disconnect();
  }, []);

  // ---------------------------------------------------------------------------
  // Bootstrap: restore last active conversation
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    const bootstrap = async () => {
      const index = await loadConversationIndex();
      setConversations(index.list);
      if (index.activeId) {
        setActiveConvId(index.activeId);
        const stored = await loadMessages(index.activeId);
        setMessages(stored);
      }
    };
    void bootstrap();
  }, []);

  // ---------------------------------------------------------------------------
  // Persistence helpers (use a ref-safe approach via callback)
  // ---------------------------------------------------------------------------

  const activeConvIdRef = React.useRef<string | null>(null);
  activeConvIdRef.current = activeConvId;

  const saveCurrentConversation = async (msgs: Message[]) => {
    const id = activeConvIdRef.current;
    if (!id) return;
    await saveMessages(id, msgs as StoredMessage[]);
    await touchConversation(id);
    const index = await loadConversationIndex();
    setConversations(index.list);
  };

  // ---------------------------------------------------------------------------
  // Confirmation handlers
  // ---------------------------------------------------------------------------

  const handleApprove = () => {
    if (!pendingConfirmation) return;
    portRef.current?.postMessage({
      type: "chat/confirm-tool",
      confirmationId: pendingConfirmation.confirmationId,
      decision: "approved",
    });
    setIsStreaming(true);
    setPendingConfirmation(null);
  };

  const handleDeny = () => {
    if (!pendingConfirmation) return;
    portRef.current?.postMessage({
      type: "chat/confirm-tool",
      confirmationId: pendingConfirmation.confirmationId,
      decision: "denied",
    });
    setIsStreaming(true);
    setPendingConfirmation(null);
  };

  // ---------------------------------------------------------------------------
  // New conversation
  // ---------------------------------------------------------------------------

  const handleNewConversation = async () => {
    setMessages([]);
    setToolEvents([]);
    setInput("");
    setActiveConvId(null);
    setPendingConfirmation(null);
    await setActiveConversation(null);
    setShowHistory(false);
  };

  // ---------------------------------------------------------------------------
  // Switch conversation
  // ---------------------------------------------------------------------------

  const handleSelectConversation = async (meta: ConversationMeta) => {
    const msgs = await loadMessages(meta.id);
    setActiveConvId(meta.id);
    setMessages(msgs);
    setToolEvents([]);
    setPendingConfirmation(null);
    await setActiveConversation(meta.id);
    setShowHistory(false);
  };

  // ---------------------------------------------------------------------------
  // Delete conversation
  // ---------------------------------------------------------------------------

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    const index = await loadConversationIndex();
    setConversations(index.list);
    if (id === activeConvId) {
      setMessages([]);
      setToolEvents([]);
      setActiveConvId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    if (!input.trim() || !activeProvider || isStreaming) return;
    const userText = input.trim();
    const turnId = Date.now().toString();

    // Lazy conversation creation on first message
    let convId = activeConvId;
    if (!convId) {
      const { meta, store: newStore } = await createConversation(
        activeProvider.providerId,
        activeProvider.model,
        userText,
      );
      convId = meta.id;
      setActiveConvId(convId);
      setConversations(newStore.list);
    }

    const userMsg: Message = { id: `${turnId}-user`, role: "user", content: userText };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setToolEvents([]);
    setInput("");
    setIsStreaming(true);
    streamingTextRef.current = "";

    // Save user message immediately  
    await saveMessages(convId, nextMessages as StoredMessage[]);

    portRef.current?.postMessage({
      type: "chat/start",
      turnId,
      message: userText,
      providerId: activeProvider.providerId,
      model: activeProvider.model,
      conversationId: convId,
      // Send history (excluding current message — orchestrator appends it)
      history: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
    });
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const openOptions = () => chrome.runtime?.sendMessage?.({ type: "popup:open-options" });
  const emptyState = messages.length === 0 && !isStreaming && !pendingConfirmation;

  return (
    <div className="flex h-screen w-full flex-col bg-background overflow-hidden">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b bg-card/60 px-3 py-2 backdrop-blur">
        {showHistory ? (
          <>
            <Button className="size-7 text-muted-foreground" onClick={() => setShowHistory(false)} size="icon" variant="ghost">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-[13px] font-semibold">Conversations</span>
            <div className="w-7" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-1 text-primary">
                <Sparkles className="size-3.5" />
              </div>
              <div>
                <h1 className="text-[13px] font-semibold leading-tight">AI Workspace</h1>
                {activeProvider ? (
                  <ModelSwitcher activeProvider={activeProvider} saveProvider={saveProvider} />
                ) : (
                  <div className="text-[10px] text-destructive">No provider configured</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button className="size-7 text-muted-foreground" onClick={() => setShowHistory(true)} size="icon" variant="ghost" title="History">
                <Clock className="size-3.5" />
              </Button>
              <Button className="size-7 text-muted-foreground" onClick={() => void handleNewConversation()} size="icon" variant="ghost" title="New conversation">
                <Plus className="size-3.5" />
              </Button>
              <Button
                className={`size-7 ${autoApprove ? "text-amber-500" : "text-muted-foreground"}`}
                onClick={toggleAutoApprove}
                size="icon"
                variant="ghost"
                title={autoApprove ? "Auto-approve ON" : "Auto-approve OFF"}
              >
                <Zap className={`size-3.5 ${autoApprove ? "fill-amber-400" : ""}`} />
              </Button>
              <Button className="size-7 text-muted-foreground" onClick={openOptions} size="icon" variant="ghost" title="Settings">
                <Settings2 className="size-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* History Panel */}
      {showHistory ? (
        <ScrollArea className="flex-1 px-2 py-2">
          {conversations.length === 0 ? (
            <div className="mt-8 text-center text-[12px] text-muted-foreground">No conversations yet.</div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {conversations.map((meta) => (
                <ConversationItem
                  key={meta.id}
                  isActive={meta.id === activeConvId}
                  meta={meta}
                  onDelete={() => void handleDeleteConversation(meta.id)}
                  onSelect={() => void handleSelectConversation(meta)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      ) : (
        <>
          {/* Chat Area */}
          <ScrollArea className="flex-1 px-4 py-4">
            {emptyState ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold">Start a conversation</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {activeProvider
                      ? `Powered by ${activeProvider.providerId}`
                      : "Configure a provider in Settings first."}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pb-2">
                {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}

                {/* Tool events inline */}
                {toolEvents.map((ev) =>
                  ev.type === "tool-result" && ev.result ? (
                    <ToolResultBadge key={ev.id} result={ev.result} />
                  ) : null,
                )}

                {/* Confirmation card — blocks streaming */}
                {pendingConfirmation && (
                  <ToolConfirmationCard
                    confirmation={pendingConfirmation}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                  />
                )}

                {/* Typing indicator */}
                {isStreaming && !pendingConfirmation && messages[messages.length - 1]?.role !== "assistant" && (
                  <TypingIndicator />
                )}

                <div ref={endOfMessagesRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="shrink-0 border-t bg-background px-3 pt-2 pb-3">
            <div
              className={`flex items-end gap-2 rounded-xl border bg-card px-2 py-1.5 shadow-sm transition-all focus-within:ring-1 ${
                activeProvider && !pendingConfirmation ? "focus-within:ring-primary/40" : "opacity-50"
              }`}
            >
              <Textarea
                className="min-h-[40px] max-h-28 flex-1 resize-none border-0 bg-transparent px-1.5 py-1 text-[13px] shadow-none focus-visible:ring-0"
                disabled={!activeProvider || isStreaming || !!pendingConfirmation}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={
                  !activeProvider
                    ? "Configure a provider in Settings…"
                    : pendingConfirmation
                    ? "Waiting for tool confirmation…"
                    : isStreaming
                    ? "Waiting for response…"
                    : "Message AI…"
                }
                value={input}
              />
              <Button
                className="mb-0.5 size-7 shrink-0 rounded-lg"
                disabled={!input.trim() || !activeProvider || isStreaming || !!pendingConfirmation}
                onClick={() => void handleSend()}
                size="icon"
              >
                <Send className="size-3.5" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
            <div className="mt-1.5 text-center text-[10px] text-muted-foreground">
              <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-sans font-medium">Enter</kbd> to send ·{" "}
              <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-sans font-medium">Shift+Enter</kbd> new line
            </div>
          </div>
        </>
      )}
    </div>
  );
};
