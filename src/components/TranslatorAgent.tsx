import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Languages,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  BookOpen,
  AlertCircle,
  Info,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  TONE_LABELS,
  agentReplies,
  initialChatMessages,
  mockSegments,
  mockSourceDocument,
  type FlaggedDecision,
  type TranslationSegment,
  type TranslatorChatMessage,
} from "@/data/mock-translator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Confidence indicator
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90
      ? "bg-emerald-500"
      : pct >= 75
        ? "bg-fuego-500"
        : "bg-amber-500";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", color)}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
              {pct}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Confiança da tradução: {pct}%
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Flagged decision chip
// ---------------------------------------------------------------------------

function DecisionChip({
  decision,
  onSelect,
}: {
  decision: FlaggedDecision;
  onSelect: (decisionId: string, option: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = decision.selectedOption;

  return (
    <div className="rounded-lg border border-fuego-500/30 bg-fuego-50 p-2.5 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="flex items-start gap-1.5">
          <AlertCircle className="mt-0.5 size-3 shrink-0 text-fuego-600" />
          <span className="font-medium text-foreground">
            &ldquo;{decision.term}&rdquo;
          </span>
        </div>
        {open ? (
          <ChevronUp className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <p className="mt-2 text-muted-foreground leading-snug">
              {decision.reason}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {decision.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelect(decision.id, opt)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    selected === opt
                      ? "border-fuego-500 bg-fuego-500 text-white"
                      : "border-border bg-background text-foreground hover:border-fuego-400 hover:bg-fuego-50",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segment card — one translation unit
// ---------------------------------------------------------------------------

function SegmentCard({
  segment,
  isActive,
  onActivate,
  onAccept,
  onEdit,
  onDecisionSelect,
}: {
  segment: TranslationSegment;
  isActive: boolean;
  onActivate: () => void;
  onAccept: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDecisionSelect: (segId: string, decisionId: string, option: string) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState(segment.proposedTranslation);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editMode) textareaRef.current?.focus();
  }, [editMode]);

  const statusConfig = {
    pending: { label: "Aguardando", color: "text-muted-foreground", bg: "bg-muted" },
    translating: { label: "Traduzindo…", color: "text-fuego-600", bg: "bg-fuego-50" },
    proposed: { label: "Proposto", color: "text-amber-700", bg: "bg-amber-50" },
    accepted: { label: "Aprovado", color: "text-emerald-700", bg: "bg-emerald-50" },
    edited: { label: "Editado", color: "text-blue-700", bg: "bg-blue-50" },
  }[segment.status];

  const allDecisionsResolved =
    segment.flaggedDecisions.length === 0 ||
    segment.flaggedDecisions.every((d) => d.selectedOption);

  return (
    <motion.div
      layout
      onClick={onActivate}
      className={cn(
        "rounded-xl border transition-all duration-200 overflow-hidden cursor-pointer",
        isActive
          ? "border-fuego-500/50 shadow-md shadow-fuego-500/10"
          : "border-border hover:border-border/80 hover:shadow-sm",
        segment.status === "accepted" && "opacity-70",
      )}
    >
      {/* Segment header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/50 bg-secondary/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            #{segment.id.replace("seg-", "")}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              statusConfig.bg,
              statusConfig.color,
            )}
          >
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {segment.appliedGlossaryTerms.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-default">
                    <BookOpen className="size-3" />
                    <span>{segment.appliedGlossaryTerms.length} glossário</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">Termos aplicados:</p>
                  {segment.appliedGlossaryTerms.map((t) => (
                    <p key={t}>· {t}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {segment.status !== "pending" && segment.confidence > 0 && (
            <ConfidenceBar value={segment.confidence} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border/50">
        {/* Source */}
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Origem
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {segment.sourceText}
          </p>
        </div>

        {/* Translation */}
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Tradução
          </p>

          {segment.status === "pending" && (
            <p className="text-sm text-muted-foreground italic">
              Na fila…
            </p>
          )}

          {segment.status === "translating" && (
            <div className="flex items-center gap-2 text-sm text-fuego-600">
              <Loader2 className="size-3.5 animate-spin" />
              Traduzindo…
            </div>
          )}

          {(segment.status === "proposed" ||
            segment.status === "accepted" ||
            segment.status === "edited") && (
            <>
              {editMode ? (
                <div className="space-y-2">
                  <Textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm min-h-[80px]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      onClick={() => {
                        onEdit(segment.id, editValue);
                        setEditMode(false);
                      }}
                    >
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setEditValue(segment.proposedTranslation);
                        setEditMode(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-foreground">
                  {segment.confirmedTranslation ?? segment.proposedTranslation}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Decisions + actions */}
      <AnimatePresence>
        {isActive &&
          (segment.status === "proposed" || segment.status === "edited") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border/50 bg-background"
            >
              <div className="p-4 space-y-3">
                {segment.flaggedDecisions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="size-3 text-fuego-500" />
                      Decisões terminológicas
                    </p>
                    {segment.flaggedDecisions.map((d) => (
                      <DecisionChip
                        key={d.id}
                        decision={d}
                        onSelect={(decId, opt) =>
                          onDecisionSelect(segment.id, decId, opt)
                        }
                      />
                    ))}
                  </div>
                )}

                <div
                  className="flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={!allDecisionsResolved}
                    onClick={() => onAccept(segment.id)}
                  >
                    <ThumbsUp className="size-3.5" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit3 className="size-3.5" />
                    Editar
                  </Button>
                </div>
                {!allDecisionsResolved && (
                  <p className="text-[11px] text-muted-foreground">
                    Resolva todas as decisões terminológicas antes de aprovar.
                  </p>
                )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Chat panel — AI teammate conversation sidebar
// ---------------------------------------------------------------------------

function ChatPanel({
  messages,
  onSend,
  isThinking,
}: {
  messages: TranslatorChatMessage[];
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
      {/* Chat header */}
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
          <p className="text-sm font-semibold leading-none">Agente Tradutor</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {isThinking ? "Pensando…" : "Online"}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px]">
          <Sparkles className="size-2.5 mr-1" />
          Communicate
        </Badge>
      </div>

      {/* Messages */}
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
                        {msg.role === "agent" ? "Agente Tradutor" : "Você"}
                      </MessageHeader>
                      <Bubble
                        variant={msg.role === "user" ? "default" : "secondary"}
                        align={msg.role === "user" ? "end" : "start"}
                      >
                        <BubbleContent>
                          <span
                            className="whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: msg.content.replace(
                                /\*\*(.+?)\*\*/g,
                                "<strong>$1</strong>",
                              ).replace(
                                /\*(.+?)\*/g,
                                "<em>$1</em>",
                              ),
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
                            Pensando…
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

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escreva uma instrução…"
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
// Stats bar
// ---------------------------------------------------------------------------

function StatsBar({ segments }: { segments: TranslationSegment[] }) {
  const total = segments.length;
  const accepted = segments.filter((s) => s.status === "accepted" || s.status === "edited").length;
  const proposed = segments.filter((s) => s.status === "proposed").length;
  const pending = segments.filter((s) => s.status === "pending").length;
  const pct = total > 0 ? Math.round((accepted / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="font-medium tabular-nums">{pct}%</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <span>
        <strong className="text-emerald-700">{accepted}</strong> aprovados
      </span>
      <span>
        <strong className="text-amber-700">{proposed}</strong> propostos
      </span>
      <span>
        <strong className="text-muted-foreground">{pending}</strong> na fila
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main TranslatorAgent
// ---------------------------------------------------------------------------

export default function TranslatorAgent() {
  const [segments, setSegments] = useState<TranslationSegment[]>(mockSegments);
  const [chatMessages, setChatMessages] = useState<TranslatorChatMessage[]>(initialChatMessages);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>("seg-1");
  const [isThinking, setIsThinking] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const msgIdRef = useRef(100);

  /** Simulate the agent translating a pending segment */
  const translateSegment = useCallback((id: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "translating" } : s)),
    );
    setTimeout(() => {
      setSegments((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: "proposed",
                confidence: 0.88 + Math.random() * 0.1,
              }
            : s,
        ),
      );
      setActiveSegmentId(id);
    }, 1800);
  }, []);

  /** Accept a segment */
  function handleAccept(id: string) {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "accepted",
              confirmedTranslation: s.proposedTranslation,
            }
          : s,
      ),
    );

    // Agent reacts
    const replyKey = `${id}-accepted`;
    const replyText = agentReplies[replyKey] ?? agentReplies.default;
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      pushAgentMessage(replyText, id);

      // If seg-5 has been accepted, offer to translate it
      if (id === "seg-4") {
        setTimeout(() => translateSegment("seg-5"), 3000);
      }
    }, 1200);
  }

  /** Edit a segment */
  function handleEdit(id: string, text: string) {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: "edited", confirmedTranslation: text }
          : s,
      ),
    );
  }

  /** Resolve a terminology decision */
  function handleDecisionSelect(
    segId: string,
    decisionId: string,
    option: string,
  ) {
    setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== segId) return s;
        return {
          ...s,
          flaggedDecisions: s.flaggedDecisions.map((d) =>
            d.id === decisionId ? { ...d, selectedOption: option } : d,
          ),
          proposedTranslation: s.proposedTranslation.replace(
            d_optionOf(s.flaggedDecisions, decisionId),
            option,
          ),
        };
      }),
    );
  }

  function d_optionOf(decisions: FlaggedDecision[], id: string): string {
    const d = decisions.find((x) => x.id === id);
    return d?.selectedOption ?? d?.options[0] ?? "";
  }

  function pushAgentMessage(content: string, segId?: string) {
    msgIdRef.current += 1;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `chat-${msgIdRef.current}`,
        role: "agent",
        content,
        relatedSegmentId: segId,
        timestamp: Date.now(),
      },
    ]);
  }

  function handleUserMessage(text: string) {
    msgIdRef.current += 1;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `chat-${msgIdRef.current}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      },
    ]);

    // Simulate agent thinking and responding
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      // Check for trigger keywords
      const lower = text.toLowerCase();
      if (lower.includes("traduz") || lower.includes("próximo") || lower.includes("proximo")) {
        const pending = segments.find((s) => s.status === "pending");
        if (pending) {
          pushAgentMessage(
            `Traduzindo o segmento ${pending.id.replace("seg-", "")} agora…`,
          );
          translateSegment(pending.id);
        } else {
          pushAgentMessage(
            "Todos os segmentos já foram traduzidos! Só falta a aprovação dos propostos.",
          );
        }
      } else if (lower.includes("glossário") || lower.includes("glossario")) {
        pushAgentMessage(
          "O glossário da FTD tem **6 termos aprovados** para pt-BR → en-US. Os principais: *obra → title*, *adoção → adoption*, *material de apoio → supplementary materials*, *aluno → student*. Quer revisar ou adicionar algum?",
        );
      } else {
        pushAgentMessage(agentReplies.default);
      }
    }, 1400);
  }

  const approvedCount = segments.filter(
    (s) => s.status === "accepted" || s.status === "edited",
  ).length;

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col bg-background text-foreground">
        {/* Top bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Languages className="size-5 text-fuego-500" />
            <span className="font-display text-base font-semibold tracking-tight">
              Agente Tradutor
            </span>
          </div>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Language pair */}
          <div className="flex items-center gap-1.5 text-sm">
            <span>{LANGUAGE_FLAGS[mockSourceDocument.sourceLang]}</span>
            <span className="text-muted-foreground">
              {LANGUAGE_LABELS[mockSourceDocument.sourceLang]}
            </span>
            <span className="text-muted-foreground mx-1">→</span>
            <span>{LANGUAGE_FLAGS[mockSourceDocument.targetLang]}</span>
            <span className="text-muted-foreground">
              {LANGUAGE_LABELS[mockSourceDocument.targetLang]}
            </span>
          </div>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Badge variant="outline" className="text-[10px] capitalize">
            {TONE_LABELS[mockSourceDocument.tone]}
          </Badge>

          <div className="ml-auto flex items-center gap-3">
            <StatsBar segments={segments} />
            {approvedCount === segments.length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"
              >
                <CheckCircle2 className="size-4" />
                Completo
              </motion.div>
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

        {/* Document meta */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border/50 bg-secondary/30 px-5 py-2.5">
          <BookOpen className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{mockSourceDocument.title}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {mockSourceDocument.context}
          </span>
          <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3 text-emerald-600" />
            Glossário aplicado
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 min-h-0">
          {/* Segments column */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
            {/* Column headers */}
            <div className="grid grid-cols-2 gap-0 mb-1 px-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{LANGUAGE_FLAGS[mockSourceDocument.sourceLang]}</span>
                Original
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pl-4">
                <span>{LANGUAGE_FLAGS[mockSourceDocument.targetLang]}</span>
                Tradução proposta
              </div>
            </div>

            {segments.map((seg) => (
              <SegmentCard
                key={seg.id}
                segment={seg}
                isActive={activeSegmentId === seg.id}
                onActivate={() =>
                  setActiveSegmentId((cur) =>
                    cur === seg.id ? null : seg.id,
                  )
                }
                onAccept={handleAccept}
                onEdit={handleEdit}
                onDecisionSelect={handleDecisionSelect}
              />
            ))}

            {/* Agent notice: pending segments */}
            {segments.some((s) => s.status === "pending") && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 rounded-lg border border-fuego-500/25 bg-fuego-50 p-3 text-sm"
              >
                <Info className="size-4 shrink-0 text-fuego-600 mt-0.5" />
                <span className="text-fuego-900">
                  <strong>Agente:</strong> Há{" "}
                  {segments.filter((s) => s.status === "pending").length}{" "}
                  segmento(s) na fila. Diga "traduz o próximo" no chat ou
                  aprove os propostos para eu continuar.
                </span>
              </motion.div>
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
