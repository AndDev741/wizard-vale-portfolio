import type { Lang } from "../i18n/ui";

export interface Post {
  key: string;
  title: Record<Lang, string>;
}

/** Newest first. Every post is published on docs.beyouweb.com in both languages. */
export const posts: Post[] = [
  {
    key: "self-hosting-beyou",
    title: {
      en: "Self-Hosting Beyou: The Challenges and the Nice Things About Trying It",
      pt: "Self-Host do Beyou: Os Desafios e as Coisas Boas de Tentar",
    },
  },
  {
    key: "monitoring-layers",
    title: {
      en: "Monitoring: The Layers I Built to Prepare Beyou for Production",
      pt: "Monitoramento: As Camadas Que Construí para Preparar o Beyou para Produção",
    },
  },
  {
    key: "ai-agent-free-tier-cascade",
    title: {
      en: "The Beyou AI Agent: Building a Resilient LLM Cascade on Free Tiers",
      pt: "O Agente de IA do Beyou: Construindo uma Cascata Resiliente de LLMs em Free Tiers",
    },
  },
  {
    key: "mobile-and-the-monorepo",
    title: {
      en: "How the Beyou Mobile App Was Born, and the Monorepo Behind It",
      pt: "Como Nasceu o App Mobile do Beyou, e o Monorepo Por Trás Dele",
    },
  },
  {
    key: "security-audit-with-claude-code",
    title: {
      en: "How I Used Claude Code to Find 26 Security Vulnerabilities Before Deploying to Production",
      pt: "Como Usei o Claude Code para Encontrar 26 Vulnerabilidades de Segurança Antes do Deploy em Produção",
    },
  },
  {
    key: "adding-cache-system",
    title: {
      en: "Adding Cache to Beyou: 75% Faster with Caffeine",
      pt: "Adicionando Cache ao Beyou: 75% Mais Rápido com Caffeine",
    },
  },
  {
    key: "n+1-problem-solved",
    title: {
      en: "How I Find and Solve N+1 Query Problems in Beyou",
      pt: "Como Eu Identifiquei e Resolvi o Problema N+1 no Beyou",
    },
  },
];

export function postUrl(lang: Lang, key: string): string {
  return `https://docs.beyouweb.com/${lang}/blog/${encodeURIComponent(key)}`;
}
