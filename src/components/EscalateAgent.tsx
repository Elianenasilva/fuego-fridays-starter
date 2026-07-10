import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Loader2,
  Mail,
  MessageSquare,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
  X,
  Zap,
  Activity,
  Bell,
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
  mockIncident,
  mockTimeline,
  mockAffectedCustomers,
  mockEscalationTargets,
  mockEscalationMessages,
  initialEscalateMessages,
  escalateReplies,
  type EscalationMessage,
  type EscalateChatMessage,
  type EscalationStatus,
} from "@/data/mock-escalate";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEV_CONFIG = {
  sev1: { label: "SEV 1", bg: "bg-destructive", text: "text-white" },
  sev2: { label: "SEV 2", bg: "bg-fuego-500", text: "text-white" },
  sev3: { label: "SEV 3", bg: "bg-amber-400", text: "text-white" },
} as const;

const CHANNEL_ICON = {
  slack: MessageSquare,
  email: Mail,
  pagerduty: Radio,
  sms: Bell,
} as const;

const TIER_CONFIG = {
  enterprise: { label: "Enterprise", color: "text-fuego-600", bg: "bg-fuego-50 border-fuego-200" },
  growth: { label: "Growth", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  starter: { label: "Starter", color: "text-muted-foreground", bg: "bg-muted border-border" },
} as const;

const STATUS_CONFIG: Record<EscalationStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Aguardando aprovação", color: "text-amber-700", bg: "bg-amber-50" },
  approved: { label: "Aprovado", color: "text-emerald-700", bg: "bg-emerald-50" },
  sent: { label: "Enviado", color: "text-emerald-700", bg: "bg-emerald-50" },
  dismissed: { label: "Descartado", color: "text-muted-foreground", bg: "bg-muted" },
};

function formatMinutesAgo(n: number): string {
  if (n === 0) return "agora";
  if (n < 60) return `${n}m atrás`;
  return `${Math.floor(n / 60)}h ${n % 60}m atrás`;
}

function formatSlaCountdown(minutes: number): { label: string; urgent: boolean } {
  if (minutes < 0) return { label: `Breach há ${Math.abs(minutes)}m`, urgent: true };
  if (minutes === 0) return { label: "Breach agora", urgent: true };
  return { label: `${minutes}m para breach`, urgent: minutes <= 15 };
}

// ---------------------------------------------------------------------------
// IncidentHeader — SEV badge + summary bar
// ---------------------------------------------------------------------------

function IncidentHeader() {
  const sev = SEV_CONFIG[mockIncident.severity];
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="size-5 shrink-0 text-destructive mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider", sev.bg, sev.text)}>
              {sev.label}
            </span>
            <span className="text-xs font-mono text-muted-foreground">{mockIncident.id}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {formatMinutesAgo(mockIncident.openedMinutesAgo)}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-foreground leading-snug">
            {mockIncident.title}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            {mockIncident.summary}
          </p>
        </div>
      </div>
      <div className="flex gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <Activity className="size-3 text-destructive" />
          <span className="text-muted-foreground">Erro:</span>
          <strong className="text-destructive">{mockIncident.errorRate}</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-3 text-muted-foreground" />
          <span className="text-muted-foreground">Requests afetados:</span>
          <strong className="text-foreground">{mockIncident.affectedRequests.toLocaleString()}</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="size-3 text-fuego-500" />
          <span className="text-muted-foreground">Deploy:</span>
          <strong className="text-foreground">{mockIncident.deployVersion}</strong>
          <span className="text-muted-foreground">({formatMinutesAgo(mockIncident.deployedMinutesAgo)})</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlaStrip — affected customers with live-ish countdown
// ---------------------------------------------------------------------------

function SlaStrip() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Clientes afetados
      </p>
      {mockAffectedCustomers.map((c) => {
        const tier = TIER_CONFIG[c.tier];
        const sla = formatSlaCountdown(c.slaBreachMinutes);
        return (
          <div
            key={c.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs",
              tier.bg,
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{c.name}</span>
                <span className={cn("font-medium", tier.color)}>{tier.label}</span>
                <span className="text-muted-foreground">{c.mrr}/mo</span>
              </div>
              <div className="mt-0.5 text-muted-foreground">
                SLA: {c.contractedSla} · CSM: {c.csm}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 font-semibold tabular-nums",
                sla.urgent
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-100 text-amber-700",
              )}
            >
              {sla.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function Timeline() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Timeline do incidente
      </p>
      <div className="relative pl-5 space-y-0">
        {mockTimeline.map((ev, idx) => (
          <div key={ev.id} className="relative pb-4 last:pb-0">
            {/* connector line */}
            {idx < mockTimeline.length - 1 && (
              <div className="absolute left-[-12px] top-[18px] bottom-0 w-px bg-border" />
            )}
            {/* dot */}
            <div
              className={cn(
                "absolute left-[-16px] top-[6px] size-2 rounded-full ring-2 ring-background",
                ev.kind === "detected" && "bg-destructive",
                ev.kind === "escalation" && "bg-fuego-500",
                ev.kind === "resolved" && "bg-emerald-500",
                ev.kind === "investigating" && "bg-blue-500",
                ev.kind === "update" && "bg-amber-400",
              )}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{ev.label}</span>
                {ev.agentGenerated && (
                  <span className="flex items-center gap-1 text-[10px] text-fuego-600 font-medium">
                    <Sparkles className="size-2.5" /> agente
                  </span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {formatMinutesAgo(ev.minutesAgo)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{ev.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EscalationCard — one drafted message with consent gate
// ---------------------------------------------------------------------------

function EscalationCard({
  message,
  onApprove,
  onDismiss,
  onEdit,
}: {
  message: EscalationMessage;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onEdit: (id: string, body: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.editedBody ?? message.body);

  const target = mockEscalationTargets.find((t) => t.id === message.targetId);
  if (!target) return null;

  const ChannelIcon = CHANNEL_ICON[target.channel];
  const statusCfg = STATUS_CONFIG[message.status];
  const isFinal = message.status === "sent" || message.status === "dismissed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border overflow-hidden transition-opacity duration-300",
        message.status === "pending" && "border-fuego-500/40",
        message.status === "approved" || message.status === "sent"
          ? "border-emerald-300/60"
          : "",
        message.status === "dismissed" && "border-border opacity-50",
      )}
    >
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left bg-secondary/30 border-b border-border/50"
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-fuego-500 text-white text-[10px] font-bold">
            {target.avatarInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{target.name}</span>
            <span className="text-xs text-muted-foreground">{target.role}</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ChannelIcon className="size-3" />
              {target.channel}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            {target.reason}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", statusCfg.bg, statusCfg.color)}>
            {statusCfg.label}
          </span>
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-3">
              {message.subject && (
                <p className="text-xs text-muted-foreground">
                  <strong>Assunto:</strong> {message.subject}
                </p>
              )}

              {editing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-xs min-h-[160px] font-mono"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => {
                      onEdit(message.id, editValue);
                      setEditing(false);
                    }}>
                      Salvar edição
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                      setEditValue(message.editedBody ?? message.body);
                      setEditing(false);
                    }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans bg-muted/50 rounded-lg p-3">
                  {message.editedBody ?? message.body}
                </pre>
              )}

              {!isFinal && !editing && (
                <div className="flex gap-2 flex-wrap items-center pt-1">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => onApprove(message.id)}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Aprovar e enviar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setEditing(true)}
                  >
                    <Edit3 className="size-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => onDismiss(message.id)}
                  >
                    <X className="size-3.5" />
                    Descartar
                  </Button>
                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                    <Sparkles className="size-2.5 text-fuego-500" />
                    Rascunhado pelo agente
                  </span>
                </div>
              )}

              {message.status === "sent" && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="size-3.5" /> Mensagem enviada
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
  messages: EscalateChatMessage[];
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
            <AvatarFallback className="bg-destructive text-white text-[10px] font-bold">
              IA
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-1 ring-background" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Agente Escalate</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {isThinking ? "Analisando…" : "Monitorando"}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px]">
          <Sparkles className="size-2.5 mr-1" />
          Escalate
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
                          <AvatarFallback className="bg-destructive text-white text-[10px] font-bold">
                            IA
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                    )}
                    <MessageContent>
                      <MessageHeader>
                        {msg.role === "agent" ? "Agente Escalate" : "Você"}
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
                        <AvatarFallback className="bg-destructive text-white text-[10px] font-bold">
                          IA
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
            placeholder="Pergunte sobre o incidente…"
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
// Main EscalateAgent
// ---------------------------------------------------------------------------

export default function EscalateAgent() {
  const [messages, setMessages] = useState<EscalationMessage[]>(
    mockEscalationMessages,
  );
  const [chatMessages, setChatMessages] =
    useState<EscalateChatMessage[]>(initialEscalateMessages);
  const [isThinking, setIsThinking] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"escalations" | "timeline">(
    "escalations",
  );
  const msgIdRef = useRef(300);

  function pushAgentMessage(content: string) {
    msgIdRef.current += 1;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `esc-msg-${msgIdRef.current}`,
        role: "agent",
        content,
        timestamp: Date.now(),
      },
    ]);
  }

  function handleApprove(id: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m)),
    );
    const replyKey = `${id}-approved`;
    const reply = escalateReplies[replyKey] ?? escalateReplies.default;
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      pushAgentMessage(reply);
    }, 900);
  }

  function handleDismiss(id: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "dismissed" } : m)),
    );
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      pushAgentMessage(escalateReplies.dismissed);
    }, 600);
  }

  function handleEdit(id: string, body: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, editedBody: body } : m)),
    );
  }

  function handleUserMessage(text: string) {
    msgIdRef.current += 1;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `esc-msg-${msgIdRef.current}`,
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
      if (lower.includes("status") || lower.includes("situação") || lower.includes("resumo")) {
        reply = escalateReplies.status;
      } else if (lower.includes("rollback") || lower.includes("fix") || lower.includes("corrigir")) {
        reply = escalateReplies.rollback;
      } else if (lower.includes("todas") || lower.includes("aprovar tudo") || lower.includes("approve all")) {
        reply = escalateReplies["all-approved"];
      } else {
        reply = escalateReplies.default;
      }
      pushAgentMessage(reply);
    }, 1200);
  }

  const pendingCount = messages.filter((m) => m.status === "pending").length;
  const sentCount = messages.filter((m) => m.status === "sent").length;

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col bg-background text-foreground">
        {/* Top bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-destructive/20 bg-destructive/3 px-5 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <span className="font-display text-base font-semibold tracking-tight">
              Agente Escalate
            </span>
          </div>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <span className="text-xs font-mono text-muted-foreground">{mockIncident.id}</span>
          <Badge className="bg-destructive text-white text-[10px] border-0">
            {SEV_CONFIG[mockIncident.severity].label}
          </Badge>
          <div className="ml-auto flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                <Clock className="size-3.5" />
                {pendingCount} escalação{pendingCount > 1 ? "ões" : ""} aguardando aprovação
              </span>
            )}
            {sentCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="size-3.5" />
                {sentCount} enviada{sentCount > 1 ? "s" : ""}
              </span>
            )}
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
          {(["escalations", "timeline"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab
                  ? "border-destructive text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "escalations" ? "Escalações" : "Timeline"}
              {tab === "escalations" && pendingCount > 0 && (
                <span className="ml-2 inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {activeTab === "escalations" && (
              <>
                <IncidentHeader />
                <SlaStrip />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mensagens rascunhadas — revise e aprove cada uma
                  </p>
                  {messages.map((msg) => (
                    <EscalationCard
                      key={msg.id}
                      message={msg}
                      onApprove={handleApprove}
                      onDismiss={handleDismiss}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </>
            )}

            {activeTab === "timeline" && (
              <>
                <IncidentHeader />
                <Timeline />
              </>
            )}
          </div>

          {/* Chat sidebar */}
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
