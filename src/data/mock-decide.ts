/**
 * Mock data for the Agente Decide — an AI decision-support teammate.
 *
 * Pattern: Decide — weigh options and formalize a choice.
 * The agent doesn't just list pros/cons. It scores each option against the
 * team's stated criteria, surfaces hidden trade-offs, shows its reasoning,
 * and produces a decision record the team can stand behind.
 *
 * Domain: database migration strategy for a growing SaaS product.
 */

export type DecisionStatus = "open" | "decided";
export type OptionStatus = "under_review" | "recommended" | "selected" | "rejected";

export interface Criterion {
  id: string;
  label: string;
  description: string;
  weight: number; // 1–3 (importance multiplier)
}

export interface OptionScore {
  criterionId: string;
  /** Raw score 1–5 */
  score: number;
  /** Why the agent assigned this score */
  rationale: string;
}

export interface DecisionOption {
  id: string;
  title: string;
  summary: string;
  status: OptionStatus;
  scores: OptionScore[];
  /** Key risks the agent flagged */
  risks: string[];
  /** Key benefits */
  benefits: string[];
  /** Estimated effort (story points or days) */
  effortLabel: string;
  /** Who proposed or championed this option */
  champion?: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  /** Their stated priority / concern */
  concern: string;
  /** Which option they lean toward */
  leans?: string; // option id
}

export interface DecideLogEntry {
  id: string;
  timestamp: number;
  author: "agent" | string;
  content: string;
}

export interface DecideChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

export const mockDecision = {
  id: "DEC-019",
  title: "Estratégia de migração do banco de dados — monolito → multi-tenant",
  context:
    "O banco de dados PostgreSQL atual é um monolito compartilhado por todos os clientes. Com 3 enterprise onboardings previstos para Q3, precisamos decidir a estratégia de isolamento antes do dia 18 de julho. A escolha impacta tempo de dev, custo de infra e SLA contratado.",
  deadline: "18 Jul 2026",
  status: "open" as DecisionStatus,
  decidedBy: null as string | null,
  decidedOptionId: null as string | null,
};

// ---------------------------------------------------------------------------
// Criteria — what the team cares about
// ---------------------------------------------------------------------------

export const mockCriteria: Criterion[] = [
  {
    id: "crit-1",
    label: "Velocidade de entrega",
    description: "Quanto tempo até estar em produção para os clientes enterprise de Q3?",
    weight: 3,
  },
  {
    id: "crit-2",
    label: "Isolamento de dados",
    description: "Quão bem os dados de cada cliente ficam separados dos demais?",
    weight: 3,
  },
  {
    id: "crit-3",
    label: "Custo de infraestrutura",
    description: "Impacto no custo mensal de infra a médio prazo (12 meses)?",
    weight: 2,
  },
  {
    id: "crit-4",
    label: "Complexidade operacional",
    description: "Dificuldade de operar, monitorar e fazer backup da solução?",
    weight: 2,
  },
  {
    id: "crit-5",
    label: "Escalabilidade futura",
    description: "Capacidade de suportar 10× o volume atual sem redesign?",
    weight: 2,
  },
];

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const mockOptions: DecisionOption[] = [
  {
    id: "opt-1",
    title: "Schema-per-tenant",
    summary:
      "Manter um único banco PostgreSQL, mas criar um schema separado por cliente. Migração incremental, sem nova infra.",
    status: "recommended",
    champion: "Marcus (Eng Lead)",
    effortLabel: "3–4 semanas",
    scores: [
      {
        criterionId: "crit-1",
        score: 4,
        rationale:
          "Pode ser entregue antes do deadline de Q3. Não exige novo cluster — apenas scripts de migração e ajustes no ORM.",
      },
      {
        criterionId: "crit-2",
        score: 3,
        rationale:
          "Isolamento lógico é sólido, mas ainda é um único banco. Um bug de query sem filtro de schema pode vazar dados entre tenants.",
      },
      {
        criterionId: "crit-3",
        score: 5,
        rationale:
          "Reutiliza a infra existente. Custo quase zero de infra adicional no médio prazo.",
      },
      {
        criterionId: "crit-4",
        score: 4,
        rationale:
          "Operação familiar — mesmas ferramentas de backup e monitoramento. A complexidade adicional é gerenciável.",
      },
      {
        criterionId: "crit-5",
        score: 3,
        rationale:
          "Funciona bem até ~200 tenants. Acima disso, tamanho do banco e tempo de vacuum podem virar gargalo.",
      },
    ],
    risks: [
      "Risco de cross-tenant data leak por query sem filtro de schema",
      "Limite prático de ~200 tenants num único banco",
      "Migrations precisam rodar para cada schema — complexidade cresce linearmente",
    ],
    benefits: [
      "Mais rápido de implementar — dentro do deadline de Q3",
      "Custo de infra mínimo",
      "Equipe já conhece a stack — curva de aprendizado baixa",
      "Rollback simples se algo der errado",
    ],
  },
  {
    id: "opt-2",
    title: "Database-per-tenant",
    summary:
      "Um banco PostgreSQL dedicado por cliente enterprise. Máximo isolamento, custo mais alto.",
    status: "under_review",
    champion: "Priya (Segurança)",
    effortLabel: "6–8 semanas",
    scores: [
      {
        criterionId: "crit-1",
        score: 2,
        rationale:
          "Provisionamento automatizado de banco por tenant ainda não existe. Precisaria ser construído do zero — inviável para Q3.",
      },
      {
        criterionId: "crit-2",
        score: 5,
        rationale:
          "Isolamento máximo. Impossível vazar dados entre tenants por query. Atende requisitos de compliance mais rigorosos (SOC 2 Type II, HIPAA).",
      },
      {
        criterionId: "crit-3",
        score: 2,
        rationale:
          "Custo cresce linearmente com número de tenants. 10 enterprise = 10 bancos. Pode dobrar o custo de infra em 12 meses.",
      },
      {
        criterionId: "crit-4",
        score: 2,
        rationale:
          "Monitoramento, backup e patching de N bancos é muito mais complexo. Requer automação adicional.",
      },
      {
        criterionId: "crit-5",
        score: 5,
        rationale:
          "Escala muito bem — cada tenant tem seu próprio ceiling. Ideal para clientes enterprise com volumes imprevisíveis.",
      },
    ],
    risks: [
      "Não entrega antes do deadline de Q3 sem comprometer qualidade",
      "Custo de infra pode dobrar em 12 meses",
      "Requer automação de provisionamento que não existe ainda",
      "Complexidade operacional alta sem SRE dedicado",
    ],
    benefits: [
      "Isolamento máximo — ideal para compliance (SOC 2, HIPAA)",
      "Performance por tenant não é afetada por outros tenants",
      "Arquitetura limpa para crescimento a longo prazo",
    ],
  },
  {
    id: "opt-3",
    title: "Row-level security (RLS)",
    summary:
      "Manter um único schema, usar Row-Level Security nativo do PostgreSQL para isolar dados por tenant_id.",
    status: "under_review",
    champion: "Dana (Backend)",
    effortLabel: "2–3 semanas",
    scores: [
      {
        criterionId: "crit-1",
        score: 5,
        rationale:
          "Mais rápido de implementar. Apenas adicionar políticas RLS e garantir que tenant_id está em todas as tabelas críticas.",
      },
      {
        criterionId: "crit-2",
        score: 3,
        rationale:
          "RLS é robusto quando configurado corretamente, mas um bypass (SET SESSION AUTHORIZATION, SECURITY DEFINER functions) pode expor dados. Requer auditoria de todo o codebase.",
      },
      {
        criterionId: "crit-3",
        score: 5,
        rationale: "Zero custo adicional de infra. Funciona no banco atual.",
      },
      {
        criterionId: "crit-4",
        score: 4,
        rationale:
          "Operacionalmente simples. O risco está no desenvolvimento — política RLS errada é difícil de detectar em testes.",
      },
      {
        criterionId: "crit-5",
        score: 4,
        rationale:
          "Escala bem se indexado por tenant_id. Pode ter degradação de performance em tabelas muito grandes com muitos tenants.",
      },
    ],
    risks: [
      "Bypass de RLS via SECURITY DEFINER ou SET SESSION — requer auditoria completa",
      "Difícil de testar corretamente — falsos negativos em testes de segurança",
      "Todas as queries existentes precisam ser auditadas para garantir que tenant_id está presente",
      "Desenvolvedores novos podem introduzir queries sem o filtro sem perceber",
    ],
    benefits: [
      "Mais rápido de entregar — pode estar pronto em 2–3 semanas",
      "Zero custo adicional de infra",
      "Nativo do PostgreSQL — bem documentado",
      "Código da aplicação fica mais simples (sem lógica de schema switching)",
    ],
  },
];

// ---------------------------------------------------------------------------
// Stakeholders
// ---------------------------------------------------------------------------

export const mockStakeholders: Stakeholder[] = [
  {
    id: "s-1",
    name: "Marcus",
    role: "Eng Lead",
    avatarInitials: "MA",
    concern: "Precisamos entregar para Q3. Não posso comprometer o deadline.",
    leans: "opt-1",
  },
  {
    id: "s-2",
    name: "Priya",
    role: "Segurança",
    avatarInitials: "PR",
    concern: "Dois dos enterprise prospects têm requisitos de compliance SOC 2. Isolamento precisa ser auditável.",
    leans: "opt-2",
  },
  {
    id: "s-3",
    name: "Dana",
    role: "Backend",
    avatarInitials: "DA",
    concern: "Menos infra nova pra operar. RLS mantém a stack simples.",
    leans: "opt-3",
  },
  {
    id: "s-4",
    name: "CEO",
    role: "Executivo",
    avatarInitials: "CE",
    concern: "Não quero perder os enterprise por causa de bloqueio técnico. Entrega > perfeição agora.",
    leans: "opt-1",
  },
];

// ---------------------------------------------------------------------------
// Decision log
// ---------------------------------------------------------------------------

export const initialDecisionLog: DecideLogEntry[] = [
  {
    id: "log-1",
    timestamp: 0,
    author: "agent",
    content:
      "Analisei as 3 opções contra os 5 critérios ponderados da equipe. Score ponderado: Schema-per-tenant 3.75 · RLS 3.65 · DB-per-tenant 3.25. Recomendo Schema-per-tenant pelo equilíbrio entre velocidade e isolamento, mas há uma nuance importante sobre compliance — veja minha análise.",
  },
];

// ---------------------------------------------------------------------------
// Initial chat
// ---------------------------------------------------------------------------

export const initialDecideMessages: DecideChatMessage[] = [
  {
    id: "dec-msg-1",
    role: "agent",
    content:
      "Analisei as 3 estratégias de migração. Minha recomendação é **Schema-per-tenant**, mas antes de formalizar, preciso que você considere um ponto crítico:\n\nDois dos seus enterprise prospects (segundo a Priya) têm requisitos SOC 2 Type II. Schema-per-tenant **não atende** esse padrão — ele exige isolamento de banco, não apenas de schema.\n\nSe esses clientes forem bloqueadores, a decisão muda. Você sabe se os contratos estão condicionados ao SOC 2?",
    timestamp: 0,
  },
];

// ---------------------------------------------------------------------------
// Chat replies
// ---------------------------------------------------------------------------

export const decideReplies: Record<string, string> = {
  "opt-1-selected":
    "**Schema-per-tenant** formalizado. Decisão registrada em DEC-019.\n\nPróximos passos que o agente sugere:\n1. Marcus lidera o spike técnico esta semana\n2. Priya define os controles compensatórios para os clientes que precisam de SOC 2\n3. Revisão em 30 dias para avaliar se a opção ainda é viável ao atingir 50 tenants",
  "opt-2-selected":
    "**Database-per-tenant** formalizado. Decisão registrada em DEC-019.\n\nAtenção: o deadline de Q3 fica em risco. Recomendo comunicar isso ao CEO agora e negociar uma entrega parcial — os primeiros 2 enterprise em schema-per-tenant enquanto a automação de provisionamento é construída.",
  "opt-3-selected":
    "**Row-Level Security** formalizado. Decisão registrada em DEC-019.\n\nLembrete crítico: antes de ir para produção, a equipe precisa de um pentest focado em bypass de RLS. Sugiro contratar um especialista externo — o risco de falso negativo em testes internos é alto.",
  "soc2":
    "Para SOC 2 Type II, a opção mais segura é **Database-per-tenant**. Schema-per-tenant pode ser aceito com controles compensatórios documentados (auditoria de queries, alertas de cross-schema access), mas não é a escolha padrão dos auditores. Se o contrato exigir certificação antes do go-live, eu mudaria a recomendação.",
  "deadline":
    "Com o deadline de 18 Jul, a ordem de viabilidade é: RLS (2–3 sem) > Schema-per-tenant (3–4 sem) > Database-per-tenant (6–8 sem). Se a data não pode mover, RLS ou Schema são as únicas opções reais.",
  "score":
    "Scores ponderados finais:\n\n• Schema-per-tenant: **3.75** ← recomendado\n• RLS: **3.65**\n• Database-per-tenant: **3.25**\n\nA diferença entre Schema e RLS é pequena. O desempate é a maturidade operacional — a equipe já opera o schema atual, a curva de RLS em produção é menos conhecida.",
  default:
    "Posso detalhar qualquer critério, simular como os scores mudariam se você alterar os pesos, ou ajudar a redigir a comunicação da decisão para os stakeholders.",
};
