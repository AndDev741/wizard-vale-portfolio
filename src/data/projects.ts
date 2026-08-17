import type { Lang } from "../i18n/ui";

export const flagshipLinks = {
  app: "https://app.beyouweb.com",
  docs: "https://docs.beyouweb.com",
  source: "https://github.com/AndDev741/Beyou-backend-spring",
};

export interface ShelfItem {
  name: string;
  lang: string;
  year: string;
  url: string;
  blurb: Record<Lang, string>;
  relic?: boolean;
}

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
