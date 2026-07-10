/**
 * Mock data for the Agente Notice — a mindful AI senior developer.
 *
 * Pattern: Notice — detect what isn't being tracked yet.
 * The agent doesn't wait for a bug report or a postmortem. It watches the
 * codebase continuously, surfaces patterns the team hasn't named yet, and
 * brings them to attention before they become incidents.
 *
 * It notices the things that fall through the cracks:
 * untested paths, growing complexity, silent failures, stale dependencies,
 * inconsistent patterns that will confuse the next developer.
 */

export type NoticeSeverity = "critical" | "warning" | "info";
export type NoticeCategory =
  | "security"
  | "testing"
  | "complexity"
  | "performance"
  | "consistency"
  | "dependency"
  | "observability";

export type NoticeStatus = "new" | "acknowledged" | "resolved" | "dismissed";

export interface CodeSignal {
  id: string;
  file: string;
  line?: number;
  snippet?: string;
  description: string;
}

export interface NoticeItem {
  id: string;
  severity: NoticeSeverity;
  category: NoticeCategory;
  title: string;
  body: string;
  status: NoticeStatus;
  /** How many times this pattern appeared */
  occurrences: number;
  signals: CodeSignal[];
  /** What the agent recommends */
  recommendation: string;
  /** Effort to fix */
  effortLabel: string;
  detectedMinutesAgo: number;
}

export interface ScanModule {
  id: string;
  name: string;
  path: string;
  /** 0–100 health score */
  health: number;
  issues: number;
  linesOfCode: number;
  testCoverage: number; // 0–100
  lastChanged: string; // relative label
}

export interface NoticeChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Scan modules — the codebase map
// ---------------------------------------------------------------------------

export const mockModules: ScanModule[] = [
  {
    id: "mod-1",
    name: "auth",
    path: "src/modules/auth",
    health: 42,
    issues: 4,
    linesOfCode: 1840,
    testCoverage: 31,
    lastChanged: "hoje",
  },
  {
    id: "mod-2",
    name: "export",
    path: "src/modules/export",
    health: 28,
    issues: 6,
    linesOfCode: 2310,
    testCoverage: 18,
    lastChanged: "ontem",
  },
  {
    id: "mod-3",
    name: "billing",
    path: "src/modules/billing",
    health: 71,
    issues: 2,
    linesOfCode: 980,
    testCoverage: 68,
    lastChanged: "3 dias atrás",
  },
  {
    id: "mod-4",
    name: "notifications",
    path: "src/modules/notifications",
    health: 85,
    issues: 1,
    linesOfCode: 540,
    testCoverage: 77,
    lastChanged: "1 sem atrás",
  },
  {
    id: "mod-5",
    name: "api-gateway",
    path: "src/modules/api-gateway",
    health: 55,
    issues: 3,
    linesOfCode: 1620,
    testCoverage: 44,
    lastChanged: "2 dias atrás",
  },
  {
    id: "mod-6",
    name: "tenant",
    path: "src/modules/tenant",
    health: 38,
    issues: 5,
    linesOfCode: 1290,
    testCoverage: 22,
    lastChanged: "hoje",
  },
];

// ---------------------------------------------------------------------------
// Noticed items
// ---------------------------------------------------------------------------

export const mockNotices: NoticeItem[] = [
  {
    id: "notice-1",
    severity: "critical",
    category: "security",
    title: "Tokens de sessão logados em texto plano",
    body:
      "Encontrei 3 chamadas a `console.log` e `logger.debug` que expõem `session.token` e `req.headers.authorization` em texto plano. Em produção, esses logs são indexados pelo Datadog e ficam acessíveis a qualquer membro do time com acesso ao dashboard — incluindo pessoas sem permissão para ver dados de autenticação.\n\nIsso não é um bug que vai aparecer em code review. Logs aparecem corretos localmente. O problema só é visível quando você rastreia o fluxo até o destino do log em produção.",
    status: "new",
    occurrences: 3,
    effortLabel: "1–2h",
    detectedMinutesAgo: 8,
    recommendation:
      "Substituir por `logger.debug('[auth] session created', { userId })` — logar apenas o identificador, nunca o token. Considerar um lint rule customizado que bloqueia `console.log` com padrões de token.",
    signals: [
      {
        id: "sig-1a",
        file: "src/modules/auth/session.service.ts",
        line: 47,
        snippet: "console.log('session created', session.token)",
        description: "Token completo exposto no log de criação de sessão",
      },
      {
        id: "sig-1b",
        file: "src/modules/auth/middleware.ts",
        line: 112,
        snippet: "logger.debug('auth header', req.headers.authorization)",
        description: "Header de autorização completo logado no middleware",
      },
      {
        id: "sig-1c",
        file: "src/modules/auth/refresh.ts",
        line: 29,
        snippet: "console.log('refreshed token:', newToken)",
        description: "Token refreshado exposto no fluxo de renovação",
      },
    ],
  },
  {
    id: "notice-2",
    severity: "critical",
    category: "testing",
    title: "Módulo de export com 18% de cobertura — onde o INC-2847 vive",
    body:
      "O módulo `export` teve o incidente INC-2847 na semana passada (export worker com 500s). A cobertura de testes atual é de 18%. Isso significa que o código que causou o incidente — e o código ao redor — ainda não tem testes.\n\nO padrão que eu noto: toda vez que o export tem um bug, a equipe investiga, corrige, e volta ao normal sem adicionar testes de regressão. O próximo bug será igualmente surpresa.",
    status: "new",
    occurrences: 1,
    effortLabel: "1–2 dias",
    detectedMinutesAgo: 15,
    recommendation:
      "Antes de qualquer nova feature no módulo export: escrever testes de regressão para o fluxo OOM que causou o INC-2847. Cobertura mínima de 60% como critério de merge para PRs nesse módulo.",
    signals: [
      {
        id: "sig-2a",
        file: "src/modules/export/worker.ts",
        description: "Arquivo central do incidente — zero testes unitários",
      },
      {
        id: "sig-2b",
        file: "src/modules/export/pdf.generator.ts",
        line: 88,
        snippet: "// TODO: add error handling",
        description: "TODO de tratamento de erro deixado sem testes há 4 meses",
      },
    ],
  },
  {
    id: "notice-3",
    severity: "warning",
    category: "complexity",
    title: "Função `processExportJob` com complexidade ciclomática 24",
    body:
      "A função `processExportJob` em `worker.ts` tem complexidade ciclomática 24 — o limiar comum para 'difícil de entender e testar' é 10. Ela cresceu organicamente ao longo de 8 meses sem refatoração.\n\nFunções com CC > 20 têm correlação estatística alta com bugs. Não é opinião — é o motivo pelo qual a função foi difícil de depurar durante o INC-2847.",
    status: "new",
    occurrences: 1,
    effortLabel: "4–6h",
    detectedMinutesAgo: 22,
    recommendation:
      "Extrair em 3–4 funções menores: `validateJobParams`, `allocateWorkerMemory`, `executeExportPipeline`, `handleExportFailure`. Cada uma testável de forma independente.",
    signals: [
      {
        id: "sig-3a",
        file: "src/modules/export/worker.ts",
        line: 134,
        snippet: "async function processExportJob(job: ExportJob) {",
        description: "302 linhas, 24 branches, 6 níveis de indentação máxima",
      },
    ],
  },
  {
    id: "notice-4",
    severity: "warning",
    category: "observability",
    title: "Nenhum trace distribuído no fluxo de autenticação",
    body:
      "O módulo `auth` não tem spans de OpenTelemetry. Quando um usuário reporta 'login lento', a equipe não consegue ver onde o tempo está sendo gasto — é no JWT, no banco, no Redis, na rede?\n\nIsso foi mencionado no postmortem do Q2 e ainda não foi endereçado. A ausência de observabilidade é silenciosa até o momento em que você precisa dela urgentemente.",
    status: "acknowledged",
    occurrences: 1,
    effortLabel: "3–4h",
    detectedMinutesAgo: 45,
    recommendation:
      "Adicionar `tracer.startActiveSpan` nos 3 pontos críticos: validação de token, consulta ao banco de usuários e geração de sessão. Usar o SDK do OTel já instalado no projeto.",
    signals: [
      {
        id: "sig-4a",
        file: "src/modules/auth/session.service.ts",
        description: "Arquivo crítico sem nenhuma instrumentação de tracing",
      },
      {
        id: "sig-4b",
        file: "src/modules/auth/token.validator.ts",
        description: "Validação de JWT sem span — impossível medir latência isolada",
      },
    ],
  },
  {
    id: "notice-5",
    severity: "info",
    category: "consistency",
    title: "3 padrões diferentes de tratamento de erro no mesmo módulo",
    body:
      "No módulo `api-gateway`, encontrei 3 estilos coexistindo: `try/catch` com `throw`, `Result<T, E>` pattern, e retorno de `null` sem logging. Quem entra no código pela primeira vez não sabe qual padrão seguir — e esse tipo de inconsistência é onde bugs de silêncio nascem (o `null` retornado sem log que ninguém vê).",
    status: "new",
    occurrences: 14,
    effortLabel: "2–3h",
    detectedMinutesAgo: 62,
    recommendation:
      "Definir e documentar um único padrão. Para esse codebase, `throw` com classes de erro tipadas é o mais alinhado com o resto do projeto. Criar um ADR (Architecture Decision Record) para formalizar.",
    signals: [
      {
        id: "sig-5a",
        file: "src/modules/api-gateway/router.ts",
        line: 67,
        snippet: "return null; // caller handles",
        description: "Retorno silencioso de null sem log nem tipo de erro",
      },
      {
        id: "sig-5b",
        file: "src/modules/api-gateway/proxy.ts",
        line: 203,
        snippet: "return Result.err(new ProxyError(e))",
        description: "Result pattern — inconsistente com o resto do módulo",
      },
    ],
  },
  {
    id: "notice-6",
    severity: "info",
    category: "dependency",
    title: "4 dependências com vulnerabilidades conhecidas (npm audit)",
    body:
      "O `npm audit` tem 4 pacotes com vulnerabilidades — 1 high, 3 moderate. Nenhuma é crítica agora, mas o `jsonwebtoken` (high) tem uma CVE de bypass de verificação de assinatura em versões < 9.0.0. O projeto usa 8.5.1.\n\nIsso não vai explodir amanhã. Mas está no radar de qualquer pentester.",
    status: "new",
    occurrences: 4,
    effortLabel: "30min–2h",
    detectedMinutesAgo: 90,
    recommendation:
      "Atualizar `jsonwebtoken` para ^9.0.0 primeiro — é o único high. Testar o fluxo de auth após a atualização. Os 3 moderates podem ser tratados no próximo ciclo de manutenção.",
    signals: [
      {
        id: "sig-6a",
        file: "package.json",
        snippet: '"jsonwebtoken": "8.5.1"',
        description: "CVE-2022-23529 — bypass de verificação de assinatura JWT",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Scan summary
// ---------------------------------------------------------------------------

export const mockScanSummary = {
  lastScannedMinutesAgo: 8,
  filesScanned: 847,
  issuesFound: mockNotices.length,
  criticalCount: mockNotices.filter((n) => n.severity === "critical").length,
  warningCount: mockNotices.filter((n) => n.severity === "warning").length,
  infoCount: mockNotices.filter((n) => n.severity === "info").length,
  overallHealth: Math.round(
    mockModules.reduce((s, m) => s + m.health, 0) / mockModules.length,
  ),
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const initialNoticeMessages: NoticeChatMessage[] = [
  {
    id: "notice-msg-1",
    role: "agent",
    content:
      "Escaneei **847 arquivos** e encontrei 6 itens que a equipe ainda não está rastreando. O mais urgente: tokens de sessão sendo logados em texto plano — isso está em produção agora.\n\nNão trouxe esses itens por alarme. Trouxe porque nenhum deles vai aparecer numa code review normal. São os padrões que ficam invisíveis até virarem postmortem.",
    timestamp: 0,
  },
];

export const noticeReplies: Record<string, string> = {
  "notice-1-acknowledged":
    "Certo. O risco de token em log é assimétrico — fácil de corrigir, caro se explorado. Recomendo tratar antes de qualquer outro item dessa lista. Posso gerar o snippet de correção para cada um dos 3 arquivos se quiser.",
  "notice-2-acknowledged":
    "Reconhecer o padrão é o primeiro passo. O que eu observo em equipes saudáveis: testes de regressão são escritos **antes** de fechar o postmortem, não depois. Enquanto o contexto do bug ainda está fresco. Quer que eu esboce os casos de teste para o fluxo OOM?",
  "notice-3-acknowledged":
    "Complexidade ciclomática é um dos poucos indicadores que tem correlação empírica com taxa de bugs. A refatoração sugerida não muda o comportamento — só torna cada parte testável independentemente. Bom ponto de entrada para um PR focado.",
  "notice-4-acknowledged":
    "Observabilidade é um investimento que parece opcional até o momento em que você está debugando um incidente às 2h da manhã sem traces. O módulo de auth é o mais crítico — 3 spans cobrem 80% do valor.",
  "notice-5-acknowledged":
    "Inconsistência de padrões é o tipo de problema que ninguém prioriza porque não quebra nada agora. Mas é onde novos membros da equipe introduzem bugs — eles copiam o padrão errado sem saber que é errado. Um ADR resolve isso definitivamente.",
  "notice-6-acknowledged":
    "O jsonwebtoken é o único que eu priorizaria agora. Os outros 3 moderates podem esperar o próximo ciclo de manutenção. A atualização é geralmente não-breaking dentro do major — mas teste o fluxo de login e refresh antes de mergear.",
  security:
    "Os itens de segurança que encontrei são: (1) tokens em log em texto plano — critical, e (2) jsonwebtoken desatualizado com CVE conhecida — info. O item 1 é o mais urgente porque já está em produção e é imediatamente explorável por quem tem acesso aos logs.",
  coverage:
    "Cobertura por módulo:\n\n• export: **18%** ← crítico\n• tenant: **22%** ← preocupante\n• auth: **31%** ← abaixo do ideal\n• api-gateway: **44%**\n• billing: **68%**\n• notifications: **77%** ← saudável\n\nOs 3 primeiros são onde os próximos incidentes provavelmente vão acontecer.",
  health:
    "Saúde geral do codebase: **55/100**. Os módulos mais críticos são `export` (28) e `tenant` (38) — os dois com mudanças hoje e os dois com cobertura abaixo de 25%. Combinação clássica de alto risco.",
  default:
    "Continuo monitorando. Se quiser que eu aprofunde em qualquer módulo específico, investigue um padrão, ou gere um relatório para compartilhar com a equipe, é só pedir.",
  howworks:
    "Observo continuamente: complexidade ciclomática, padrões de log, cobertura de testes, deps com CVE, inconsistências de padrão, e ausência de instrumentação. Não espero uma pergunta — notifico quando algo cruza um limiar que importa. O objetivo é trazer à superfície o que cai entre as rachaduras da atenção humana.",
};
