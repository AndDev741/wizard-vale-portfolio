import type { Lang } from "../i18n/ui";

/**
 * The patrons of the Guild Hall. Three figures, each one an age of the same
 * career, telling it in their own voice. Everything they say is drawn from the
 * curriculum: the numbers are real numbers, the deeds are real deeds.
 *
 * A deed is one line, and reads as one bullet. If it needs a paragraph, it is
 * two deeds.
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
  deeds: Array<Record<Lang, string>>;
  tech: string[];
  /** Where that age of the career happened, as a visitable place. */
  link: { url: string; label: Record<Lang, string> };
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
        en: "Maintained and built new features for web applications that were already in users' hands.",
        pt: "Mantive e construí funcionalidades novas para aplicações web que já estavam nas mãos de usuários.",
      },
      {
        en: "Integrated real-time APIs, where a slow answer shows up on somebody's screen right away.",
        pt: "Integrei APIs de tempo real, onde uma resposta lenta aparece na tela de alguém na hora.",
      },
      {
        en: "Worked inside a team for the first time: reviews, alignment, and the humility of a first job.",
        pt: "Trabalhei dentro de um time pela primeira vez: reviews, alinhamento, e a humildade de um primeiro emprego.",
      },
    ],
    tech: ["JavaScript", "React", "Real-time APIs"],
    link: {
      url: "https://www.telcomanager.com/en/",
      label: { en: "Visit Telcomanager", pt: "Visitar a Telcomanager" },
    },
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
        en: "For a real client's shop, led the requirements work face to face, modelled the domain, and built the REST API with Spring Security and JWT.",
        pt: "Para a loja de uma cliente real, conduzi o levantamento de requisitos cara a cara, modelei o domínio e construí a API REST com Spring Security e JWT.",
      },
      {
        en: "Shipped it whole: product photos in AWS S3, backend on Elastic Beanstalk, database on RDS, frontend on Vercel.",
        pt: "Entreguei inteiro: fotos dos produtos no AWS S3, backend no Elastic Beanstalk, banco no RDS, frontend na Vercel.",
      },
      {
        en: "On DreamBoards, an open source campaign, I designed the interface in Figma, built it with React and Tailwind, and locked the doors with JWT in HTTPOnly cookies.",
        pt: "No DreamBoards, uma campanha open source, desenhei a interface no Figma, construí com React e Tailwind, e tranquei as portas com JWT em cookies HTTPOnly.",
      },
      {
        en: "And I started Beyou, the long campaign: a gamified habit manager that trained me end to end, and never stopped growing since.",
        pt: "E comecei o Beyou, a campanha longa: um gestor de hábitos gamificado que me treinou de ponta a ponta, e nunca mais parou de crescer.",
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
    link: {
      url: "https://beyouweb.com",
      label: { en: "Open Beyou", pt: "Abrir o Beyou" },
    },
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
        en: "Moved the financial trade analytics layer from PostgreSQL to StarRocks. One materialized view fell from 1 hour to 2.1 seconds, 1,700 times faster, and stays flat around 14s however much data arrives. The endpoint's p50 fell from 11,394ms to 943ms, and throughput rose 556%.",
        pt: "Movi a camada de analytics de trades financeiros do PostgreSQL para o StarRocks. Uma materialized view caiu de 1 hora para 2,1 segundos, 1.700 vezes mais rápida, e fica estável em torno de 14s por mais dados que cheguem. O p50 do endpoint caiu de 11.394ms para 943ms, e o throughput subiu 556%.",
      },
      {
        en: "Set the platform's two-level caching standard, Caffeine and Redis with Redisson, cross-pod invalidation over pub/sub and ACL-scoped keys. p50 fell from 269ms to 91ms, p95 from 734ms to 240ms, throughput up 101%.",
        pt: "Defini o padrão de cache em dois níveis da plataforma, Caffeine e Redis com Redisson, invalidação entre pods por pub/sub e chaves com escopo de ACL. O p50 caiu de 269ms para 91ms, o p95 de 734ms para 240ms, throughput subiu 101%.",
      },
      {
        en: "Load-tested the critical services with k6 and caught an OOM at 92% heap before the first client ever went live. After the fixes: throughput up 681%, p95 down 91%.",
        pt: "Testei os serviços críticos sob carga com k6 e peguei um OOM a 92% de heap antes do primeiro cliente entrar no ar. Depois das correções: throughput subiu 681%, p95 caiu 91%.",
      },
      {
        en: "Built the reactive notification service: WebFlux, R2DBC and reactor-kafka drinking from AWS MSK, with priority processing, deduplication and real-time SSE delivery.",
        pt: "Construí o serviço reativo de notificações: WebFlux, R2DBC e reactor-kafka bebendo do AWS MSK, com processamento por prioridade, deduplicação e entrega SSE em tempo real.",
      },
      {
        en: "Built the GenTL Testing Engine from scratch, because 80% unit coverage was still letting regressions reach production: a Java service firing real HTTP calls at the microservices, 50 end-to-end scenarios over four environments, running in parallel on Java 21 virtual threads and streaming each step to its own UI. It caught cache-invalidation bugs on its first day.",
        pt: "Construí do zero o GenTL Testing Engine, porque 80% de cobertura unitária ainda deixava regressões chegarem à produção: um serviço Java que dispara chamadas HTTP reais contra os microsserviços, 50 cenários de ponta a ponta em quatro ambientes, rodando em paralelo com virtual threads do Java 21 e transmitindo cada passo para a própria UI. No primeiro dia pegou bugs de invalidação de cache.",
      },
      {
        en: "Put schema versioning on live production databases with Liquibase, Hibernate held in validate mode. Not one record lost.",
        pt: "Coloquei versionamento de schema em bancos de produção ao vivo com Liquibase, Hibernate travado em validate. Nenhum registro perdido.",
      },
      {
        en: "Migrated a legacy .NET service to Spring Boot with full backward compatibility through Spring profiles.",
        pt: "Migrei um serviço legado em .NET para Spring Boot com compatibilidade total para trás, via Spring profiles.",
      },
      {
        en: "Built a no-code ETL platform, React Flow and JSON Forms over Spring Boot and Apache Hop, so people who do not code ship their own data pipelines.",
        pt: "Construí uma plataforma de ETL sem código, React Flow e JSON Forms sobre Spring Boot e Apache Hop, para quem não programa entregar os próprios pipelines de dados.",
      },
      {
        en: "Manage AI agents on AWS Bedrock: full CRUD, dynamic aliases and versions, up to 10 models per agent.",
        pt: "Gerencio agentes de IA no AWS Bedrock: CRUD completo, aliases e versões dinâmicos, até 10 modelos por agente.",
      },
      {
        en: "Cut the credits and limits system across the whole platform with AOP, a dedicated persistence API and real-time feedback in the UI.",
        pt: "Cortei o sistema de créditos e limites pela plataforma inteira com AOP, uma API de persistência dedicada e feedback em tempo real na UI.",
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
    link: {
      url: "https://www.gentekai.com/",
      label: { en: "Visit Gentek.ai", pt: "Visitar a Gentek.ai" },
    },
  },
];

export function findNpc(key: string): ExperienceNpc | undefined {
  return experienceNpcs.find((n) => n.key === key);
}
