/**
 * Mock data for the Agente Escalate — an AI incident escalation teammate.
 *
 * Pattern: Escalate — raise something when it can't be resolved in place.
 * The agent detects a production incident exceeding the on-call engineer's
 * authority or capacity, identifies who needs to know, drafts the right
 * message for each audience, and gates every outbound action behind explicit
 * human consent before firing.
 *
 * It doesn't escalate silently. It shows its work, explains why, and waits
 * for the human to approve each step.
 */

export type IncidentSeverity = "sev1" | "sev2" | "sev3";
export type EscalationStatus = "pending" | "approved" | "sent" | "dismissed";
export type TimelineEventKind =
  | "detected"
  | "investigating"
  | "update"
  | "escalation"
  | "resolved";

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  label: string;
  detail: string;
  minutesAgo: number;
  agentGenerated?: boolean;
}

export interface AffectedCustomer {
  id: string;
  name: string;
  tier: "enterprise" | "growth" | "starter";
  mrr: string;
  contractedSla: string; // e.g. "99.9% uptime / 1h response"
  slaBreachMinutes: number; // minutes until SLA breach (negative = already breached)
  csm: string; // customer success manager name
}

export interface EscalationTarget {
  id: string;
  name: string;
  role: string;
  channel: "slack" | "email" | "pagerduty" | "sms";
  avatarInitials: string;
  reason: string; // why the agent chose this person
}

export interface EscalationMessage {
  id: string;
  targetId: string;
  subject?: string; // for email
  body: string;
  status: EscalationStatus;
  /** True = agent drafted this without being asked */
  agentDrafted: boolean;
  editedBody?: string; // human-edited version
}

export interface EscalateChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// The incident
// ---------------------------------------------------------------------------

export const mockIncident = {
  id: "INC-2847",
  title: "Export service returning 500s — widespread data loss risk",
  severity: "sev1" as IncidentSeverity,
  openedMinutesAgo: 47,
  status: "investigating" as "open" | "investigating" | "mitigated" | "resolved",
  summary:
    "The export worker pool is throwing unhandled exceptions on all PDF/XLSX export requests since 19:14 UTC. 3 enterprise customers have reported data loss on in-flight exports. Root cause points to a memory ceiling introduced in deploy v2.14.1 (19:09 UTC). Rollback is being prepared but requires VP Engineering sign-off.",
  deployVersion: "v2.14.1",
  deployedMinutesAgo: 52,
  oncallEngineer: "You",
  errorRate: "94%",
  affectedRequests: 1_847,
};

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export const mockTimeline: TimelineEvent[] = [
  {
    id: "tl-1",
    kind: "detected",
    label: "Incident detected",
    detail: "Export worker error rate crossed 80% threshold. Alert fired automatically.",
    minutesAgo: 47,
    agentGenerated: true,
  },
  {
    id: "tl-2",
    kind: "investigating",
    label: "On-call investigation started",
    detail: "You acknowledged the alert and began investigating. Stack traces point to memory ceiling in worker pool.",
    minutesAgo: 44,
  },
  {
    id: "tl-3",
    kind: "update",
    label: "Root cause identified",
    detail: "Memory limit reduced from 512MB to 128MB in deploy v2.14.1. Workers OOM-killing before completing export jobs.",
    minutesAgo: 31,
    agentGenerated: true,
  },
  {
    id: "tl-4",
    kind: "update",
    label: "3 enterprise customers confirmed affected",
    detail: "Acme Co., Globex Corp, and Initech have opened support tickets. Acme reporting partial data loss on a quarterly report export.",
    minutesAgo: 18,
    agentGenerated: true,
  },
  {
    id: "tl-5",
    kind: "escalation",
    label: "Agent recommends escalation",
    detail: "SLA breach imminent for Acme Co. (8 min). Rollback requires VP Eng approval. Customer communication needed. Escalation drafted and awaiting your approval.",
    minutesAgo: 2,
    agentGenerated: true,
  },
];

// ---------------------------------------------------------------------------
// Affected customers
// ---------------------------------------------------------------------------

export const mockAffectedCustomers: AffectedCustomer[] = [
  {
    id: "cust-1",
    name: "Acme Co.",
    tier: "enterprise",
    mrr: "$24,000",
    contractedSla: "99.95% uptime / 30-min response",
    slaBreachMinutes: 8,
    csm: "Daniela R.",
  },
  {
    id: "cust-2",
    name: "Globex Corp",
    tier: "enterprise",
    mrr: "$18,500",
    contractedSla: "99.9% uptime / 1h response",
    slaBreachMinutes: 23,
    csm: "Marcus T.",
  },
  {
    id: "cust-3",
    name: "Initech",
    tier: "growth",
    mrr: "$3,200",
    contractedSla: "99.5% uptime / 4h response",
    slaBreachMinutes: 193,
    csm: "Priya S.",
  },
];

// ---------------------------------------------------------------------------
// Escalation targets — who needs to be looped in and why
// ---------------------------------------------------------------------------

export const mockEscalationTargets: EscalationTarget[] = [
  {
    id: "target-1",
    name: "Sarah Chen",
    role: "VP Engineering",
    channel: "pagerduty",
    avatarInitials: "SC",
    reason: "Rollback of v2.14.1 requires VP Eng sign-off per runbook R-04. Without approval, the fix is blocked.",
  },
  {
    id: "target-2",
    name: "Daniela R.",
    role: "CSM — Acme Co.",
    channel: "slack",
    avatarInitials: "DR",
    reason: "Acme's SLA breaches in 8 minutes. Their CSM must be notified now to manage the customer relationship and issue SLA credits.",
  },
  {
    id: "target-3",
    name: "Marcus T.",
    role: "CSM — Globex Corp",
    channel: "slack",
    avatarInitials: "MT",
    reason: "Globex SLA breaches in 23 minutes. Proactive communication now reduces churn risk.",
  },
  {
    id: "target-4",
    name: "Support Bridge",
    role: "Customer Status Page",
    channel: "email",
    avatarInitials: "SP",
    reason: "Public status page should reflect the incident so customers aren't blindsided. Transparency reduces inbound support volume.",
  },
];

// ---------------------------------------------------------------------------
// Drafted messages — agent pre-wrote these, human must approve each one
// ---------------------------------------------------------------------------

export const mockEscalationMessages: EscalationMessage[] = [
  {
    id: "msg-1",
    targetId: "target-1",
    subject: "[SEV1 INC-2847] Rollback approval needed — export worker OOM",
    body: `Hi Sarah,

We have a SEV1 in production. Export worker pool has been returning 500s for 47 minutes following deploy v2.14.1 (19:09 UTC).

Root cause: memory limit was reduced from 512MB → 128MB in that deploy. Workers are OOM-killing before completing export jobs. 94% error rate, 1,847 requests affected.

3 enterprise customers are impacted. Acme's SLA breaches in 8 minutes.

The fix is a rollback to v2.14.0. Per runbook R-04, this requires VP Eng sign-off.

Can you approve the rollback now? I'm standing by to execute immediately on your go-ahead.

— ${mockIncident.oncallEngineer} (on-call)`,
    status: "pending",
    agentDrafted: true,
  },
  {
    id: "msg-2",
    targetId: "target-2",
    body: `Hi Daniela,

Heads up — Acme Co. is being affected by a production incident (INC-2847) impacting export functionality. Started ~47 minutes ago.

Impact: PDF and XLSX exports are failing. Acme has reported a partial data loss on a quarterly report export they had in flight.

ETA to fix: rollback is queued, awaiting VP Eng approval. Estimated resolution: 15–20 minutes.

SLA note: Acme's 30-minute response SLA breaches in ~8 minutes. You'll want to reach out to them directly now to manage expectations and document the credit.

I'll update you the moment we have a resolution ETA or the rollback is approved.`,
    status: "pending",
    agentDrafted: true,
  },
  {
    id: "msg-3",
    targetId: "target-3",
    body: `Hi Marcus,

Globex Corp is affected by a production incident (INC-2847). Export functionality has been down for ~47 minutes.

No data loss reported for Globex yet, but exports are failing. Their SLA (99.9% / 1h response) breaches in ~23 minutes.

Fix is in progress — rollback being approved now. Estimated resolution: 15–20 min.

Recommend reaching out to your Globex contact proactively. Happy to draft the customer-facing message if helpful.`,
    status: "pending",
    agentDrafted: true,
  },
  {
    id: "msg-4",
    targetId: "target-4",
    subject: "[Investigating] Export functionality degraded",
    body: `We are currently investigating an issue affecting PDF and XLSX export functionality.

Exports may fail or return errors. We are actively working on a fix and expect resolution within 20 minutes.

We will post an update as soon as the issue is resolved.

— Engineering Team`,
    status: "pending",
    agentDrafted: true,
  },
];

// ---------------------------------------------------------------------------
// Initial chat
// ---------------------------------------------------------------------------

export const initialEscalateMessages: EscalateChatMessage[] = [
  {
    id: "esc-msg-1",
    role: "agent",
    content:
      "Acompanhei o incidente INC-2847 desde a detecção. A situação está além do que você pode resolver sozinho:\n\n• O rollback precisa de aprovação da VP de Engenharia\n• A SLA da Acme Co. vai brechar em **8 minutos**\n• 3 clientes enterprise afetados, 2 CSMs precisam ser avisados agora\n\nDraftei **4 mensagens** prontas para enviar. Revise cada uma e me diga quais aprovar — não envio nada sem sua confirmação explícita.",
    timestamp: 0,
  },
];

// ---------------------------------------------------------------------------
// Chat replies
// ---------------------------------------------------------------------------

export const escalateReplies: Record<string, string> = {
  "msg-1-approved":
    "Mensagem para Sarah Chen enviada via PagerDuty. Ela receberá o alerta agora. Assim que ela aprovar o rollback, posso notificar os CSMs automaticamente — ou prefere que eu aguarde?",
  "msg-2-approved":
    "Daniela foi notificada no Slack. Ela tem o contexto completo para gerenciar a Acme Co. Recomendo aprovar a mensagem do Globex agora também — 23 minutos passa rápido.",
  "msg-3-approved":
    "Marcus notificado. Dois CSMs avisados. Só falta a status page. Esse é o mais importante para volume de suporte inbound — aprova?",
  "msg-4-approved":
    "Status page atualizada. Clientes que tentarem exportar agora verão o aviso em vez de um erro sem contexto. Isso reduz tickets de suporte significativamente. Aguardando aprovação da VP para o rollback.",
  "all-approved":
    "Todas as escalações enviadas. Incidente está no radar de quem precisa estar. Próximo passo: aguardar aprovação da Sarah para o rollback. Quero continuar atualizando a timeline até resolução?",
  dismissed:
    "Entendido, descartei essa. Se mudar de ideia, posso reabrir a qualquer momento.",
  default:
    "Estou monitorando o incidente. Me avise se quiser ajustar alguma mensagem, adicionar um target, ou se houver novidades no diagnóstico.",
  status:
    "**Status atual:** Export worker com 94% de erro. Rollback aguardando aprovação. SLA da Acme breache em breve. Recomendo priorizar a aprovação da mensagem para Sarah Chen (VP Eng) — ela desbloqueia tudo.",
  rollback:
    "O rollback para v2.14.0 está preparado e vai resolver o problema em ~5 minutos após execução. O bloqueio é apenas a aprovação da VP Eng. É por isso que a mensagem para Sarah Chen é a mais urgente.",
};
