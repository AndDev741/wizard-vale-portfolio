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
        en: "Self-hosted on a single-node Kubernetes cluster (k3s), behind a Cloudflare Tunnel with zero open ports on the router. Everything on it is declared in Git and applied by Flux: CI publishes images to GHCR, Flux deploys each new one, and a Playwright suite gates every release.",
        pt: "Self-hosted num cluster Kubernetes de um nó só (k3s), atrás de um Cloudflare Tunnel com zero portas abertas no roteador. Tudo nele está declarado no Git e é aplicado pelo Flux: o CI publica as imagens no GHCR, o Flux faz o deploy de cada nova, e uma suíte Playwright barra cada release.",
      },
      {
        en: "Watched by Prometheus, Grafana, Loki and a self-hosted GlitchTip, with email alerts, uptime and heartbeat monitors. Backups run nightly and get restored every week into a throwaway database, to prove they work.",
        pt: "Vigiado por Prometheus, Grafana, Loki e um GlitchTip self-hosted, com alertas por e-mail e monitores de uptime e heartbeat. Os backups rodam toda noite e são restaurados toda semana num banco descartável, para provar que funcionam.",
      },
    ],
    tech: ["Spring Boot", "Java", "PostgreSQL", "React", "React Native", "Spring AI", "Kubernetes", "Grafana"],
    years: "2023 - now",
    links: [
      { label: { en: "Live app", pt: "App ao vivo" }, url: "https://app.beyouweb.com" },
      { label: { en: "Google Play", pt: "Google Play" }, url: "https://play.google.com/store/apps/details?id=com.beyou.mobile" },
      { label: { en: "Engineering docs", pt: "Docs de engenharia" }, url: "https://docs.beyouweb.com" },
      { label: source, url: "https://github.com/AndDev741/Beyou-backend-spring" },
      { label: { en: "Infrastructure", pt: "Infraestrutura" }, url: "https://github.com/AndDev741/be-infra" },
    ],
  },
  {
    key: "beconscient",
    name: "beConscient",
    tagline: {
      en: "How many hours I was awake away from screens",
      pt: "Quantas horas fiquei acordado longe das telas",
    },
    blurb: {
      en: "A self-hosted measure of all my screen time, phone and computer, shown on a page I run myself. It records when I pick a screen up, what I do on it and what pulled me in. The number it puts first is the hours I spent awake away from screens, and it exists to give me an honest baseline before I try to change anything.",
      pt: "Uma medição self-hosted de todo o meu tempo de tela, celular e computador, mostrada numa página que eu mesmo hospedo. Ela registra quando eu pego uma tela, o que faço nela e o que me puxou até lá. O número que ela mostra primeiro são as horas que passei acordado longe das telas, e ela existe para me dar uma linha de base honesta antes de eu tentar mudar qualquer coisa.",
    },
    facts: [
      {
        en: "Five parts, one contract: a Kotlin collector on Android, a Go agent on the Linux desktop, a Manifest V3 browser extension, a Quarkus backend and a React page, all built against the same event and API definitions.",
        pt: "Cinco partes, um contrato: um coletor em Kotlin no Android, um agente em Go no desktop Linux, uma extensão Manifest V3 no navegador, um backend Quarkus e uma página React, todos construídos sobre as mesmas definições de evento e de API.",
      },
      {
        en: "Events travel inside an HPKE envelope, so the TLS proxy in front of the server sees only ciphertext. Notification text, window titles and URLs are never collected, and the server drops any field the contract does not list.",
        pt: "Os eventos viajam dentro de um envelope HPKE, então o proxy TLS na frente do servidor enxerga só texto cifrado. Texto de notificação, títulos de janela e URLs nunca são coletados, e o servidor descarta todo campo que o contrato não lista.",
      },
      {
        en: "Raw events are the source of truth and screen time is a projection of them that can always be rebuilt. A version bump starts a resumable rebuild, block by block, while the page shows its progress.",
        pt: "Os eventos brutos são a fonte da verdade e o tempo de tela é uma projeção deles que sempre pode ser refeita. Subir a versão inicia uma reconstrução retomável, bloco a bloco, enquanto a página mostra o progresso.",
      },
      {
        en: "The phone collector can also be the home screen. Before it opens an app I chose, it shows a message I wrote and makes me wait, five seconds at first and twice as long with each opening, up to a minute. A focus period locks the phone to the apps I allow.",
        pt: "O coletor do celular também pode ser a tela inicial. Antes de abrir um app que escolhi, ele mostra uma mensagem que escrevi e me faz esperar, cinco segundos no começo e o dobro a cada abertura, até um minuto. Um período de foco tranca o celular nos apps que eu permiti.",
      },
    ],
    tech: ["Kotlin", "Go", "Quarkus", "React", "PostgreSQL", "HPKE", "Kubernetes"],
    years: "2026 - now",
    links: [
      { label: { en: "Live app", pt: "App ao vivo" }, url: "https://beconscient.beyouweb.com" },
      { label: source, url: "https://github.com/AndDev741/beConscient" },
    ],
  },
  {
    key: "befree",
    name: "beFree",
    tagline: {
      en: "A finance tracker that takes its entries over WhatsApp",
      pt: "Um controle financeiro que recebe os lançamentos pelo WhatsApp",
    },
    blurb: {
      en: "A personal finance tracker with a web app for the month, the budgets and the savings goals, and an assistant on WhatsApp that takes the entries. I send a text, a photo or a PDF statement, and the assistant files it under the right category.",
      pt: "Um controle de finanças pessoais com um app web para o mês, os orçamentos e as metas de economia, e um assistente no WhatsApp que recebe os lançamentos. Mando um texto, uma foto ou um extrato em PDF, e o assistente lança na categoria certa.",
    },
    facts: [
      {
        en: "The assistant is DeepSeek behind LangChain4j, with tools that read and change transactions, categories, budgets and goals. Its chat memory lives in Postgres, and every inbound WhatsApp message is recorded by id and handled once.",
        pt: "O assistente é o DeepSeek por trás do LangChain4j, com ferramentas que leem e alteram transações, categorias, orçamentos e metas. A memória da conversa fica no Postgres, e toda mensagem recebida do WhatsApp é registrada por id e tratada uma vez só.",
      },
      {
        en: "A bank statement PDF is read with PDFBox, IBANs are redacted before the text reaches the model, and the assistant summarises what it found and waits for a yes before importing anything.",
        pt: "O PDF de um extrato é lido com PDFBox, os IBANs são ocultados antes de o texto chegar ao modelo, e o assistente resume o que achou e espera um sim antes de importar qualquer coisa.",
      },
      {
        en: "A month can start on any day up to the 28th, so a salary paid on the 25th lands in the month it is meant to pay for. Every screen and every assistant tool reads the same calendar.",
        pt: "Um mês pode começar em qualquer dia até o 28, então um salário pago no dia 25 cai no mês que ele deve pagar. Toda tela e toda ferramenta do assistente leem o mesmo calendário.",
      },
      {
        en: "The backend ships as a GraalVM native image. CI builds it and runs the integration tests against the packaged app before the image goes to GHCR.",
        pt: "O backend vai para produção como uma imagem nativa GraalVM. O CI a constrói e roda os testes de integração contra o app empacotado antes de a imagem ir para o GHCR.",
      },
    ],
    tech: ["Quarkus", "Java", "GraalVM", "LangChain4j", "React", "TypeScript", "PostgreSQL", "WhatsApp API"],
    years: "2026",
    links: [
      { label: { en: "Live app", pt: "App ao vivo" }, url: "https://befree.beyouweb.com" },
      { label: source, url: "https://github.com/AndDev741/beFree" },
    ],
  },
  {
    key: "beinfra",
    name: "be-infra",
    tagline: {
      en: "Everything running on the node, declared in Git",
      pt: "Tudo que roda no nó, declarado no Git",
    },
    blurb: {
      en: "The repository that describes the single-node k3s cluster behind Beyou, and the Flux that applies it. Beyou, beFree, beConscient, GlitchTip and a private photo library each run in a fenced namespace of their own, and git always shows what is running.",
      pt: "O repositório que descreve o cluster k3s de um nó só por trás do Beyou, e o Flux que o aplica. Beyou, beFree, beConscient, GlitchTip e uma biblioteca privada de fotos rodam cada um num namespace isolado, e o git sempre mostra o que está rodando.",
    },
    facts: [
      {
        en: "One Flux Kustomization per piece, each waiting only for what it needs. A broken app never blocks the others, and one command shows the health of each.",
        pt: "Uma Kustomization do Flux por peça, cada uma esperando só pelo que precisa. Um app quebrado nunca trava os outros, e um comando mostra a saúde de cada uma.",
      },
      {
        en: "The repository is public and every Secret in it is encrypted with SOPS and age. A pre-commit hook runs gitleaks and refuses any Secret still in plain text.",
        pt: "O repositório é público e todo Secret nele é cifrado com SOPS e age. Um hook de pre-commit roda o gitleaks e recusa qualquer Secret ainda em texto puro.",
      },
      {
        en: "CI pushes an image to GHCR, then Flux image automation commits its digest to Git and rolls it out within about five minutes. A bad build goes back with a git revert.",
        pt: "O CI publica a imagem no GHCR, depois a automação de imagens do Flux grava o digest no Git e faz o rollout em cerca de cinco minutos. Um build ruim volta com um git revert.",
      },
      {
        en: "Public traffic enters through a Cloudflare Tunnel, with no port open on the router. Private apps are reachable only on the tailnet, through the Tailscale operator.",
        pt: "O tráfego público entra por um Cloudflare Tunnel, sem porta aberta no roteador. Os apps privados só são alcançáveis pela tailnet, por meio do operador do Tailscale.",
      },
    ],
    tech: ["k3s", "Flux", "SOPS", "CloudNativePG", "Traefik", "Prometheus", "Grafana", "Tailscale"],
    years: "2026",
    links: [{ label: source, url: "https://github.com/AndDev741/be-infra" }],
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
