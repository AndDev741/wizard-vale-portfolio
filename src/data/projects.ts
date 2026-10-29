import type { Lang } from "../i18n/ui";

export const flagshipLinks = {
  app: "https://app.beyouweb.com",
  docs: "https://docs.beyouweb.com",
  play: "https://play.google.com/store/apps/details?id=com.beyou.mobile",
  source: "https://github.com/AndDev741/Beyou-backend-spring",
};

export interface ShelfItem {
  name: string;
  lang: string;
  year: string;
  url: string;
  /** Where it runs, when it runs somewhere a visitor can at least see. */
  live?: string;
  blurb: Record<Lang, string>;
  relic?: boolean;
}

/** Newer work that runs on the same node as Beyou, and the repository that runs it. */
export const beside: ShelfItem[] = [
  {
    name: "beConscient",
    lang: "Kotlin, Go, Java",
    year: "2026",
    url: "https://github.com/AndDev741/beConscient",
    live: "https://beconscient.beyouweb.com",
    blurb: {
      en: "Self-hosted screen time for the phone and the desktop, with the hours awake away from screens as the number it puts first.",
      pt: "Tempo de tela self-hosted para o celular e o desktop, com as horas acordado longe das telas como o número que ela mostra primeiro.",
    },
  },
  {
    name: "beFree",
    lang: "Java",
    year: "2026",
    url: "https://github.com/AndDev741/beFree",
    live: "https://befree.beyouweb.com",
    blurb: {
      en: "A finance tracker with a web app and a WhatsApp assistant that reads text, photos and statements.",
      pt: "Um controle financeiro com app web e um assistente no WhatsApp que lê texto, fotos e extratos.",
    },
  },
  {
    name: "be-infra",
    lang: "Kubernetes",
    year: "2026",
    url: "https://github.com/AndDev741/be-infra",
    blurb: {
      en: "GitOps for the k3s node that runs Beyou and everything beside it, with Flux, SOPS and a shared Postgres.",
      pt: "GitOps do nó k3s que roda o Beyou e tudo ao lado dele, com Flux, SOPS e um Postgres compartilhado.",
    },
  },
];

export const shelf: ShelfItem[] = [
  {
    name: "BitData",
    lang: "Java",
    year: "2025",
    url: "https://github.com/AndDev741/BitData",
    blurb: {
      en: "Reactive Spring Boot service that drinks from the Bitcoin blockchain WebSocket into MongoDB through a queue.",
      pt: "Serviço reativo em Spring Boot que bebe do WebSocket da blockchain do Bitcoin para o MongoDB através de uma fila.",
    },
  },
  {
    name: "Rinha de Backend 2026",
    lang: "Java",
    year: "2026",
    url: "https://github.com/AndDev741/rinha-de-backend-2026-java",
    blurb: {
      en: "Fraud-detection API for card transactions using vector search, built for the Rinha de Backend challenge.",
      pt: "API de detecção de fraude em transações de cartão usando busca vetorial, feita para a Rinha de Backend.",
    },
  },
  {
    name: "Library of Babel",
    lang: "Java",
    year: "2024",
    url: "https://github.com/AndDev741/LibraryOfBabelAlgorithm",
    blurb: {
      en: "The insane and simple algorithm that generates infinite books.",
      pt: "O algoritmo insano e simples que gera livros infinitos.",
    },
  },
  {
    name: "minimalist-markdown",
    lang: "TypeScript",
    year: "2026",
    url: "https://github.com/AndDev741/minimalist-markdown",
    blurb: {
      en: "A tiny markdown editor and renderer for Linux.",
      pt: "Um editor e renderizador de markdown minúsculo para Linux.",
    },
  },
  {
    name: "minimalist-pomodoro",
    lang: "TypeScript",
    year: "2026",
    url: "https://github.com/AndDev741/minimalist-pomodoro",
    blurb: {
      en: "A small desktop pomodoro to keep focus honest.",
      pt: "Um pomodoro de desktop pequeno para manter o foco honesto.",
    },
  },
  {
    name: "Beyou HabitTracker",
    lang: "JavaScript",
    year: "2023",
    url: "https://github.com/AndDev741/BeYou-HabitTracker",
    relic: true,
    blurb: {
      en: "The ancestor. Beyou's first form, kept as a relic.",
      pt: "O ancestral. A primeira forma do Beyou, guardada como relíquia.",
    },
  },
];
