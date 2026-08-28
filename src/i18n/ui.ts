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
      loading: "Waking the vale",
    },
    world: {
      walk: "Walk",
      deedsBoard: "The noticeboard",
      deedsCount: "{n} of {total} earned",
      deedsLocked: "not yet",
      deedsNote: "Kept in this browser and nowhere else. There is no account here and no reason to want one.",
      deedsWon: "Badge earned",
      soundOn: "Sound on",
      soundOff: "Sound off",
      companyOn: "Others: showing",
      companyOff: "Others: hidden",
      companyJoining: "Others: joining\u2026",
      companyLost: "Others: cannot reach the vale",
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
      blurbs: {
        experience: "My career, told by three patrons",
        projects: "Five floors of things I built",
        writing: "Engineering stories, shelved as books",
        about: "Who I am, by the fire",
        contact: "Where to reach me",
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
        "Hello! I'm André: software engineer, Brazilian, father and husband. I live in Lisbon, Portugal, and I work for Gentek.ai, a London startup, building the future of big banks' financial systems.",
        "My career started in 2020, with a used LG S460 my mom bought me for high school. That is where building websites got hold of me, and I went after the trinity: HTML, CSS and JavaScript. That same laptop now runs real production: Beyou, my habit app, is served from it every day, behind a Cloudflare Tunnel, with a full monitoring stack watching over it.",
        "In 2021 I found out I was going to be a father. Instead of giving up, I doubled the studying: finished high school, started a degree, landed an internship and saw it through, then moved on to freelance work and projects of my own. Somewhere on that road I found Java and Spring, and went all in on that stack. Then I left the degree behind to immigrate to Portugal with my family, and earned my place at Gentek.",
        "Game development is the long goal. I never had time to chase it properly, so I started here: this site is a small magic vale with a wizard in it, built with React Three Fiber. Piece by piece, it will grow. That is how I do everything, and the free hours go into new features for Beyou.",
      ],
    },
    experience: {
      title: "Quest board",
      sub: "Three ages of one career: the internship, the freelance years, and the day to day at Gentek.ai.",
      role: "Software Engineer · Gentek.ai · Lisbon",
      rewardLabel: "Reward",
      arsenalLabel: "Technologies I work with",
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
      title: "Send me a message",
      sub: "You can reach me here.",
      email: "Email",
      github: "GitHub",
      linkedin: "LinkedIn",
    },
    company: {
      here: "{n} in the vale",
      note: "Only a colour, a place and one word about what you are doing. No name, no account, and nothing kept after you close the tab.",
      doing: {
        idle: "having a look",
        walk: "walking",
        read: "reading",
        talk: "talking",
        sit: "by the fire",
        scry: "at the orb",
        pet: "with the cat",
        look: "reading a board",
        climb: "on the stairs",
      },
    },
    interior: {
      climb: "Climb",
      descend: "Go down",
      leave: "Leave",
      petCat: "Pet the cat",
      read: "Read",
      talk: "Talk",
      deedsLabel: "Deeds worth telling",
      leaveBuilding: "Leave",
      goInside: "Step inside",
      floorOf: "Floor {n} of {total}",
      hint: "WASD to walk. Step up to anything interesting and press E.",
      hintTouch: "Joystick to walk. Step up to anything interesting and tap the prompt.",
      rosterTitle: "The hall's catalogue",
      rosterSub: "Three patrons, each an age of the same career. Pick one to hear them out.",
      indexTitle: "The whole index",
      indexSub: "Every text on the shelves, by subject.",
      backToShelf: "Back to the shelf",
      backToList: "Back to the list",
      yearNow: "now",
      sitDown: "Sit down",
      standUp: "Stand up",
      lookAt: "Look at",
      onTheDocs: "Read it on the docs site",
      enlarge: "Click to enlarge",
      closeDiagram: "Close",
      zoomHint: "Click anywhere, or press Esc, to close",
      prevLeaf: "Back",
      nextLeaf: "Turn",
      leafOf: "Leaf {n} of {total}",
      leaves: "{pages} pages, about {minutes} min",
      fromDocs: "Taken from the Beyou docs, as of {date}.",
      allTitle: "Everything on the shelves",
      allSub: "Every project in the tower, in one look.",
      dialogClose: "Close",
      openProject: "Open",
      techLabel: "Built with",
      orbReading: "Reading the stones\u2026",
      orbClouded: "The orb is clouded: the status service did not answer.",
      orbAllUp: "All {n} up",
      orbSomeDown: "{down} of {n} down",
      orbProbed: "probed from the edge",
      orbUp: "up",
      orbUpFor: "up {age}",
      orbDown: "down",
      orbGroups: {
        app: "Beyou itself",
        watching: "What watches it",
        chores: "Jobs that must keep running",
      },
      floors: {
        grimoire: "The Grimoire Room",
        ledger: "The Ledger Room",
        warding: "The Warding Room",
        attic: "The Attic",
        observatory: "The Observatory",
        readingRoom: "The Reading Room",
        gallery: "The Upper Gallery",
        tavern: "The Guild Hall",
        hearthroom: "The Hearth Room",
      },
      floorNotes: {
        grimoire: "The working floor. The grimoire on the table is the one still being written.",
        ledger: "Coins and chests, because down here everything is a record of what happened.",
        warding: "Where the wards are kept, the ones that decide what gets through.",
        attic: "Smaller works, and the relic that started the rest.",
        observatory: "The top of the tower, where the whole shelf is visible at once.",
        readingRoom: "Shelves by subject, and a frame on the wall for each.",
        gallery: "The index, and the quieter desks.",
        tavern: "Three patrons, left to right: where I started, where I sharpened, where I am. The catalogue in the middle introduces them.",
        hearthroom: "No boards in here. Walk up to a thing and it tells you its piece. The seat is for sitting.",
      },
    },
    footer: {
      credits:
        "Built with Astro and React Three Fiber. 3D models by Kay Lousberg, CC0. The music, the fire and the cat's purr are CC0 and public domain recordings, credited in the repository.",
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
      loading: "Acordando o vale",
    },
    world: {
      walk: "Caminhar",
      deedsBoard: "O mural",
      deedsCount: "{n} de {total} conquistadas",
      deedsLocked: "ainda não",
      deedsNote: "Guardado neste navegador e em nenhum outro lugar. Aqui não há conta, e não há razão para querer uma.",
      deedsWon: "Conquista obtida",
      soundOn: "Som ligado",
      soundOff: "Som desligado",
      companyOn: "Outros: à vista",
      companyOff: "Outros: escondidos",
      companyJoining: "Outros: a ligar\u2026",
      companyLost: "Outros: não consigo chegar ao vale",
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
      blurbs: {
        experience: "Minha carreira, contada por três frequentadores",
        projects: "Cinco andares de coisas que construí",
        writing: "Histórias de engenharia, em forma de livros",
        about: "Quem eu sou, ao pé da lareira",
        contact: "Onde falar comigo",
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
        "Olá! Sou o André: engenheiro de software, brasileiro, pai e marido. Moro em Lisboa, Portugal, e trabalho para a Gentek.ai, uma startup de Londres, construindo o futuro dos sistemas financeiros de grandes bancos.",
        "Minha carreira começou em 2020, com um LG S460 usado que minha mãe me comprou para o ensino médio. Foi ali que criação de sites me pegou, e fui atrás da trindade: HTML, CSS e JavaScript. Esse mesmo laptop hoje roda produção de verdade: o Beyou, meu app de hábitos, é servido dele todos os dias, atrás de um Cloudflare Tunnel, com uma stack de monitoramento inteira olhando por ele.",
        "Em 2021 descobri que ia ser pai. Em vez de desistir, dobrei os estudos: terminei o ensino médio, comecei uma faculdade, consegui um estágio e levei ele até o fim, e daí parti para freelances e projetos pessoais. Foi nessa estrada que descobri o Java e o Spring, e afundei de vez nessa stack. Depois abandonei a faculdade para imigrar para Portugal com a família, e consegui meu lugar na Gentek.",
        "Desenvolvimento de jogos é o objetivo longo. Nunca tive tempo de correr atrás de verdade, então comecei por aqui: este site é um pequeno vale mágico com um mago dentro, feito com React Three Fiber. Peça por peça, ele vai crescer. É assim que eu faço tudo, e a hora livre vai para features novas no Beyou.",
      ],
    },
    experience: {
      title: "Mural de missões",
      sub: "Três eras de uma mesma carreira: o estágio, os anos de freelance, e o dia a dia na Gentek.ai.",
      role: "Engenheiro de Software · Gentek.ai · Lisboa",
      rewardLabel: "Recompensa",
      arsenalLabel: "Tecnologias com que trabalho",
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
      title: "Envie uma mensagem",
      sub: "Você me encontra por aqui.",
      email: "Email",
      github: "GitHub",
      linkedin: "LinkedIn",
    },
    company: {
      here: "{n} no vale",
      note: "Apenas uma cor, um lugar e uma palavra sobre o que estás a fazer. Sem nome, sem conta, e nada fica guardado depois de fechares o separador.",
      doing: {
        idle: "a dar uma olhada",
        walk: "a andar",
        read: "a ler",
        talk: "a conversar",
        sit: "junto à lareira",
        scry: "na bola de cristal",
        pet: "com a gata",
        look: "a ler um quadro",
        climb: "nas escadas",
      },
    },
    interior: {
      climb: "Subir",
      descend: "Descer",
      leave: "Sair",
      petCat: "Fazer carinho no gato",
      read: "Ler",
      talk: "Conversar",
      deedsLabel: "Feitos que valem contar",
      leaveBuilding: "Sair",
      goInside: "Entrar",
      floorOf: "Andar {n} de {total}",
      hint: "WASD para andar. Chegue perto do que interessar e aperte E.",
      hintTouch: "Joystick para andar. Chegue perto do que interessar e toque no botão.",
      rosterTitle: "O catálogo do salão",
      rosterSub: "Três frequentadores, cada um uma era da mesma carreira. Escolha um para ouvir.",
      indexTitle: "O índice completo",
      indexSub: "Todos os textos das prateleiras, por assunto.",
      backToShelf: "Voltar à prateleira",
      backToList: "Voltar à lista",
      yearNow: "hoje",
      sitDown: "Sentar",
      standUp: "Levantar",
      lookAt: "Olhar",
      onTheDocs: "Ler no site de docs",
      enlarge: "Clique para ampliar",
      closeDiagram: "Fechar",
      zoomHint: "Clique em qualquer lugar, ou aperte Esc, para fechar",
      prevLeaf: "Voltar",
      nextLeaf: "Virar",
      leafOf: "Folha {n} de {total}",
      leaves: "{pages} páginas, cerca de {minutes} min",
      fromDocs: "Tirado dos docs do Beyou, em {date}.",
      allTitle: "Tudo o que está nas prateleiras",
      allSub: "Todos os projetos da torre, em uma olhada.",
      dialogClose: "Fechar",
      openProject: "Abrir",
      techLabel: "Feito com",
      orbReading: "Lendo as pedras\u2026",
      orbClouded: "A bola est\u00e1 turva: o servi\u00e7o de status n\u00e3o respondeu.",
      orbAllUp: "Todos os {n} de p\u00e9",
      orbSomeDown: "{down} de {n} fora",
      orbProbed: "sondado da borda",
      orbUp: "de p\u00e9",
      orbUpFor: "de p\u00e9 h\u00e1 {age}",
      orbDown: "fora",
      orbGroups: {
        app: "O Beyou em si",
        watching: "O que o vigia",
        chores: "Tarefas que t\u00eam de rodar",
      },
      floors: {
        grimoire: "Sala do Grimório",
        ledger: "Sala do Livro-Razão",
        warding: "Sala das Guardas",
        attic: "O Sótão",
        observatory: "O Observatório",
        readingRoom: "A Sala de Leitura",
        gallery: "A Galeria de Cima",
        tavern: "O Salão da Guilda",
        hearthroom: "A Sala da Lareira",
      },
      floorNotes: {
        grimoire: "O andar de trabalho. O grimório na mesa é o que ainda está sendo escrito.",
        ledger: "Moedas e baús, porque aqui embaixo tudo é registro do que aconteceu.",
        warding: "Onde ficam as guardas, as que decidem o que passa.",
        attic: "Trabalhos menores, e a relíquia que começou o resto.",
        observatory: "O topo da torre, de onde a prateleira inteira se vê de uma vez.",
        readingRoom: "Prateleiras por assunto, e um quadro na parede para cada uma.",
        gallery: "O índice, e as escrivaninhas mais quietas.",
        tavern: "Três frequentadores, da esquerda para a direita: onde comecei, onde me afiei, onde estou. O catálogo no meio apresenta cada um.",
        hearthroom: "Aqui não tem quadro. Chega perto de uma coisa e ela te conta a parte dela. O assento é para sentar.",
      },
    },
    footer: {
      credits:
        "Feito com Astro e React Three Fiber. Modelos 3D de Kay Lousberg, CC0. A música, a fogueira e o ronronar da gata são gravações CC0 e de domínio público, creditadas no repositório.",
    },
  },
} as const;

export type Dict = (typeof ui)["en"];

/**
 * Every language must carry every key: a missing one fails right here at
 * compile time instead of throwing at render on the page that reads it. The
 * dictionaries are literal-typed by `as const`, so the check compares shape
 * rather than letters: every literal widens to plain string first.
 */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };

const _ptIsComplete: Widen<Dict> = ui.pt;
void _ptIsComplete;

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
