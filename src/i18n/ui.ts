export const languages = { en: "English", pt: "Português" } as const;
export type Lang = keyof typeof languages;

export type SectionKey = "about" | "projects" | "experience" | "writing" | "contact";

export const ui = {
  en: {
    site: {
      name: "André Luiz Gonçalves",
      title: "André Luiz Gonçalves · Software Engineer",
      description:
        "Software engineer in Lisbon. Production systems for banks by day, a small magic vale by night.",
    },
    nav: {
      about: "About",
      projects: "Projects",
      experience: "Experience",
      writing: "Writing",
    },
    hero: {
      kicker: "Software Engineer · Lisbon",
      sub: "By day I build production systems for banks. By night, this small vale.",
      explore: "Explore the vale",
      seeProjects: "See the projects",
      noWebgl: "The 3D vale needs WebGL. Everything else on this site works without it.",
    },
    world: {
      walk: "Walk",
      exitWalk: "Leave walk mode",
      hintWalk: "WASD or arrow keys to walk. Get close to a door and press E to enter.",
      hintWalkTouch: "Use the joystick to walk. Get close to a door and tap Enter.",
      enter: "Enter",
      close: "Close",
      openPage: "Open the full page",
      overview: "The vale",
      places: {
        experience: "Guild Hall",
        projects: "Wizard's Tower",
        writing: "Library",
        about: "The Cottage",
        contact: "Raven Post",
      },
    },
    home: {
      placesTitle: "Places in the vale",
      placesSub: "Every part of this site is a place. Walk in, or just click.",
      cards: {
        experience: "The quest board. Work I shipped at Gentek.ai, with the numbers to prove it.",
        projects: "Beyou glowing at the top, older artifacts on the shelf below.",
        writing: "Engineering stories from the Beyou docs, in English and Portuguese.",
        about: "Who I am, the laptop that started everything, and where this is going.",
      },
    },
    about: {
      title: "About",
      paragraphs: [
        "I'm André, a software engineer living in Lisbon. At Gentek.ai I work on an AI SaaS platform used by banks: OLAP pipelines, reactive microservices, caching layers, the kind of system where being wrong is expensive.",
        "I learned to code on a used LG S460 my mom bought me in 2020, for high school. That same laptop now runs real production. Beyou, my habit app, is served from it every day, behind a Cloudflare Tunnel, with a full monitoring stack watching over it.",
        "Beyou is where I build things end to end: a Spring Boot backend, a React web app, a native Android app sharing the same monorepo, and an AI agent running on a chain of free-tier LLMs. It costs nothing to host and it has taught me more than any course.",
        "Game development is the long-term goal. I never had time to chase it properly, so I started here: this site is a small magic vale with a wizard in it, built with React Three Fiber. Piece by piece, it will grow. That is how I do everything.",
      ],
    },
    experience: {
      title: "Quest board",
      sub: "Completed quests at Gentek.ai, where I help build a financial-grade AI SaaS platform.",
      role: "Software Engineer · Gentek.ai · Lisbon",
      rewardLabel: "Reward",
    },
    projects: {
      title: "Projects",
      sub: "One artifact glows at the top of the tower. The rest live on the shelf.",
      flagshipName: "Beyou",
      flagshipTag: "A free, gamified habit and routine manager, running as a real production.",
      flagshipFacts: [
        "One TypeScript core, two clients: React on the web and React Native on Android, sharing state, API layer and i18n as source in a monorepo.",
        "An AI agent with 33 tools operates the user's real data, on a fallback chain of free-tier LLMs. Running cost so far: zero.",
        "Self-hosted on the laptop I learned to code on, behind a Cloudflare Tunnel with zero open ports.",
        "Watched by a full observability stack: Prometheus, Grafana, Loki and GlitchTip, in dev and in prod.",
      ],
      liveApp: "Live app",
      docs: "Engineering docs",
      source: "Source",
      shelfTitle: "The shelf",
      shelfSub: "Older artifacts, kept with care.",
      viewOnGithub: "View on GitHub",
    },
    writing: {
      title: "Writing",
      sub: "I write about the engineering behind Beyou on its docs site. Every post exists in English and Portuguese.",
      latest: "Latest",
      readPost: "Read the post",
    },
    contact: {
      title: "Send a raven",
      sub: "The fastest ravens reach me here.",
      email: "Email",
      github: "GitHub",
      linkedin: "LinkedIn",
    },
    footer: {
      credits: "Built with Astro and React Three Fiber. 3D models by Kay Lousberg, CC0.",
    },
  },
  pt: {
    site: {
      name: "André Luiz Gonçalves",
      title: "André Luiz Gonçalves · Engenheiro de Software",
      description:
        "Engenheiro de software em Lisboa. Sistemas de produção para bancos de dia, um pequeno vale mágico de noite.",
    },
    nav: {
      about: "Sobre",
      projects: "Projetos",
      experience: "Experiência",
      writing: "Textos",
    },
    hero: {
      kicker: "Engenheiro de Software · Lisboa",
      sub: "De dia construo sistemas de produção para bancos. De noite, este pequeno vale.",
      explore: "Explorar o vale",
      seeProjects: "Ver os projetos",
      noWebgl: "O vale em 3D precisa de WebGL. Todo o resto do site funciona sem ele.",
    },
    world: {
      walk: "Caminhar",
      exitWalk: "Sair do modo caminhada",
      hintWalk: "WASD ou setas para andar. Chegue perto de uma porta e aperte E para entrar.",
      hintWalkTouch: "Use o joystick para andar. Chegue perto de uma porta e toque em Entrar.",
      enter: "Entrar",
      close: "Fechar",
      openPage: "Abrir a página completa",
      overview: "O vale",
      places: {
        experience: "Salão da Guilda",
        projects: "Torre do Mago",
        writing: "Biblioteca",
        about: "A Cabana",
        contact: "Correio do Corvo",
      },
    },
    home: {
      placesTitle: "Lugares do vale",
      placesSub: "Cada parte deste site é um lugar. Entre andando, ou só clique.",
      cards: {
        experience: "O mural de missões. O que entreguei na Gentek.ai, com os números para provar.",
        projects: "O Beyou brilhando no topo, artefatos mais antigos na prateleira.",
        writing: "Histórias de engenharia dos docs do Beyou, em inglês e português.",
        about: "Quem eu sou, o laptop que começou tudo, e para onde isso vai.",
      },
    },
    about: {
      title: "Sobre",
      paragraphs: [
        "Sou o André, engenheiro de software vivendo em Lisboa. Na Gentek.ai trabalho em uma plataforma de AI SaaS usada por bancos: pipelines OLAP, microsserviços reativos, camadas de cache, o tipo de sistema em que errar custa caro.",
        "Aprendi a programar em um LG S460 usado que minha mãe comprou para mim em 2020, para o ensino médio. Esse mesmo laptop hoje roda produção de verdade. O Beyou, meu app de hábitos, é servido dele todos os dias, atrás de um Cloudflare Tunnel, com uma stack completa de monitoramento vigiando.",
        "O Beyou é onde construo as coisas de ponta a ponta: um backend Spring Boot, um app web em React, um app Android nativo no mesmo monorepo, e um agente de IA rodando em uma cadeia de LLMs de free tier. Custa zero para hospedar e me ensinou mais que qualquer curso.",
        "Desenvolvimento de jogos é o objetivo de longo prazo. Nunca tive tempo de correr atrás direito, então comecei por aqui: este site é um pequeno vale mágico com um mago dentro, feito com React Three Fiber. Peça por peça, ele vai crescer. É assim que eu faço tudo.",
      ],
    },
    experience: {
      title: "Mural de missões",
      sub: "Missões concluídas na Gentek.ai, onde ajudo a construir uma plataforma de AI SaaS para o setor financeiro.",
      role: "Engenheiro de Software · Gentek.ai · Lisboa",
      rewardLabel: "Recompensa",
    },
    projects: {
      title: "Projetos",
      sub: "Um artefato brilha no topo da torre. Os outros vivem na prateleira.",
      flagshipName: "Beyou",
      flagshipTag: "Um gestor de hábitos e rotinas gamificado, gratuito, rodando como produção de verdade.",
      flagshipFacts: [
        "Um núcleo TypeScript, dois clientes: React na web e React Native no Android, compartilhando estado, camada de API e i18n como código-fonte em um monorepo.",
        "Um agente de IA com 33 ferramentas opera os dados reais do usuário, sobre uma cadeia de fallback de LLMs de free tier. Custo até agora: zero.",
        "Self-hosted no laptop em que aprendi a programar, atrás de um Cloudflare Tunnel com zero portas abertas.",
        "Vigiado por uma stack completa de observabilidade: Prometheus, Grafana, Loki e GlitchTip, em dev e em produção.",
      ],
      liveApp: "App ao vivo",
      docs: "Docs de engenharia",
      source: "Código",
      shelfTitle: "A prateleira",
      shelfSub: "Artefatos mais antigos, guardados com carinho.",
      viewOnGithub: "Ver no GitHub",
    },
    writing: {
      title: "Textos",
      sub: "Escrevo sobre a engenharia do Beyou no site de docs dele. Todo post existe em inglês e português.",
      latest: "Mais recente",
      readPost: "Ler o post",
    },
    contact: {
      title: "Envie um corvo",
      sub: "Os corvos mais rápidos me encontram aqui.",
      email: "Email",
      github: "GitHub",
      linkedin: "LinkedIn",
    },
    footer: {
      credits: "Feito com Astro e React Three Fiber. Modelos 3D de Kay Lousberg, CC0.",
    },
  },
} as const;

export type Dict = (typeof ui)["en"];

export function t(lang: Lang): Dict {
  return ui[lang] as Dict;
}

/** Path helpers: en lives at /, pt lives under /pt. Slugs stay in English. */
export function localizePath(lang: Lang, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return lang === "pt" ? `/pt${clean === "/" ? "/" : clean}` : clean;
}

export function switchLangPath(currentLang: Lang, path: string): string {
  if (currentLang === "pt") {
    const stripped = path.replace(/^\/pt/, "") || "/";
    return stripped;
  }
  return `/pt${path === "/" ? "/" : path}`;
}
