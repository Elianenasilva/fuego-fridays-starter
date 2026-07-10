import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  Users,
  XCircle,
  TriangleAlert,
  Scale,
  ScrollText,
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
  mockDecision,
  mockCriteria,
  mockOptions,
  mockStakeholders,
  initialDecisionLog,
  initialDecideMessages,
  decideReplies,
  type DecisionOption,
  type DecideChatMessage,
  type DecideLogEntry,
} from "@/data/mock-decide";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute weighted score for one option */
function weightedScore(option: DecisionOption): number {
  let total = 0;
  let maxTotal = 0;
  for (const crit of mockCriteria) {
    const s = option.scores.find((x) => x.criterionId === crit.id);
    total += (s?.score ?? 0) * crit.weight;
    maxTotal += 5 * crit.weight;
  }
  return Math.round((total / maxTotal) * 5 * 100) / 100;
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color =
    pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-fuego-500" : "bg-amber-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-foreground">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

const STATUS_BADGE: Record<
  DecisionOption["status"],
  { label: string; className: string }
> = {
  under_review: {
    label: "Em análise",
    className: "bg-muted text-muted-foreground border-border",
  },
  recommended: {
    label: "Recomendado",
    className: "bg-fuego-100 text-fuego-700 border-fuego-200",
  },
  selected: {
    label: "Selecionado",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Descartado",
    className: "bg-muted text-muted-foreground border-border opacity-60",
  },
};

// ---------------------------------------------------------------------------
// ScoringMatrix — criteria × options grid
// ---------------------------------------------------------------------------

function ScoringMatrix() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-secondary/40">
            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">
              Critério
            </th>
            <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-8">
              Peso
            </th>
            {mockOptions.map((opt) => (
              <th
                key={opt.id}
                className="px-4 py-2.5 text-center font-semibold text-foreground min-w-[120px]"
              >
                <span className="block">{opt.title}</span>
                {opt.status === "recommended" && (
                  <span className="text-[10px] text-fuego-600 font-medium flex items-center justify-center gap-0.5 mt-0.5">
                    <Sparkles className="size-2.5" /> Recomendado
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mockCriteria.map((crit, i) => (
            <tr
              key={crit.id}
              className={cn(
                "border-b border-border/50 last:border-0",
                i % 2 === 0 ? "bg-background" : "bg-secondary/20",
              )}
            >
              <td className="px-4 py-2.5">
                <p className="font-medium text-foreground">{crit.label}</p>
                <p className="text-muted-foreground leading-snug mt-0.5">
                  {crit.description}
                </p>
              </td>
              <td className="px-3 py-2.5 text-center">
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-fuego-100 text-fuego-700 font-bold text-[10px]">
                  {crit.weight}
                </span>
              </td>
              {mockOptions.map((opt) => {
                const s = opt.scores.find((x) => x.criterionId === crit.id);
                const score = s?.score ?? 0;
                const pct = (score / 5) * 100;
                return (
                  <td key={opt.id} className="px-4 py-2.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <div
                            key={dot}
                            className={cn(
                              "size-2 rounded-full",
                              dot <= score
                                ? pct >= 70
                                  ? "bg-emerald-500"
                                  : pct >= 50
                                    ? "bg-fuego-500"
                                    : "bg-amber-400"
                                : "bg-muted",
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {score}/5
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Weighted total row */}
          <tr className="bg-secondary/50 border-t-2 border-border">
            <td className="px-4 py-2.5 font-semibold text-foreground" colSpan={2}>
              Score ponderado
            </td>
            {mockOptions.map((opt) => (
              <td key={opt.id} className="px-4 py-2.5">
                <div className="flex flex-col items-center gap-1">
                  <ScoreBar score={weightedScore(opt)} />
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OptionCard — expandable with risks/benefits + select action
// ---------------------------------------------------------------------------

function OptionCard({
  option,
  onSelect,
  decided,
}: {
  option: DecisionOption;
  onSelect: (id: string) => void;
  decided: boolean;
}) {
  const [expanded, setExpanded] = useState(option.status === "recommended");
  const badge = STATUS_BADGE[option.status];
  const ws = weightedScore(option);

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border overflow-hidden transition-all duration-200",
        option.status === "recommended"
          ? "border-fuego-500/50 shadow-md shadow-fuego-500/10"
          : option.status === "selected"
            ? "border-emerald-400/60"
            : option.status === "rejected"
              ? "border-border opacity-50"
              : "border-border",
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left bg-secondary/30 border-b border-border/50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {option.title}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                badge.className,
              )}
            >
              {badge.label}
            </span>
            {option.champion && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="size-3" /> {option.champion}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
            {option.summary}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Score</p>
            <ScoreBar score={ws} />
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {option.effortLabel}
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 grid grid-cols-2 gap-4">
              {/* Benefits */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Benefícios
                </p>
                <ul className="space-y-1">
                  {option.benefits.map((b, i) => (
                    <li key={i} className="text-xs text-foreground leading-snug flex gap-1.5">
                      <span className="text-emerald-500 shrink-0 mt-0.5">+</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Risks */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <TriangleAlert className="size-3.5" /> Riscos
                </p>
                <ul className="space-y-1">
                  {option.risks.map((r, i) => (
                    <li key={i} className="text-xs text-foreground leading-snug flex gap-1.5">
                      <span className="text-destructive shrink-0 mt-0.5">−</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Criteria rationales */}
            <div className="border-t border-border/50 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Raciocínio do agente por critério
              </p>
              {option.scores.map((s) => {
                const crit = mockCriteria.find((c) => c.id === s.criterionId);
                if (!crit) return null;
                return (
                  <div key={s.criterionId} className="flex items-start gap-2">
                    <div className="flex gap-0.5 mt-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((dot) => (
                        <div
                          key={dot}
                          className={cn(
                            "size-1.5 rounded-full",
                            dot <= s.score ? "bg-fuego-500" : "bg-muted",
                          )}
                        />
                      ))}
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-foreground">
                        {crit.label}:
                      </span>{" "}
                      <span className="text-[11px] text-muted-foreground leading-snug">
                        {s.rationale}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action */}
            {!decided && option.status !== "selected" && option.status !== "rejected" && (
              <div className="border-t border-border/50 px-4 py-3">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => onSelect(option.id)}
                >
                  <ThumbsUp className="size-3.5" />
                  Selecionar esta opção
                </Button>
              </div>
            )}
            {option.status === "selected" && (
              <div className="border-t border-emerald-200 px-4 py-3 bg-emerald-50">
                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Decisão formalizada
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StakeholderPanel
// ---------------------------------------------------------------------------

function StakeholderPanel() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Stakeholders e perspectivas
      </p>
      {mockStakeholders.map((s) => {
        const leansOpt = mockOptions.find((o) => o.id === s.leans);
        return (
          <div
            key={s.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-secondary text-foreground text-[10px] font-bold">
                {s.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{s.name}</span>
                <span className="text-[10px] text-muted-foreground">{s.role}</span>
                {leansOpt && (
                  <span className="ml-auto text-[10px] text-fuego-600 font-medium flex items-center gap-1 shrink-0">
                    <Star className="size-2.5" /> {leansOpt.title}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5 italic">
                "{s.concern}"
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DecisionLog
// ---------------------------------------------------------------------------

function DecisionLog({ entries }: { entries: DecideLogEntry[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <ScrollText className="size-3.5" /> Log de decisão
      </p>
      <div className="space-y-2">
        {entries.map((e) => (
          <div
            key={e.id}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-xs"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground">
                {e.author === "agent" ? "Agente Decide" : e.author}
              </span>
              {e.author === "agent" && (
                <Sparkles className="size-3 text-fuego-500" />
              )}
            </div>
            <p
              className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: e.content
                  .replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>")
                  .replace(/\*(.+?)\*/g, "<em>$1</em>"),
              }}
            />
          </div>
        ))}
      </div>
    </div>
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
  messages: DecideChatMessage[];
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
              IA
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-1 ring-background" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Agente Decide</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {isThinking ? "Analisando…" : "Online"}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px]">
          <Scale className="size-2.5 mr-1" />
          Decide
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
                            IA
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                    )}
                    <MessageContent>
                      <MessageHeader>
                        {msg.role === "agent" ? "Agente Decide" : "Você"}
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
            placeholder="Pergunte sobre as opções…"
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
// Main DecideAgent
// ---------------------------------------------------------------------------

export default function DecideAgent() {
  const [options, setOptions] = useState(mockOptions);
  const [chatMessages, setChatMessages] = useState<DecideChatMessage[]>(initialDecideMessages);
  const [decisionLog, setDecisionLog] = useState<DecideLogEntry[]>(initialDecisionLog);
  const [isThinking, setIsThinking] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"options" | "matrix" | "stakeholders" | "log">("options");
  const [decided, setDecided] = useState(false);
  const msgIdRef = useRef(400);
  const logIdRef = useRef(10);

  function pushAgentMessage(content: string) {
    msgIdRef.current += 1;
    setChatMessages((prev) => [
      ...prev,
      { id: `dec-msg-${msgIdRef.current}`, role: "agent", content, timestamp: Date.now() },
    ]);
  }

  function pushLogEntry(content: string, author = "agent") {
    logIdRef.current += 1;
    setDecisionLog((prev) => [
      ...prev,
      { id: `log-${logIdRef.current}`, timestamp: Date.now(), author, content },
    ]);
  }

  function handleSelect(optId: string) {
    setOptions((prev) =>
      prev.map((o) => ({
        ...o,
        status:
          o.id === optId
            ? "selected"
            : o.status === "recommended" || o.status === "under_review"
              ? "rejected"
              : o.status,
      })),
    );
    setDecided(true);

    const replyKey = `${optId}-selected`;
    const reply = decideReplies[replyKey] ?? decideReplies.default;
    const selectedOpt = options.find((o) => o.id === optId);

    pushLogEntry(
      `Decisão formalizada: **${selectedOpt?.title ?? optId}** selecionada. Score ponderado: ${weightedScore(selectedOpt ?? options[0]).toFixed(2)}/5.`,
    );

    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      pushAgentMessage(reply);
    }, 1000);
  }

  function handleUserMessage(text: string) {
    msgIdRef.current += 1;
    setChatMessages((prev) => [
      ...prev,
      { id: `dec-msg-${msgIdRef.current}`, role: "user", content: text, timestamp: Date.now() },
    ]);
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      const lower = text.toLowerCase();
      let reply: string;
      if (lower.includes("soc2") || lower.includes("soc 2") || lower.includes("compliance") || lower.includes("segurança")) {
        reply = decideReplies.soc2;
      } else if (lower.includes("deadline") || lower.includes("prazo") || lower.includes("tempo")) {
        reply = decideReplies.deadline;
      } else if (lower.includes("score") || lower.includes("nota") || lower.includes("pontuação")) {
        reply = decideReplies.score;
      } else {
        reply = decideReplies.default;
      }
      pushAgentMessage(reply);
    }, 1200);
  }

  const tabs = [
    { id: "options", label: "Opções", icon: GitBranch },
    { id: "matrix", label: "Matriz de Score", icon: Scale },
    { id: "stakeholders", label: "Stakeholders", icon: Users },
    { id: "log", label: "Log", icon: ScrollText },
  ] as const;

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col bg-background text-foreground">
        {/* Top bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Scale className="size-5 text-fuego-500" />
            <span className="font-display text-base font-semibold tracking-tight">
              Agente Decide
            </span>
          </div>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {mockDecision.title}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {mockDecision.id} · Deadline {mockDecision.deadline}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {decided ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
              >
                <CheckCircle2 className="size-4" /> Decisão formalizada
              </motion.div>
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                Em aberto
              </Badge>
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

        {/* Context bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-secondary/20 px-5 py-2">
          <XCircle className="size-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {mockDecision.context}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-border px-5 gap-0">
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
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {activeTab === "options" && options.map((opt) => (
              <OptionCard
                key={opt.id}
                option={opt}
                onSelect={handleSelect}
                decided={decided}
              />
            ))}
            {activeTab === "matrix" && <ScoringMatrix />}
            {activeTab === "stakeholders" && <StakeholderPanel />}
            {activeTab === "log" && <DecisionLog entries={decisionLog} />}
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
