/**
 * Mock data for the Agente Tradutor — an AI translator teammate.
 *
 * Pattern: Communicate — the AI synthesizes and tailors information for the moment.
 * The agent notices what language pair is being used, adapts tone to context,
 * flags uncertain terms, and proactively surfaces decisions the human needs to make.
 */

export type Language = "pt-BR" | "en-US" | "es-ES" | "fr-FR";

export const LANGUAGE_LABELS: Record<Language, string> = {
  "pt-BR": "Português (BR)",
  "en-US": "English (US)",
  "es-ES": "Español",
  "fr-FR": "Français",
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  "pt-BR": "🇧🇷",
  "en-US": "🇺🇸",
  "es-ES": "🇪🇸",
  "fr-FR": "🇫🇷",
};

export type ToneType = "formal" | "informal" | "technical" | "marketing";

export const TONE_LABELS: Record<ToneType, string> = {
  formal: "Formal",
  informal: "Informal",
  technical: "Técnico",
  marketing: "Marketing",
};

export interface GlossaryEntry {
  sourceTerm: string;
  preferredTranslation: string;
  context: string;
  approved: boolean;
}

/** Company glossary — terms the AI should prefer when translating. */
export const mockGlossary: Record<string, GlossaryEntry[]> = {
  "pt-BR→en-US": [
    {
      sourceTerm: "conteúdo didático",
      preferredTranslation: "educational content",
      context: "Always use 'educational', not 'didactic' for English audiences",
      approved: true,
    },
    {
      sourceTerm: "obra",
      preferredTranslation: "title",
      context: "In publishing context: use 'title', not 'work' or 'book'",
      approved: true,
    },
    {
      sourceTerm: "aluno",
      preferredTranslation: "student",
      context: "Prefer 'student' over 'pupil' for Brazilian market",
      approved: true,
    },
    {
      sourceTerm: "adoção",
      preferredTranslation: "adoption",
      context: "Educational publishing: schools 'adopt' textbooks",
      approved: true,
    },
    {
      sourceTerm: "material de apoio",
      preferredTranslation: "supplementary materials",
      context: "Consistent with editorial catalog terminology",
      approved: true,
    },
    {
      sourceTerm: "segmento",
      preferredTranslation: "segment",
      context: "Market segment — direct translation works here",
      approved: false,
    },
  ],
  "en-US→pt-BR": [
    {
      sourceTerm: "learning outcomes",
      preferredTranslation: "objetivos de aprendizagem",
      context: "BNCC-aligned terminology for Brazilian market",
      approved: true,
    },
    {
      sourceTerm: "stakeholder",
      preferredTranslation: "parte interessada",
      context: "Official ABNT term; avoid 'stakeholder' in formal docs",
      approved: true,
    },
  ],
};

export interface TranslationSegment {
  id: string;
  sourceText: string;
  /** AI-proposed translation — presented to human for review */
  proposedTranslation: string;
  /** Human-confirmed final translation */
  confirmedTranslation?: string;
  status: "pending" | "translating" | "proposed" | "accepted" | "edited";
  /** 0–1 confidence score the AI reports */
  confidence: number;
  /** Glossary terms the AI applied */
  appliedGlossaryTerms: string[];
  /** Specific decisions the AI wants the human to weigh in on */
  flaggedDecisions: FlaggedDecision[];
}

export interface FlaggedDecision {
  id: string;
  term: string;
  options: string[];
  selectedOption?: string;
  reason: string;
}

/** Sample source document — a real editorial publishing context */
export const mockSourceDocument = {
  title: "Relatório de Desempenho Editorial — Q2 2026",
  context: "Internal report for English-speaking international partners",
  sourceLang: "pt-BR" as Language,
  targetLang: "en-US" as Language,
  tone: "formal" as ToneType,
};

export const mockSegments: TranslationSegment[] = [
  {
    id: "seg-1",
    sourceText:
      "A FTD Educação registrou crescimento de 12% na adoção de obras didáticas no segmento de Ensino Médio durante o segundo trimestre de 2026.",
    proposedTranslation:
      "FTD Educação recorded a 12% growth in the adoption of educational titles in the High School segment during the second quarter of 2026.",
    status: "proposed",
    confidence: 0.94,
    appliedGlossaryTerms: ["obra → title", "adoção → adoption"],
    flaggedDecisions: [
      {
        id: "dec-1a",
        term: "Ensino Médio",
        options: ["High School", "Secondary School", "Upper Secondary"],
        selectedOption: "High School",
        reason:
          "North American term (High School) chosen for US audience; UK partners may prefer 'Secondary School'.",
      },
    ],
  },
  {
    id: "seg-2",
    sourceText:
      "O material de apoio digital apresentou taxa de engajamento de 78% entre alunos das redes parceiras, superando a meta trimestral em 8 pontos percentuais.",
    proposedTranslation:
      "The digital supplementary materials showed an engagement rate of 78% among students from partner networks, exceeding the quarterly target by 8 percentage points.",
    status: "accepted",
    confirmedTranslation:
      "The digital supplementary materials showed an engagement rate of 78% among students from partner networks, exceeding the quarterly target by 8 percentage points.",
    confidence: 0.97,
    appliedGlossaryTerms: [
      "material de apoio → supplementary materials",
      "alunos → students",
    ],
    flaggedDecisions: [],
  },
  {
    id: "seg-3",
    sourceText:
      "Identificamos oportunidades de expansão nos segmentos de Educação Infantil e Anos Iniciais do Ensino Fundamental, onde a penetração atual ainda é abaixo da média do setor.",
    proposedTranslation:
      "We identified expansion opportunities in the Early Childhood Education and Early Primary School segments, where current market penetration is still below the sector average.",
    status: "proposed",
    confidence: 0.81,
    appliedGlossaryTerms: [],
    flaggedDecisions: [
      {
        id: "dec-3a",
        term: "Educação Infantil",
        options: [
          "Early Childhood Education",
          "Pre-K Education",
          "Kindergarten & Pre-K",
        ],
        reason:
          "Brazilian 'Educação Infantil' covers ages 0–5 (crèche + pré-escola). 'Early Childhood Education' is the broadest equivalent.",
      },
      {
        id: "dec-3b",
        term: "Anos Iniciais do Ensino Fundamental",
        options: [
          "Early Primary School",
          "Elementary School (Grades 1–5)",
          "Lower Primary",
        ],
        reason:
          "Covers Grades 1–5 in the Brazilian system. Recommend specifying grade range for international partners.",
      },
    ],
  },
  {
    id: "seg-4",
    sourceText:
      "A estratégia editorial para o segundo semestre prioriza o lançamento de coleções com foco em habilidades socioemocionais, alinhadas à Base Nacional Comum Curricular.",
    proposedTranslation:
      "The editorial strategy for the second half of the year prioritizes the launch of collections focused on socio-emotional skills, aligned with the Brazilian National Common Curriculum Framework (BNCC).",
    status: "proposed",
    confidence: 0.89,
    appliedGlossaryTerms: [],
    flaggedDecisions: [
      {
        id: "dec-4a",
        term: "habilidades socioemocionais",
        options: [
          "socio-emotional skills",
          "social-emotional learning (SEL)",
          "socio-emotional competencies",
        ],
        reason:
          "'Social-emotional learning (SEL)' is the dominant term in English-language EdTech. Using the acronym signals industry alignment.",
      },
    ],
  },
  {
    id: "seg-5",
    sourceText:
      "Recomendamos a revisão dos contratos de licenciamento de conteúdo digital com vencimento no terceiro trimestre para garantir continuidade das parcerias estratégicas.",
    proposedTranslation:
      "We recommend reviewing digital content licensing agreements expiring in the third quarter to ensure continuity of strategic partnerships.",
    status: "pending",
    confidence: 0,
    appliedGlossaryTerms: [],
    flaggedDecisions: [],
  },
];

/** Messages exchanged between the user and the AI translator teammate. */
export interface TranslatorChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  relatedSegmentId?: string;
  timestamp: number; // ms since session start (fake)
}

export const initialChatMessages: TranslatorChatMessage[] = [
  {
    id: "chat-1",
    role: "agent",
    content:
      "Olá! Carreguei o relatório e já apliquei o glossário aprovado da FTD. Encontrei **4 decisões terminológicas** que precisam da sua confirmação — principalmente nos segmentos educacionais brasileiros que não têm equivalente direto em inglês. Quero começar por aí?",
    timestamp: 0,
  },
  {
    id: "chat-2",
    role: "user",
    content: "Sim, pode ir.",
    timestamp: 8000,
  },
  {
    id: "chat-3",
    role: "agent",
    content:
      "No **segmento 1**, traduzi 'Ensino Médio' como *High School* — a escolha mais natural para o público americano. Se os destinatários incluírem parceiros britânicos, *Secondary School* seria mais preciso. Como você quer tratar isso?",
    relatedSegmentId: "seg-1",
    timestamp: 9500,
  },
];

/** Canned agent replies for simulating conversation flow */
export const agentReplies: Record<string, string> = {
  "seg-1-accepted":
    "Ótimo. 'High School' confirmado. O segmento 1 está aprovado. Passando para o segmento 3, que tem duas decisões — 'Educação Infantil' e 'Anos Iniciais'. Você prefere especificar o intervalo de anos (Grades 1–5) para os parceiros internacionais?",
  "seg-3-accepted":
    "Perfeito. Vou manter 'Early Childhood Education' e 'Elementary School (Grades 1–5)' para deixar mais claro para quem não conhece o sistema brasileiro. Segmento 3 aprovado.",
  "seg-4-accepted":
    "Entendido. Usando 'social-emotional learning (SEL)' — é o termo que os parceiros EdTech vão reconhecer imediatamente. Segmento 4 aprovado. Só falta o segmento 5, que ainda está na fila. Pode traduzir agora?",
  "seg-5-translate":
    "Traduzindo o segmento 5... Pronto. 'Recomendamos a revisão dos contratos de licenciamento...' ficou bem direto em inglês — sem termos ambíguos aqui. Confiança alta. Posso marcar como aprovado?",
  default:
    "Entendido. Pode me dar mais contexto ou posso continuar com os próximos segmentos.",
};
