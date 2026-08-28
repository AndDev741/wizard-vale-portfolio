import type { Lang } from "../i18n/ui";

/**
 * Deeds worth a badge. Fifteen of them, and every single one is something a
 * visitor might do anyway: they exist to reward looking around, not to send
 * anyone on errands. Two of them need a second visit at a different hour, which
 * is the only nudge to come back that this site has.
 */

export interface Achievement {
  id: string;
  /** Shown on the badge. */
  icon: string;
  name: Record<Lang, string>;
  /** How to earn it, worded so it reads as a hint before and a fact after. */
  hint: Record<Lang, string>;
  /** Set for the ones counted out of a total, so the board can show 2 of 7. */
  outOf?: number;
}

export const achievements: Achievement[] = [
  {
    id: "wanderer",
    icon: "🗺️",
    name: { en: "Knows the vale", pt: "Conhece o vale" },
    hint: { en: "Visit all five places", pt: "Visite os cinco lugares" },
    outOf: 5,
  },
  {
    id: "reader",
    icon: "📖",
    name: { en: "Opened a book", pt: "Abriu um livro" },
    hint: { en: "Read something in the library", pt: "Leia algo na biblioteca" },
  },
  {
    id: "bookworm",
    icon: "📚",
    name: { en: "Read the shelf", pt: "Leu a prateleira" },
    hint: { en: "Open every text in the library", pt: "Abra todos os textos da biblioteca" },
    outOf: 7,
  },
  {
    id: "listener",
    icon: "🍻",
    name: { en: "Heard them out", pt: "Ouviu os três" },
    hint: { en: "Talk to all three patrons in the hall", pt: "Converse com os três frequentadores do salão" },
    outOf: 3,
  },
  {
    id: "hearth",
    icon: "🛋️",
    name: { en: "Sat a while", pt: "Sentou um pouco" },
    hint: { en: "Take the seat by the fire", pt: "Ocupe o assento ao pé da lareira" },
  },
  {
    id: "grimoire",
    icon: "✨",
    name: { en: "Read the grimoire", pt: "Leu o grimório" },
    hint: { en: "Open the book floating in the tower", pt: "Abra o livro que flutua na torre" },
  },
  {
    id: "summit",
    icon: "🔭",
    name: { en: "Climbed to the top", pt: "Subiu ao topo" },
    hint: { en: "Reach the tower's observatory", pt: "Chegue ao observatório da torre" },
  },
  {
    id: "cat",
    icon: "🐈",
    name: { en: "Petted the cat", pt: "Fez carinho no gato" },
    hint: { en: "It is asleep by the fire, and it does not mind", pt: "Ele dorme ao pé do fogo, e não se importa" },
  },
  {
    id: "nightowl",
    icon: "🌙",
    name: { en: "Saw it after dark", pt: "Viu depois de escurecer" },
    hint: { en: "The vale keeps your hour. Come by at night", pt: "O vale guarda a sua hora. Apareça de noite" },
  },
  {
    id: "daybreak",
    icon: "☀️",
    name: { en: "Saw it in daylight", pt: "Viu com luz do dia" },
    hint: { en: "And come by while the sun is up", pt: "E apareça enquanto o sol está alto" },
  },
  {
    id: "stroll",
    icon: "👣",
    name: { en: "Went for a walk", pt: "Foi dar uma volta" },
    hint: { en: "Cover some ground on foot", pt: "Ande um bom pedaço a pé" },
  },
  {
    id: "illustrated",
    icon: "🖼️",
    name: { en: "Studied a diagram", pt: "Estudou um diagrama" },
    hint: { en: "Open an illustration full size", pt: "Abra uma ilustração em tamanho grande" },
  },
  {
    id: "bilingual",
    icon: "🗣️",
    name: { en: "Read it both ways", pt: "Leu nas duas línguas" },
    hint: { en: "See the vale in English and Portuguese", pt: "Veja o vale em inglês e em português" },
    outOf: 2,
  },
  {
    id: "scryer",
    icon: "🔮",
    name: { en: "Consulted the orb", pt: "Consultou a bola" },
    hint: { en: "Ask it what is still standing", pt: "Pergunte a ela o que ainda está de pé" },
  },
  {
    id: "earful",
    icon: "🔊",
    name: { en: "Let it be heard", pt: "Deixou ouvir" },
    hint: { en: "Turn the sound on somewhere", pt: "Ligue o som em algum lugar" },
  },
];

export function findAchievement(id: string): Achievement | undefined {
  return achievements.find((a) => a.id === id);
}
