import type { Lang } from "../i18n/ui";
import library from "./generated/libraryTexts.json";

/**
 * The Library's shelves. Each topic gathers a few of the texts, and every text is
 * the real thing: fetched from the Beyou docs API at build time and split into
 * book pages by `scripts/fetch-library.mjs`. Personal writing can join later by
 * dropping more keys into a topic, or adding a topic of its own.
 */

export interface WritingTopic {
  key: string;
  title: Record<Lang, string>;
  blurb: Record<Lang, string>;
  /** Keys into the fetched texts, in reading order. */
  texts: string[];
}

export const writingTopics: WritingTopic[] = [
  {
    key: "infra",
    title: { en: "Running it myself", pt: "Rodando por conta própria" },
    blurb: {
      en: "Production is a 2012 laptop in my bedroom, reached through a tunnel with no ports open. These are the parts that took work: the failure model, and learning to see what the machine is doing.",
      pt: "A produção é um laptop de 2012 no meu quarto, alcançado por um túnel sem portas abertas. Estas são as partes que deram trabalho: o modelo de falha, e aprender a ver o que a máquina está fazendo.",
    },
    texts: ["self-hosting-beyou", "monitoring-layers"],
  },
  {
    key: "ai",
    title: { en: "Machines that help", pt: "Máquinas que ajudam" },
    blurb: {
      en: "An agent that operates real user data, standing on a chain of free-tier models so that one provider going down or throttling does not take the feature with it.",
      pt: "Um agente que opera dados reais de usuário, apoiado em uma cadeia de modelos de free tier, para que um provedor cair ou limitar não leve a funcionalidade embora.",
    },
    texts: ["ai-agent-free-tier-cascade"],
  },
  {
    key: "mobile",
    title: { en: "Two clients, one core", pt: "Dois clientes, um núcleo" },
    blurb: {
      en: "How the mobile app came about, and the monorepo that lets a web app and a native app share their state, their API layer and their translations as source.",
      pt: "Como o app mobile surgiu, e o monorepo que deixa um app web e um app nativo compartilharem estado, camada de API e traduções como código-fonte.",
    },
    texts: ["mobile-and-the-monorepo"],
  },
  {
    key: "speed",
    title: { en: "Making it fast", pt: "Deixando rápido" },
    blurb: {
      en: "Two cases where the fix was measured rather than guessed: a cache that cut response times by three quarters, and a query count that quietly grew with the data.",
      pt: "Dois casos em que a correção foi medida e não adivinhada: um cache que cortou três quartos do tempo de resposta, e uma contagem de queries que crescia silenciosamente com os dados.",
    },
    texts: ["adding-cache-system", "n+1-problem-solved"],
  },
  {
    key: "security",
    title: { en: "Before it goes out", pt: "Antes de ir para o ar" },
    blurb: {
      en: "What an audit found before the first deploy, and what it cost to close. Twenty six findings, on a codebase I thought was in decent shape.",
      pt: "O que uma auditoria encontrou antes do primeiro deploy, e o que custou fechar. Vinte e seis achados, em um código que eu julgava em bom estado.",
    },
    texts: ["security-audit-with-claude-code"],
  },
];

export interface LibraryLeaf {
  key: string;
  title: string;
  readingMinutes: number;
  pages: string[];
  coverEmoji: string | null;
  publishedAt: string | null;
  tags: string[];
}

type Generated = {
  fetchedAt: string | null;
  texts: Record<
    string,
    {
      key: string;
      publishedAt: string | null;
      coverEmoji: string | null;
      coverColor: string | null;
      tags: string[];
      en?: { title: string; readingMinutes: number; pages: string[] };
      pt?: { title: string; readingMinutes: number; pages: string[] };
    }
  >;
};

const generated = library as Generated;

/** Where the baked copy of the docs came from, and when. */
export const textsFetchedAt = generated.fetchedAt;

export function libraryLeaf(key: string, lang: Lang): LibraryLeaf | undefined {
  const entry = generated.texts[key];
  const localised = entry?.[lang] ?? entry?.en;
  if (!entry || !localised) return undefined;
  return {
    key: entry.key,
    title: localised.title,
    readingMinutes: localised.readingMinutes,
    pages: localised.pages,
    coverEmoji: entry.coverEmoji,
    publishedAt: entry.publishedAt,
    tags: entry.tags,
  };
}

export function findTopic(key: string): WritingTopic | undefined {
  return writingTopics.find((t) => t.key === key);
}

/** The docs page a text also lives on, for anyone who would rather read it there. */
export function docsUrl(lang: Lang, key: string): string {
  return `https://docs.beyouweb.com/${lang}/blog/${encodeURIComponent(key)}`;
}
