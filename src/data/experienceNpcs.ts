import type { Lang } from "../i18n/ui";

/**
 * The patrons of the Guild Hall. Three figures, each one an age of the same
 * career, telling it in their own voice. Everything they say is drawn from the
 * curriculum: the numbers are real numbers, the deeds are real deeds.
 */

export interface ExperienceNpc {
  key: string;
  /** Character model in public/models, a KayKit adventurer. */
  model: string;
  name: Record<Lang, string>;
  role: Record<Lang, string>;
  /** One line under the name: what this age of the career actually was. */
  tagline: Record<Lang, string>;
  years: string;
  /** What they say when you sit down with them. */
  speech: Record<Lang, string>;
  deeds: Deed[];
  tech: string[];
}

/**
 * One deed. The lead is the claim; the points are the detail behind it, so a
 * deed carrying half a dozen facts reads as a list instead of a wall.
 */
export interface Deed {
  lead: Record<Lang, string>;
  points?: Array<Record<Lang, string>>;
}

export const experienceNpcs: ExperienceNpc[] = [
  {
    key: "apprentice",
    model: "Rogue",
    name: { en: "The Apprentice", pt: "O Aprendiz" },
    role: {
      en: "Front-End Developer, internship at Telcomanager",
      pt: "Desenvolvedor Front-End, estágio na Telcomanager",
    },
    tagline: {
      en: "My first job: an internship where my code met real users",
      pt: "Meu primeiro emprego: um estágio onde meu código encontrou usuários reais",
    },
    years: "2023 - 2024",
    speech: {
      en: "Sit, sit! I'm the newest one at this table. Telcomanager took me in as an intern, and it was the first time my code faced people who were not me. I learned fast that a feature is not done when it runs: it is done when someone else uses it without noticing anything.",
      pt: "Senta, senta! Sou o mais novo desta mesa. A Telcomanager me acolheu como estagiário, e foi a primeira vez que meu código encarou gente que não era eu. Aprendi rápido que uma funcionalidade não está pronta quando roda: está pronta quando outra pessoa usa sem perceber nada.",
    },
    deeds: [
      {
        lead: {
          en: "Maintained and built new features for web applications that were already in users' hands.",
          pt: "Mantive e construí funcionalidades novas para aplicações web que já estavam nas mãos de usuários.",
        },
      },
      {
        lead: {
          en: "Integrated real-time APIs, where a slow answer shows up on somebody's screen right away.",
          pt: "Integrei APIs de tempo real, onde uma resposta lenta aparece na tela de alguém na hora.",
        },
      },
      {
        lead: {
          en: "Worked inside a team for the first time: reviews, alignment, and the humility of a first job.",
          pt: "Trabalhei dentro de um time pela primeira vez: reviews, alinhamento, e a humildade de um primeiro emprego.",
        },
      },
    ],
    tech: ["JavaScript", "React", "Real-time APIs"],
  },
  {
    key: "soldier",
    model: "Knight",
    name: { en: "The Soldier", pt: "O Soldado" },
    role: {
      en: "Full-Stack Developer, freelance and own products",
      pt: "Desenvolvedor Full-Stack, freelance e produtos próprios",
    },
    tagline: {
      en: "Sharpening the craft on freelance work and products of my own",
      pt: "Afiando o ofício em freelances e em produtos meus",
    },
    years: "2024 - 2025",
    speech: {
      en: "After the first post I went out on my own. No guild at my back: I found the client, heard what they needed, modelled it, built it and put it on the internet myself. Three campaigns from that road are worth telling.",
      pt: "Depois do primeiro posto, saí por conta própria. Sem guilda nas costas: eu achava o cliente, ouvia o que precisava, modelava, construía e colocava na internet sozinho. Três campanhas dessa estrada valem a pena contar.",
    },
    deeds: [
      {
        lead: {
          en: "For a real client's shop, led the requirements work face to face, modelled the domain, and built the REST API with Spring Security and JWT.",
          pt: "Para a loja de uma cliente real, conduzi o levantamento de requisitos cara a cara, modelei o domínio e construí a API REST com Spring Security e JWT.",
        },
      },
      {
        lead: {
          en: "Shipped it whole: product photos in AWS S3, backend on Elastic Beanstalk, database on RDS, frontend on Vercel.",
          pt: "Entreguei inteiro: fotos dos produtos no AWS S3, backend no Elastic Beanstalk, banco no RDS, frontend na Vercel.",
        },
      },
      {
        lead: {
          en: "On DreamBoards, an open source campaign, I designed the interface in Figma, built it with React and Tailwind, and locked the doors with JWT in HTTPOnly cookies.",
          pt: "No DreamBoards, uma campanha open source, desenhei a interface no Figma, construí com React e Tailwind, e tranquei as portas com JWT em cookies HTTPOnly.",
        },
      },
      {
        lead: {
          en: "And I started Beyou, the long campaign: a gamified habit manager that trained me end to end, and never stopped growing since.",
          pt: "E comecei o Beyou, a campanha longa: um gestor de hábitos gamificado que me treinou de ponta a ponta, e nunca mais parou de crescer.",
        },
      },
    ],
    tech: [
      "Java",
      "Spring Boot",
      "React",
      "Tailwind",
      "AWS S3",
      "RDS",
      "Elastic Beanstalk",
      "Figma",
    ],
  },
  {
    key: "warrior",
    model: "Barbarian",
    name: { en: "The Warrior", pt: "O Guerreiro" },
    role: {
      en: "Software Engineer at Gentek.ai, Lisbon",
      pt: "Engenheiro de Software na Gentek.ai, Lisboa",
    },
    tagline: {
      en: "Day to day on a financial AI SaaS, on a stack with real weight",
      pt: "O dia a dia num SaaS de IA financeira, com uma stack de peso",
    },
    years: "2025 - now",
    speech: {
      en: "These days I fight in production, on an AI platform that banks depend on. Distributed systems, performance, quality: that is my front. Around here we do not tell war stories without numbers, so here are mine.",
      pt: "Hoje em dia eu luto em produção, numa plataforma de IA da qual bancos dependem. Sistemas distribuídos, performance, qualidade: essa é a minha frente. Por aqui não se conta história de guerra sem números, então aqui vão os meus.",
    },
    deeds: [
      {
        lead: {
          en: "Moved the financial trade analytics layer from PostgreSQL to StarRocks.",
          pt: "Movi a camada de analytics de trades financeiros do PostgreSQL para o StarRocks.",
        },
        points: [
          {
            en: "One materialized view fell from 1 hour to 2.1 seconds, 1,700 times faster.",
            pt: "Uma materialized view caiu de 1 hora para 2,1 segundos, 1.700 vezes mais rápida.",
          },
          {
            en: "It stays flat around 14s however much data arrives.",
            pt: "E fica estável em torno de 14s por mais dados que cheguem.",
          },
          {
            en: "The endpoint's p50 fell from 11,394ms to 943ms, and throughput rose 556%.",
            pt: "O p50 do endpoint caiu de 11.394ms para 943ms, e o throughput subiu 556%.",
          },
        ],
      },
      {
        lead: {
          en: "Set the platform's two-level caching standard.",
          pt: "Defini o padrão de cache em dois níveis da plataforma.",
        },
        points: [
          {
            en: "Caffeine and Redis with Redisson, cross-pod invalidation over pub/sub and ACL-scoped keys.",
            pt: "Caffeine e Redis com Redisson, invalidação entre pods por pub/sub e chaves com escopo de ACL.",
          },
          {
            en: "p50 fell from 269ms to 91ms, p95 from 734ms to 240ms, throughput up 101%.",
            pt: "O p50 caiu de 269ms para 91ms, o p95 de 734ms para 240ms, throughput subiu 101%.",
          },
        ],
      },
      {
        lead: {
          en: "Load-tested the critical services with k6 and caught an OOM at 92% heap before the first client ever went live.",
          pt: "Testei os serviços críticos sob carga com k6 e peguei um OOM a 92% de heap antes do primeiro cliente entrar no ar.",
        },
        points: [
          {
            en: "After the fixes: throughput up 681%, p95 down 91%.",
            pt: "Depois das correções: throughput subiu 681%, p95 caiu 91%.",
          },
        ],
      },
      {
        lead: {
          en: "Built the reactive notification service: WebFlux, R2DBC and reactor-kafka drinking from AWS MSK, with priority processing, deduplication and real-time SSE delivery.",
          pt: "Construí o serviço reativo de notificações: WebFlux, R2DBC e reactor-kafka bebendo do AWS MSK, com processamento por prioridade, deduplicação e entrega SSE em tempo real.",
        },
      },
      {
        lead: {
          en: "Built the GenTL Testing Engine from scratch: a standalone Java service that fires real HTTP calls at the platform's microservices and validates whole flows and contracts end to end. The team already had 80% unit coverage and was still hitting regressions in production, which is what isolated tests cannot catch.",
          pt: "Construí do zero o GenTL Testing Engine: um serviço Java independente que dispara chamadas HTTP reais contra os microsserviços da plataforma e valida fluxos e contratos de ponta a ponta. O time já tinha 80% de cobertura de testes unitários e ainda batia em regressões em produção, que é justamente o que teste isolado não pega.",
        },
        points: [
          {
            en: "Found real bugs on the first day of use: cache invalidations that the existing coverage could not see, because a unit test never touches the running system.",
            pt: "Achou bugs reais no primeiro dia de uso: invalidações de cache que a cobertura existente não via, porque teste unitário não toca no sistema rodando.",
          },
          {
            en: "Every test is a Spring @Component implementing TestDefinition, auto-discovered by a TestRegistry at startup. Drop a class into tests/ and it shows up in the UI, with nothing to register by hand.",
            pt: "Cada teste é um @Component Spring que implementa TestDefinition, descoberto sozinho pelo TestRegistry no arranque. Basta criar a classe em tests/ e ela aparece na UI, sem registro manual.",
          },
          {
            en: "Runs tests in parallel on Java 21 virtual threads and streams every step to the UI over SSE, with the SecurityContext propagated explicitly so the user's JWT survives the hop.",
            pt: "Roda os testes em paralelo com virtual threads do Java 21 e transmite cada passo para a UI por SSE, com o SecurityContext propagado explicitamente para o JWT do usuário sobreviver ao salto.",
          },
          {
            en: "50 end-to-end scenarios covering full lifecycles: agents, workspaces, pipelines, knowledge stores, chat streaming, document upload and processing.",
            pt: "50 cenários de ponta a ponta cobrindo ciclos de vida completos: agentes, workspaces, pipelines, knowledge stores, streaming de chat, upload e processamento de documentos.",
          },
          {
            en: "Four environments, local, dev, UAT and production, with production forced read-only so a destructive test cannot run there.",
            pt: "Quatro ambientes, local, dev, UAT e produção, com produção travada em somente-leitura para teste destrutivo não rodar lá.",
          },
          {
            en: "No side effects left behind: every test cleans up in try/finally, whether it passes or fails.",
            pt: "Nenhum rastro deixado atrás: todo teste limpa o que criou em try/finally, passe ou falhe.",
          },
          {
            en: "A UI the whole team uses: single or batch runs, step-by-step results, run history, test groups, and fixes recorded against the failures they close.",
            pt: "Uma UI que o time inteiro usa: execução individual ou em lote, resultado passo a passo, histórico de execuções, grupos de testes, e fixes registrados contra as falhas que fecham.",
          },
          {
            en: "Authentication through gentek-common-lib: Keycloak opaque token introspection, with a static token fallback for local work.",
            pt: "Autenticação pela gentek-common-lib: introspecção de token opaco no Keycloak, com fallback de token estático para trabalho local.",
          },
        ],
      },
      {
        lead: {
          en: "Put schema versioning on live production databases with Liquibase, Hibernate held in validate mode. Not one record lost.",
          pt: "Coloquei versionamento de schema em bancos de produção ao vivo com Liquibase, Hibernate travado em validate. Nenhum registro perdido.",
        },
      },
      {
        lead: {
          en: "Migrated a legacy .NET service to Spring Boot with full backward compatibility through Spring profiles.",
          pt: "Migrei um serviço legado em .NET para Spring Boot com compatibilidade total para trás, via Spring profiles.",
        },
      },
      {
        lead: {
          en: "Built a no-code ETL platform, React Flow and JSON Forms over Spring Boot and Apache Hop, so people who do not code ship their own data pipelines.",
          pt: "Construí uma plataforma de ETL sem código, React Flow e JSON Forms sobre Spring Boot e Apache Hop, para quem não programa entregar os próprios pipelines de dados.",
        },
      },
      {
        lead: {
          en: "Manage AI agents on AWS Bedrock: full CRUD, dynamic aliases and versions, up to 10 models per agent.",
          pt: "Gerencio agentes de IA no AWS Bedrock: CRUD completo, aliases e versões dinâmicos, até 10 modelos por agente.",
        },
      },
      {
        lead: {
          en: "Cut the credits and limits system across the whole platform with AOP, a dedicated persistence API and real-time feedback in the UI.",
          pt: "Cortei o sistema de créditos e limites pela plataforma inteira com AOP, uma API de persistência dedicada e feedback em tempo real na UI.",
        },
      },
    ],
    tech: [
      "Java",
      "Spring Boot",
      "WebFlux",
      "Virtual Threads",
      "StarRocks",
      "Redis",
      "Caffeine",
      "Kafka",
      "k6",
      "Liquibase",
      "Keycloak",
      "AWS Bedrock",
      "React",
    ],
  },
];

export function findNpc(key: string): ExperienceNpc | undefined {
  return experienceNpcs.find((n) => n.key === key);
}
