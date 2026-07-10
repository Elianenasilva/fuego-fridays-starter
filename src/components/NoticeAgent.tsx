import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Eye,
  Loader2,
  MessageSquare,
  PackageSearch,
  Send,
  ShieldAlert,
  Sparkles,
  TestTube2,
  Activity,
  Layers,
  Zap,
  GitBranch,
  FileCode2,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";

import {
  mockNotices,
  mockModules,
  mockScanSummary,
  initialNoticeMessages,
  noticeReplies,
  type NoticeItem,
  type NoticeChatMessage,
  type NoticeStatus,
  type NoticeCategory,
} from "@/data/mock-notice";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  critical: {
    icon: XCircle,
    label: "Crítico",
    border: "border-destructive/40",
    bg: "bg-destructive/5",
    iconColor: "text-destructive",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
  warning: {
    icon: AlertTriangle,
    label: "Atenção",
    border: "border-fuego-500/40",
    bg: "bg-fuego-50",
    iconColor: "text-fuego-600",
    badgeClass: "bg-fuego-100 text-fuego-700 border-fuego-200",
    dot: "bg-fuego-500",
  },
  info: {
    icon: Eye,
    label: "Observação",
    border: "border-amber-300/50",
    bg: "bg-amber-50/50",
    iconColor: "text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
} as const;

const CATEGORY_CONFIG: Record<
  NoticeCategory,
  { icon: React.FC<{ className?: string }>; label: string }
> = {
  security: { icon: ShieldAlert, label: "Segurança" },
  testing: { icon: TestTube2, label: "Testes" },
  complexity: { icon: GitBranch, label: "Complexidade" },
  performance: { icon: Zap, label: "Performance" },
  consistency: { icon: Layers, label: "Consistência" },
  dependency: { icon: PackageSearch, label: "Dependências" },
  observability: { icon: Activity, label: "Observabilidade" },
};

function healthColor(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-destructive";
}

function healthBarColor(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-destructive";
}

function coverageColor(pct: number) {
  if (pct >= 60) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-400";
  return "bg-destructive";
}

function formatMinutesAgo(n: number) {
  if (n < 60) return `${n}m atrás`;
  return `${Math.floor(n / 60)}h ${n % 60}m atrás`;
}

// ---------------------------------------------------------------------------
// ScanBanner — live scanning animation at top
// ---------------------------------------------------------------------------

function ScanBanner({ scanning }: { scanning: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
      <div className="relative flex items-center justify-center size-8 shrink-0">
        <motion.div
          className="absolute size-8 rounded-full border-2 border-fuego-500/30"
          animate={scanning ? { scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <Eye className="size-4 text-fuego-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {scanning ? "Escaneando codebase…" : "Scan concluído"}
          </span>
          {scanning && (
            <Loader2 className="size-3.5 text-fuego-500 animate-spin" />
          )}
          {!scanning && (
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {scanning
            ? "Analisando padrões de código, cobertura, dependências e segurança…"
            : `${mockScanSummary.filesScanned} arquivos · último scan ${formatMinutesAgo(mockScanSummary.lastScannedMinutesAgo)}`}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 text-xs">
        {!scanning && (
          <>
            <span className="flex items-center gap-1 text-destructive font-semibold">
              <span className="size-2 rounded-full bg-destructive inline-block" />
              {mockScanSummary.criticalCount} críticos
            </span>
            <span className="flex items-center gap-1 text-fuego-600 font-semibold">
              <span className="size-2 rounded-full bg-fuego-500 inline-block" />
              {mockScanSummary.warningCount} alertas
            </span>
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              <span className="size-2 rounded-full bg-amber-400 inline-block" />
              {mockScanSummary.infoCount} observações
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModuleGrid — codebase health heatmap
// ---------------------------------------------------------------------------

function ModuleGrid() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Saúde por módulo
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {mockModules.map((mod) => (
          <div
            key={mod.id}
            className="rounded-lg border border-border bg-background px-3 py-2.5 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode2 className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-foreground truncate">
                  {mod.name}
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  {mod.path}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {mod.issues > 0 && (
                  <span className="text-[10px] font-semibold text-destructive">
                    {mod.issues} issue{mod.issues > 1 ? "s" : ""}
                  </span>
                )}
                <span className={cn("text-xs font-bold tabular-nums", healthColor(mod.health))}>
                  {mod.health}
                </span>
              </div>
            </div>

            {/* Health bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Saúde geral</span>
                <span className="text-muted-foreground">{mod.lastChanged}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", healthBarColor(mod.health))}
                  initial={{ width: 0 }}
                  animate={{ width: `${mod.health}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                />
              </div>
            </div>

            {/* Coverage bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Cobertura de testes</span>
                <span className={cn("font-semibold", mod.testCoverage < 40 ? "text-destructive" : "text-muted-foreground")}>
                  {mod.testCoverage}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", coverageColor(mod.testCoverage))}
                  initial={{ width: 0 }}
                  animate={{ width: `${mod.testCoverage}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NoticeCard — one detected pattern
// ---------------------------------------------------------------------------

function NoticeCard({
  notice,
  onAcknowledge,
  onResolve,
  onDismiss,
}: {
  notice: NoticeItem;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(notice.severity === "critical");
  const sev = SEVERITY_CONFIG[notice.severity];
  const SevIcon = sev.icon;
  const cat = CATEGORY_CONFIG[notice.category];
  const CatIcon = cat.icon;
  const isClosed = notice.status === "resolved" || notice.status === "dismissed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border overflow-hidden transition-opacity duration-300",
        sev.border,
        sev.bg,
        isClosed && "opacity-40",
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <SevIcon className={cn("mt-0.5 size-4 shrink-0", sev.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground leading-snug">
              {notice.title}
            </span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", sev.badgeClass)}>
              {sev.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CatIcon className="size-3" />
              {cat.label}
            </span>
            {notice.occurrences > 1 && (
              <span className="text-[10px] text-muted-foreground">
                {notice.occurrences}× ocorrências
              </span>
            )}
            {notice.status === "acknowledged" && (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                <CheckCircle2 className="size-3" /> Visto
              </span>
            )}
            {notice.status === "resolved" && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                <CheckCircle2 className="size-3" /> Resolvido
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            detectado {formatMinutesAgo(notice.detectedMinutesAgo)} · {notice.effortLabel} para corrigir
          </p>
        </div>
        <span className="text-muted-foreground shrink-0 mt-0.5">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Body */}
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {notice.body}
              </p>

              {/* Signals */}
              {notice.signals.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="size-3" /> Sinais encontrados
                  </p>
                  {notice.signals.map((sig) => (
                    <div
                      key={sig.id}
                      className="rounded-lg bg-background border border-border/60 px-3 py-2 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode2 className="size-3 text-muted-foreground shrink-0" />
                        <span className="text-[11px] font-mono text-foreground">
                          {sig.file}
                          {sig.line && (
                            <span className="text-muted-foreground">:{sig.line}</span>
                          )}
                        </span>
                      </div>
                      {sig.snippet && (
                        <pre className="text-[11px] font-mono bg-muted/60 rounded px-2 py-1 text-foreground overflow-x-auto">
                          {sig.snippet}
                        </pre>
                      )}
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {sig.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendation */}
              <div className="flex items-start gap-2 rounded-lg border border-fuego-500/20 bg-fuego-50 px-3 py-2.5">
                <Sparkles className="size-3.5 shrink-0 text-fuego-600 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-fuego-700 mb-0.5">
                    Recomendação do agente
                  </p>
                  <p className="text-xs text-fuego-900 leading-relaxed">
                    {notice.recommendation}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {!isClosed && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {notice.status === "new" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => onAcknowledge(notice.id)}
                    >
                      <Eye className="size-3" />
                      Reconhecer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => onResolve(notice.id)}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Marcar resolvido
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => onDismiss(notice.id)}
                  >
                    Ignorar
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ChatPanel
// ---------------------------------------------------------------------------

function ChatPanel({
  messages,
  onSend,
  isThinking,
}: {
  messages: NoticeChatMessage[];
  onSend: (text: string) => void;
  isThinking: boolean;
}) {
  const [input, setInput] = useState("");

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3 shrink-0">
        <div className="relative">
          <Avatar size="sm">
            <AvatarFallback className="bg-fuego-500 text-white text-[10px] font-bold">
              SR
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-1 ring-background" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Dev Sênior Mindful</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {isThinking ? "Analisando…" : "Observando"}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px]">
          <Eye className="size-2.5 mr-1" />
          Notice
        </Badge>
      </div>

      <MessageScrollerProvider>
        <MessageScroller className="flex-1 min-h-0">
          <MessageScrollerViewport className="px-3 py-4">
            <MessageScrollerContent className="gap-4">
              {messages.map((msg) => (
                <MessageScrollerItem key={msg.id}>
                  <Message align={msg.role === "user" ? "end" : "start"}>
                    {msg.role === "agent" && (
                      <MessageAvatar>
                        <Avatar size="sm">
                          <AvatarFallback className="bg-fuego-500 text-white text-[10px] font-bold">
                            SR
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                    )}
                    <MessageContent>
                      <MessageHeader>
                        {msg.role === "agent" ? "Dev Sênior Mindful" : "Você"}
                      </MessageHeader>
                      <Bubble
                        variant={msg.role === "user" ? "default" : "secondary"}
                        align={msg.role === "user" ? "end" : "start"}
                      >
                        <BubbleContent>
                          <span
                            className="whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: msg.content
                                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                                .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                            }}
                          />
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
              {isThinking && (
                <MessageScrollerItem>
                  <Message align="start">
                    <MessageAvatar>
                      <Avatar size="sm">
                        <AvatarFallback className="bg-fuego-500 text-white text-[10px] font-bold">
                          SR
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent>
                      <Bubble variant="secondary">
                        <BubbleContent>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            Analisando…
                          </span>
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )}
              <MessageScrollerItem scrollAnchor />
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="border-t border-border p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunte sobre o codebase…"
            className="min-h-[40px] max-h-[100px] resize-none text-sm py-2"
          />
          <Button
            size="icon"
            className="shrink-0 h-10 w-10"
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
          >
            <Send className="size-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main NoticeAgent
// ---------------------------------------------------------------------------

export default function NoticeAgent() {
  const [notices, setNotices] = useState<NoticeItem[]>(mockNotices);
  const [chatMessages, setChatMessages] =
    useState<NoticeChatMessage[]>(initialNoticeMessages);
  const [isThinking, setIsThinking] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"notices" | "modules">("notices");
  const [scanning, setScanning] = useState(true);
  const msgIdRef = useRef(500);

  // Simulate scan completing after mount
  useEffect(() => {
    const t = setTimeout(() => setScanning(false), 2800);
    return () => clearTimeout(t);
  }, []);

  function pushAgentMessage(content: string) {
    msgIdRef.current += 1;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `notice-msg-${msgIdRef.current}`,
        role: "agent",
        content,
        timestamp: Date.now(),
      },
    ]);
  }

  function updateStatus(id: string, status: NoticeStatus) {
    setNotices((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status } : n)),
    );
  }

  function handleAcknowledge(id: string) {
    updateStatus(id, "acknowledged");
    const replyKey = `${id}-acknowledged`;
    const reply = noticeReplies[replyKey] ?? noticeReplies.default;
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      pushAgentMessage(reply);
    }, 900);
  }

  function handleResolve(id: string) {
    updateStatus(id, "resolved");
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      pushAgentMessage(
        "Marcado como resolvido. Vou continuar monitorando para garantir que o padrão não reapareça em novos commits.",
      );
    }, 700);
  }

  function handleDismiss(id: string) {
    updateStatus(id, "dismissed");
  }

  function handleUserMessage(text: string) {
    msgIdRef.current += 1;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `notice-msg-${msgIdRef.current}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      },
    ]);
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      const lower = text.toLowerCase();
      let reply: string;
      if (lower.includes("segurança") || lower.includes("security") || lower.includes("vulnerab")) {
        reply = noticeReplies.security;
      } else if (lower.includes("cobertura") || lower.includes("coverage") || lower.includes("test")) {
        reply = noticeReplies.coverage;
      } else if (lower.includes("saúde") || lower.includes("health") || lower.includes("status")) {
        reply = noticeReplies.health;
      } else if (lower.includes("como") || lower.includes("funciona") || lower.includes("what")) {
        reply = noticeReplies.howworks;
      } else {
        reply = noticeReplies.default;
      }
      pushAgentMessage(reply);
    }, 1200);
  }

  const openCount = notices.filter(
    (n) => n.status === "new" || n.status === "acknowledged",
  ).length;
  const criticalOpen = notices.filter(
    (n) => n.severity === "critical" && n.status === "new",
  ).length;

  const tabs = [
    { id: "notices", label: "Itens Notados", icon: Eye },
    { id: "modules", label: "Módulos", icon: Layers },
  ] as const;

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col bg-background text-foreground">
        {/* Top bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Eye className="size-5 text-fuego-500" />
            <span className="font-display text-base font-semibold tracking-tight">
              Dev Sênior Mindful
            </span>
          </div>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Badge variant="outline" className="text-[10px]">
            <Code2 className="size-3 mr-1" />
            Notice
          </Badge>

          <div className="ml-auto flex items-center gap-3">
            {criticalOpen > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs font-semibold text-destructive"
              >
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex size-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                </span>
                {criticalOpen} crítico{criticalOpen > 1 ? "s" : ""} aberto{criticalOpen > 1 ? "s" : ""}
              </motion.span>
            )}
            {openCount === 0 && !scanning && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="size-3.5" /> Tudo resolvido
              </span>
            )}
            <div className="text-xs text-muted-foreground">
              Saúde geral:{" "}
              <span className={cn("font-bold", healthColor(mockScanSummary.overallHealth))}>
                {mockScanSummary.overallHealth}/100
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setChatOpen((o) => !o)}
            >
              <MessageSquare className="size-3.5" />
              {chatOpen ? "Fechar chat" : "Abrir chat"}
            </Button>
          </div>
        </header>

        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-border px-5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === id
                  ? "border-fuego-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
              {id === "notices" && openCount > 0 && (
                <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-fuego-500 text-[9px] font-bold text-white">
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <ScanBanner scanning={scanning} />

            {activeTab === "notices" && (
              <AnimatePresence>
                {notices.map((notice) => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    onAcknowledge={handleAcknowledge}
                    onResolve={handleResolve}
                    onDismiss={handleDismiss}
                  />
                ))}
              </AnimatePresence>
            )}

            {activeTab === "modules" && <ModuleGrid />}
          </div>

          <AnimatePresence>
            {chatOpen && (
              <motion.aside
                key="chat"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="flex flex-col border-l border-border overflow-hidden shrink-0"
                style={{ width: 360 }}
              >
                <ChatPanel
                  messages={chatMessages}
                  onSend={handleUserMessage}
                  isThinking={isThinking}
                />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
