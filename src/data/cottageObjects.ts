import type { Lang } from "../i18n/ui";

/**
 * The Cottage says its piece through objects rather than a board on a wall.
 * One object, one thing to say, so the "about" never becomes a single long
 * paragraph nobody finishes.
 *
 * Each of these is something you walk up to in the room: the seat, the laptop
 * on the desk, the journal on the low table, the orb on the cabinet, the frame
 * above the couch.
 */

export interface CottageObject {
  key: string;
  /** Shown as the dialog's heading. */
  title: Record<Lang, string>;
  /** One line under it. */
  subtitle: Record<Lang, string>;
  /**
   * The body. The orb leaves this out: its live panel says everything, and
   * prose underneath was just describing what the reader could already see.
   */
  paragraphs?: Array<Record<Lang, string>>;
  /** Optional facts, listed under the body. */
  facts?: Array<Record<Lang, string>>;
}

export const cottageObjects: CottageObject[] = [
  {
    key: "seat",
    title: { en: "Sit a while", pt: "Senta um pouco" },
    subtitle: { en: "Who I am, out of working hours", pt: "Quem eu sou, fora do horário de trabalho" },
    paragraphs: [
      {
        en: "Hello! I'm André: software engineer, Brazilian, father and husband. I live in Lisbon, Portugal, and I work for Gentek.ai, a London startup.",
        pt: "Olá! Sou o André: engenheiro de software, brasileiro, pai e marido. Moro em Lisboa, Portugal, e trabalho para a Gentek.ai, uma startup de Londres.",
      },
      {
        en: "My career started in 2020, with a used laptop bought for high school. That is where building websites got hold of me, and I went after the trinity: HTML, CSS and JavaScript.",
        pt: "Minha carreira começou em 2020, com um notebook usado comprado para estudar para o ensino médio. Foi ali que criação de sites me pegou, e fui atrás da trindade: HTML, CSS e JavaScript.",
      },
      {
        en: "In 2021 I found out I was going to be a father. Instead of giving up, I doubled the studying. I finished high school, started a degree, landed an internship and saw it through, then moved on to freelance work and projects of my own. Somewhere on that road I found Java and Spring, and went all in on that stack.",
        pt: "Em 2021 descobri que ia ser pai. Em vez de desistir, dobrei os estudos. Terminei o ensino médio, comecei uma faculdade, consegui um estágio e levei ele até o fim, e daí parti para freelances e projetos pessoais. Foi nessa estrada que descobri o Java e o Spring, e afundei de vez nessa stack.",
      },
      {
        en: "I left the degree behind to immigrate to Portugal with my family. I earned my place at Gentek, and I get better every day: working hours go into building the future of big banks' financial systems, and the free hours go into new features for Beyou.",
        pt: "Abandonei a faculdade para imigrar para Portugal com a família. Consegui meu lugar na Gentek, e melhoro a cada dia: o horário de trabalho vai para construir o futuro dos sistemas financeiros de grandes bancos, e a hora livre vai para features novas no Beyou.",
      },
      {
        en: "Game development is the long goal. I never had the time to chase it properly, so I stopped waiting for the time and started here: this vale is the first thing I have built where the point is that it feels like somewhere.",
        pt: "Desenvolvimento de jogos é o objetivo longo. Nunca tive tempo de correr atrás de verdade, então parei de esperar o tempo e comecei por aqui: este vale é a primeira coisa que construí onde o ponto é parecer um lugar.",
      },
      {
        en: "It grows the way I do everything, at work too: ship the small honest version, then grow it piece by piece. Beyou started as one screen with a list of habits on it.",
        pt: "Ele cresce do jeito que eu faço tudo, no trabalho também: entrega a versão pequena e honesta, depois faz crescer peça por peça. O Beyou começou como uma tela só, com uma lista de hábitos nela.",
      },
    ],
  },
  {
    key: "laptop",
    title: { en: "The LG S460", pt: "O LG S460" },
    subtitle: {
      en: "A used laptop from 2020, still serving production today",
      pt: "Um laptop usado de 2020, ainda servindo produção hoje",
    },
    paragraphs: [
      {
        en: "My mom bought me this one used, in 2020, for high school. It is where I learned to code. Everything I know started on that keyboard.",
        pt: "Minha mãe me comprou este usado, em 2020, para o ensino médio. Foi nele que aprendi a programar. Tudo o que sei começou naquele teclado.",
      },
      {
        en: "It never went into a drawer. It is a server now, and Beyou is served from it every single day, behind a Cloudflare Tunnel with no open ports, with a full monitoring stack watching over it.",
        pt: "Ele nunca foi para uma gaveta. Hoje é um servidor, e o Beyou é servido dele todo santo dia, atrás de um Cloudflare Tunnel sem portas abertas, com uma stack de monitoramento inteira olhando por ele.",
      },
      {
        en: "Beyou is where I build end to end: a Spring Boot backend, a React web app, a native Android app sharing the same monorepo, and an AI agent running on a chain of free-tier models. Hosting it costs electricity, and it has taught me more than any course.",
        pt: "O Beyou é onde eu construo de ponta a ponta: backend em Spring Boot, app web em React, app nativo Android dividindo o mesmo monorepo, e um agente de IA rodando numa cadeia de modelos de graça. Hospedar custa eletricidade, e me ensinou mais que qualquer curso.",
      },
    ],
    facts: [
      { en: "Bought used in 2020, for school", pt: "Comprado usado em 2020, para a escola" },
      { en: "In production since 2026, uninterrupted", pt: "Em produção desde 2026, sem interrupção" },
      { en: "Cloudflare Tunnel, zero open ports", pt: "Cloudflare Tunnel, zero portas abertas" },
      { en: "Hosting cost: electricity", pt: "Custo de hospedagem: eletricidade" },
    ],
  },
  {
    key: "orb",
    title: { en: "The scrying orb", pt: "A bola de cristal" },
    subtitle: {
      en: "Everything Beyou runs, as it stands this minute",
      pt: "Tudo o que o Beyou roda, como está neste minuto",
    },
  },
];

export function findCottageObject(key: string): CottageObject | undefined {
  return cottageObjects.find((o) => o.key === key);
}
