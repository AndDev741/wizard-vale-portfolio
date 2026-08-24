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
  /** The body, a few short paragraphs. */
  paragraphs: Array<Record<Lang, string>>;
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
        en: "I'm André, a software engineer living in Lisbon. At Gentek.ai I work on an AI platform that banks depend on: OLAP pipelines, reactive microservices, caching layers, the kind of system where being wrong is expensive.",
        pt: "Sou o André, engenheiro de software morando em Lisboa. Na Gentek.ai trabalho numa plataforma de IA da qual bancos dependem: pipelines OLAP, microsserviços reativos, camadas de cache, o tipo de sistema onde estar errado custa caro.",
      },
      {
        en: "I'm Brazilian, and I moved here to do this work. Most of what I know I taught myself, at hours nobody was paying me for, which is probably why I still build things at night.",
        pt: "Sou brasileiro, e vim para cá para fazer este trabalho. A maior parte do que sei eu aprendi sozinho, em horas que ninguém me pagava, que é provavelmente por que ainda construo coisas de noite.",
      },
      {
        en: "None of it happened alone. My family backed a kid who wanted a computer and no clear plan, and the laptop on that desk is the proof.",
        pt: "Nada disso aconteceu sozinho. Minha família apostou num garoto que queria um computador e não tinha plano nenhum, e o laptop naquela mesa é a prova.",
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
        en: "Beyou is where I build end to end: a Spring Boot backend, a React web app, a native Android app sharing the same monorepo, and an AI agent running on a chain of free-tier models. Hosting it costs nothing, and it has taught me more than any course.",
        pt: "O Beyou é onde eu construo de ponta a ponta: backend em Spring Boot, app web em React, app nativo Android dividindo o mesmo monorepo, e um agente de IA rodando numa cadeia de modelos de graça. Hospedar não custa nada, e me ensinou mais que qualquer curso.",
      },
    ],
    facts: [
      { en: "Bought used in 2020, for school", pt: "Comprado usado em 2020, para a escola" },
      { en: "In production since 2026, uninterrupted", pt: "Em produção desde 2026, sem interrupção" },
      { en: "Cloudflare Tunnel, zero open ports", pt: "Cloudflare Tunnel, zero portas abertas" },
      { en: "Hosting cost: nothing", pt: "Custo de hospedagem: nada" },
    ],
  },
  {
    key: "journal",
    title: { en: "The journal", pt: "O diário" },
    subtitle: { en: "Where this is going", pt: "Para onde isto vai" },
    paragraphs: [
      {
        en: "Game development is the long goal. I never had the time to chase it properly, so I stopped waiting for the time and started here instead: this vale is the first thing I have built where the point is that it feels like somewhere.",
        pt: "Desenvolvimento de jogos é o objetivo longo. Nunca tive tempo de correr atrás de verdade, então parei de esperar o tempo e comecei por aqui: este vale é a primeira coisa que construí onde o ponto é parecer um lugar.",
      },
      {
        en: "It grows piece by piece. The tower came first, then the library, then the hall, then this room. Each one taught me something I did not know about lighting, or collision, or how a camera should behave when a wall gets in the way.",
        pt: "Ele cresce peça por peça. A torre veio primeiro, depois a biblioteca, depois o salão, depois esta sala. Cada uma me ensinou algo que eu não sabia sobre luz, ou colisão, ou como uma câmera deve se comportar quando uma parede entra na frente.",
      },
      {
        en: "That is how I do everything, at work too: ship the small honest version, then grow it. Beyou started as one screen with a list of habits on it.",
        pt: "É assim que eu faço tudo, no trabalho também: entrega a versão pequena e honesta, depois faz crescer. O Beyou começou como uma tela só, com uma lista de hábitos nela.",
      },
    ],
  },
  {
    key: "orb",
    title: { en: "The scrying orb", pt: "A bola de cristal" },
    subtitle: {
      en: "What the monitoring stack sees, right now",
      pt: "O que a stack de monitoramento vê, agora",
    },
    paragraphs: [
      {
        en: "Everything I self-host is watched. Prometheus scrapes it, Grafana draws it, Loki keeps the logs and GlitchTip catches what breaks, in development and in production both.",
        pt: "Tudo o que eu hospedo é vigiado. O Prometheus coleta, o Grafana desenha, o Loki guarda os logs e o GlitchTip pega o que quebra, em desenvolvimento e em produção.",
      },
      {
        en: "I did not set that up to look serious. I set it up because the machine under all of it is a laptop from 2020, and I wanted to know before my users did.",
        pt: "Não montei isso para parecer sério. Montei porque a máquina embaixo de tudo é um laptop de 2020, e eu queria saber antes dos meus usuários.",
      },
    ],
    facts: [
      { en: "Prometheus and Grafana, dev and prod", pt: "Prometheus e Grafana, dev e prod" },
      { en: "Loki with Alloy for unified logs", pt: "Loki com Alloy para logs unificados" },
      { en: "GlitchTip for errors, web and mobile", pt: "GlitchTip para erros, web e mobile" },
      { en: "Watchtower rolls out new images on its own", pt: "Watchtower sobe imagens novas sozinho" },
    ],
  },
  {
    key: "frame",
    title: { en: "The picture on the wall", pt: "O retrato na parede" },
    subtitle: { en: "The people this is all for", pt: "As pessoas para quem isto tudo é" },
    paragraphs: [
      {
        en: "A portfolio will tell you what someone can build. It rarely tells you who they went home to while they were learning how.",
        pt: "Um portfólio conta o que alguém sabe construir. Raramente conta para quem essa pessoa voltava para casa enquanto aprendia como.",
      },
    ],
  },
];

export function findCottageObject(key: string): CottageObject | undefined {
  return cottageObjects.find((o) => o.key === key);
}
