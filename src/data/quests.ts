import type { Lang } from "../i18n/ui";

export interface Quest {
  title: Record<Lang, string>;
  body: Record<Lang, string>;
  reward: Record<Lang, string>;
}

export const quests: Quest[] = [
  {
    title: {
      en: "The StarRocks migration",
      pt: "A migração para StarRocks",
    },
    body: {
      en: "Moved the EMIR/SFTR analytics layer from PostgreSQL to StarRocks with incremental materialized-view refresh.",
      pt: "Movi a camada de analytics EMIR/SFTR do PostgreSQL para o StarRocks com refresh incremental de materialized views.",
    },
    reward: {
      en: "Pipeline from 1 hour to 2.1s · endpoint p50 down 92%",
      pt: "Pipeline de 1 hora para 2,1s · p50 do endpoint caiu 92%",
    },
  },
  {
    title: {
      en: "The two-layer cache",
      pt: "O cache de duas camadas",
    },
    body: {
      en: "Distributed L1/L2 caching with Caffeine and Redis, cross-pod pub/sub invalidation and ACL-scoped keys.",
      pt: "Cache distribuído L1/L2 com Caffeine e Redis, invalidação cross-pod por pub/sub e chaves com escopo de ACL.",
    },
    reward: {
      en: "p95 down 67% · throughput up 101%",
      pt: "p95 caiu 67% · throughput subiu 101%",
    },
  },
  {
    title: {
      en: "The k6 load-testing campaign",
      pt: "A campanha de load testing com k6",
    },
    body: {
      en: "Caught an OOM at 92% heap and I/O bottlenecks before the first client go-live.",
      pt: "Peguei um OOM a 92% de heap e gargalos de I/O antes do primeiro go-live de cliente.",
    },
    reward: {
      en: "Throughput up 681% · p95 down 91% after optimisation",
      pt: "Throughput subiu 681% · p95 caiu 91% depois da otimização",
    },
  },
  {
    title: {
      en: "The contract-testing engine",
      pt: "O motor de testes de contrato",
    },
    body: {
      en: "Internal end-to-end engine in Java 21 with virtual threads, SSE and a multi-environment UI.",
      pt: "Motor interno de testes end-to-end em Java 21 com virtual threads, SSE e uma UI multi-ambiente.",
    },
    reward: {
      en: "Found day-one cache bugs that 80% unit coverage had missed",
      pt: "Achou bugs de cache no primeiro dia que 80% de cobertura unitária não viu",
    },
  },
  {
    title: {
      en: "Coverage from zero to eighty",
      pt: "Cobertura de zero a oitenta",
    },
    body: {
      en: "Took four critical microservices from 0% to 80% test coverage, integrated in CI/CD.",
      pt: "Levei quatro microsserviços críticos de 0% a 80% de cobertura de testes, integrada no CI/CD.",
    },
    reward: {
      en: "JUnit 5 · Mockito · Testcontainers",
      pt: "JUnit 5 · Mockito · Testcontainers",
    },
  },
  {
    title: {
      en: "The reactive notification service",
      pt: "O serviço reativo de notificações",
    },
    body: {
      en: "Fully non-blocking stack with WebFlux, R2DBC, reactor-kafka and AWS MSK.",
      pt: "Stack totalmente não bloqueante com WebFlux, R2DBC, reactor-kafka e AWS MSK.",
    },
    reward: {
      en: "Priority processing · deduplication · real-time SSE",
      pt: "Processamento por prioridade · deduplicação · SSE em tempo real",
    },
  },
];
