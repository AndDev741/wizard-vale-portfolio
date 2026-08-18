import type { Lang } from "../i18n/ui";

export interface ProjectLink {
  label: Record<Lang, string>;
  url: string;
}

export interface ProjectDetail {
  key: string;
  name: string;
  /** One line, shown under the name in the dialog. */
  tagline: Record<Lang, string>;
  /** A paragraph of what it is and why it exists. */
  blurb: Record<Lang, string>;
  /** The interesting parts, one claim each. */
  facts: Array<Record<Lang, string>>;
  tech: string[];
  years: string;
  links: ProjectLink[];
}

const source: Record<Lang, string> = { en: "Source", pt: "Código" };

export const projectDetail: ProjectDetail[] = [
  {
    key: "beyou",
    name: "Beyou",
    tagline: {
      en: "A free habit and routine manager, running as a real production",
      pt: "Um gestor de hábitos e rotinas gratuito, rodando como produção de verdade",
    },
    blurb: {
      en: "Beyou is the project where I build everything end to end. It started in 2023 as a habit tracker and grew into a product with a web app, a native Android app, an AI agent and a full monitoring stack. It is served from the laptop I learned to code on, and it costs nothing to run.",
      pt: "O Beyou é o projeto onde construo tudo de ponta a ponta. Começou em 2023 como um rastreador de hábitos e cresceu para um produto com app web, app Android nativo, um agente de IA e uma stack completa de monitoramento. É servido do laptop em que aprendi a programar, e custa zero para manter.",
    },
    facts: [
      {
        en: "One TypeScript core, two clients: React on the web and React Native on Android, sharing state, API layer, validation and i18n as source in a monorepo. One edit hot-reloads both apps.",
        pt: "Um núcleo TypeScript, dois clientes: React na web e React Native no Android, compartilhando estado, camada de API, validação e i18n como código-fonte em um monorepo. Uma edição recarrega os dois apps.",
      },
      {
        en: "An AI agent with 33 tools operates the user's real data over SSE, on a fallback chain of free-tier LLMs. When one provider fails or throttles, the next takes the call. Running cost so far: zero.",
        pt: "Um agente de IA com 33 ferramentas opera os dados reais do usuário sobre SSE, em uma cadeia de fallback de LLMs de free tier. Quando um provedor falha ou limita, o próximo assume. Custo até agora: zero.",
      },
      {
        en: "Self-hosted behind a Cloudflare Tunnel with zero open ports on the router. Images publish to GHCR and Watchtower deploys them, with a Playwright suite gating every release.",
        pt: "Self-hosted atrás de um Cloudflare Tunnel com zero portas abertas no roteador. As imagens publicam no GHCR e o Watchtower faz o deploy, com uma suíte Playwright barrando cada release.",
      },
      {
        en: "Watched by Prometheus, Grafana, Loki and a self-hosted GlitchTip, with uptime and heartbeat monitors. The same stack runs in development, so nothing about production is a surprise.",
        pt: "Vigiado por Prometheus, Grafana, Loki e um GlitchTip self-hosted, com monitores de uptime e heartbeat. A mesma stack roda em desenvolvimento, então nada de produção é surpresa.",
      },
    ],
    tech: ["Spring Boot", "Java", "PostgreSQL", "React", "React Native", "Spring AI", "Docker", "Grafana"],
    years: "2023 - now",
    links: [
      { label: { en: "Live app", pt: "App ao vivo" }, url: "https://app.beyouweb.com" },
      { label: { en: "Engineering docs", pt: "Docs de engenharia" }, url: "https://docs.beyouweb.com" },
      { label: source, url: "https://github.com/AndDev741/Beyou-backend-spring" },
    ],
  },
  {
    key: "bitdata",
    name: "BitData",
    tagline: {
      en: "Drinking from the Bitcoin blockchain, one transaction at a time",
      pt: "Bebendo da blockchain do Bitcoin, uma transação por vez",
    },
    blurb: {
      en: "A reactive Spring Boot service that listens to the Bitcoin blockchain WebSocket and stores every transaction it has not seen before. I built it to learn what a fully non-blocking pipeline feels like when the source never stops sending.",
      pt: "Um serviço reativo em Spring Boot que escuta o WebSocket da blockchain do Bitcoin e guarda toda transação que ainda não viu. Construí para aprender como é um pipeline totalmente não bloqueante quando a fonte nunca para de enviar.",
    },
    facts: [
      {
        en: "The consumer never blocks. A queue sits between the socket and the database so a burst of transactions cannot push back on the connection.",
        pt: "O consumidor nunca bloqueia. Uma fila fica entre o socket e o banco para que uma rajada de transações não empurre de volta na conexão.",
      },
      {
        en: "MongoDB stores the documents, which suits a feed whose shape is decided by somebody else.",
        pt: "O MongoDB guarda os documentos, o que serve bem para um feed cujo formato é decidido por outra pessoa.",
      },
    ],
    tech: ["Java", "Spring WebFlux", "MongoDB", "WebSocket"],
    years: "2025",
    links: [{ label: source, url: "https://github.com/AndDev741/BitData" }],
  },
  {
    key: "rinha",
    name: "Rinha de Backend 2026",
    tagline: {
      en: "Catching card fraud with vector search, under contest rules",
      pt: "Pegando fraude de cartão com busca vetorial, sob as regras do desafio",
    },
    blurb: {
      en: "My entry for the Rinha de Backend, a Brazilian contest where everyone builds the same API and the ranking is decided by how it holds up under load. Mine detects fraud in card transactions using vector search, so a suspicious transaction is found by how close it sits to known patterns.",
      pt: "Minha entrada na Rinha de Backend, o desafio brasileiro em que todos constroem a mesma API e o ranking é decidido por como ela aguenta carga. A minha detecta fraude em transações de cartão usando busca vetorial, então uma transação suspeita é achada pela proximidade com padrões conhecidos.",
    },
    facts: [
      {
        en: "Fraud is a similarity question here, not a rules engine: each transaction becomes a vector and the neighbours decide.",
        pt: "Fraude aqui é uma questão de similaridade, não um motor de regras: cada transação vira um vetor e os vizinhos decidem.",
      },
      {
        en: "The contest scores latency under load, so every allocation on the hot path had to justify itself.",
        pt: "O desafio pontua latência sob carga, então cada alocação no caminho quente tinha que se justificar.",
      },
    ],
    tech: ["Java", "Vector search", "Docker"],
    years: "2026",
    links: [{ label: source, url: "https://github.com/AndDev741/rinha-de-backend-2026-java" }],
  },
  {
    key: "eshop",
    name: "Duda Morais eShop",
    tagline: {
      en: "A storefront built for someone to put their things up for sale",
      pt: "Uma loja feita para alguém colocar as coisas dela à venda",
    },
    blurb: {
      en: "A small ecommerce built end to end for a real catalogue: a React storefront on one side, a Spring Boot API behind JWT auth on the other, and the product photos kept in S3 instead of the database.",
      pt: "Um ecommerce pequeno construído de ponta a ponta para um catálogo real: uma loja em React de um lado, uma API Spring Boot atrás de autenticação JWT do outro, e as fotos dos produtos guardadas no S3 em vez do banco.",
    },
    facts: [
      {
        en: "Photos go to S3, not into a column. The catalogue stays small and the images are served straight from storage.",
        pt: "As fotos vão para o S3, não para uma coluna. O catálogo fica pequeno e as imagens são servidas direto do armazenamento.",
      },
      {
        en: "Spring Security with JWT keeps the shopper and whoever manages the catalogue on separate sides of the API.",
        pt: "Spring Security com JWT mantém quem compra e quem administra o catálogo em lados separados da API.",
      },
    ],
    tech: ["React", "Tailwind CSS", "Spring Boot", "Java", "PostgreSQL", "AWS S3", "JWT"],
    years: "2024 - 2025",
    links: [
      { label: { en: "Storefront", pt: "Loja" }, url: "https://github.com/AndDev741/dudamorais-eshop" },
      { label: { en: "Backend", pt: "Backend" }, url: "https://github.com/AndDev741/dudamorais-eshop-backend" },
    ],
  },
  {
    key: "dreamsboard",
    name: "DreamsBoard",
    tagline: {
      en: "A board for the things you are working towards",
      pt: "Um quadro para as coisas que você está buscando",
    },
    blurb: {
      en: "An app for keeping what you want in one place. Looking at it now, it is where the recipe I still use was rehearsed: Spring Boot with JWT and Postgres on one side, React with Redux and Tailwind on the other, and i18next so it spoke two languages from the first commit.",
      pt: "Um app para manter o que você quer em um só lugar. Olhando hoje, é onde a receita que ainda uso foi ensaiada: Spring Boot com JWT e Postgres de um lado, React com Redux e Tailwind do outro, e i18next para falar duas línguas desde o primeiro commit.",
    },
    facts: [
      {
        en: "The same stack Beyou runs on today, a year earlier and much smaller, which is the reason it is worth keeping around.",
        pt: "A mesma stack em que o Beyou roda hoje, um ano antes e bem menor, que é a razão de valer a pena guardar.",
      },
      {
        en: "Spring's mail starter sends the account email, which was the first time I had a backend of mine send anything.",
        pt: "O starter de mail do Spring envia o email de conta, que foi a primeira vez que um backend meu enviou alguma coisa.",
      },
    ],
    tech: ["React", "Redux Toolkit", "Tailwind CSS", "i18next", "Spring Boot", "PostgreSQL", "JWT"],
    years: "2024",
    links: [
      { label: { en: "Frontend", pt: "Frontend" }, url: "https://github.com/AndDev741/DreamsBoard-Frontend" },
      { label: { en: "Backend", pt: "Backend" }, url: "https://github.com/AndDev741/DreamsBoard-backend" },
    ],
  },
  {
    key: "babel",
    name: "Library of Babel",
    tagline: {
      en: "The insane and simple algorithm that generates infinite books",
      pt: "O algoritmo insano e simples que gera livros infinitos",
    },
    blurb: {
      en: "Borges wrote about a library holding every possible book. It turns out you do not have to store them: give every book an address and generate its text from that address on demand. Every page that could ever be written is already in there, waiting for someone to ask for the right coordinates.",
      pt: "Borges escreveu sobre uma biblioteca com todos os livros possíveis. Acontece que você não precisa guardá-los: dê um endereço a cada livro e gere o texto a partir desse endereço quando pedirem. Toda página que poderia ser escrita já está lá, esperando alguém pedir as coordenadas certas.",
    },
    facts: [
      {
        en: "No storage at all. The address is the seed, so the same coordinates always return the same page.",
        pt: "Nenhum armazenamento. O endereço é a semente, então as mesmas coordenadas sempre devolvem a mesma página.",
      },
    ],
    tech: ["Java"],
    years: "2024",
    links: [{ label: source, url: "https://github.com/AndDev741/LibraryOfBabelAlgorithm" }],
  },
  {
    key: "markdown",
    name: "minimalist-markdown",
    tagline: {
      en: "A small markdown editor and renderer for Linux",
      pt: "Um editor e renderizador de markdown pequeno para Linux",
    },
    blurb: {
      en: "I wanted a markdown editor that opens instantly and does nothing else. So I wrote one for my own desktop, and it is the one I still use for notes.",
      pt: "Eu queria um editor de markdown que abrisse na hora e não fizesse mais nada. Então escrevi um para o meu desktop, e é o que ainda uso para notas.",
    },
    facts: [],
    tech: ["TypeScript", "Linux desktop"],
    years: "2026",
    links: [{ label: source, url: "https://github.com/AndDev741/minimalist-markdown" }],
  },
  {
    key: "pomodoro",
    name: "minimalist-pomodoro",
    tagline: {
      en: "A desktop pomodoro that keeps focus honest",
      pt: "Um pomodoro de desktop que mantém o foco honesto",
    },
    blurb: {
      en: "The companion to the markdown editor. A timer on the desktop, no account, no history to feel guilty about, just the current block of work.",
      pt: "O companheiro do editor de markdown. Um timer no desktop, sem conta, sem histórico para dar culpa, só o bloco de trabalho atual.",
    },
    facts: [],
    tech: ["TypeScript", "Linux desktop"],
    years: "2026",
    links: [{ label: source, url: "https://github.com/AndDev741/minimalist-pomodoro" }],
  },
  {
    key: "habittracker",
    name: "Beyou HabitTracker",
    tagline: {
      en: "The ancestor. Beyou's first form, kept as a relic",
      pt: "O ancestral. A primeira forma do Beyou, guardada como relíquia",
    },
    blurb: {
      en: "The 2023 original, plain JavaScript and no backend to speak of. I keep the repository as it was, because it is the honest starting point of everything the tower is built on.",
      pt: "O original de 2023, JavaScript puro e praticamente sem backend. Mantenho o repositório como estava, porque é o ponto de partida honesto de tudo em que a torre se apoia.",
    },
    facts: [],
    tech: ["JavaScript"],
    years: "2023",
    links: [{ label: source, url: "https://github.com/AndDev741/BeYou-HabitTracker" }],
  },
];

export function findProject(key: string): ProjectDetail | undefined {
  return projectDetail.find((p) => p.key === key);
}
