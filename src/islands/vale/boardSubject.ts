import { t, type Lang } from "../../i18n/ui";
import { findProject } from "../../data/projectDetail";
import { findTopic, libraryLeaf } from "../../data/writingTopics";
import { findNpc } from "../../data/experienceNpcs";

/**
 * A board's subject is a namespaced string, so the same board, trigger and dialog
 * serve every building: a project in the tower, a shelf of writing in the library.
 */
export type SubjectKind = "project" | "projects" | "topic" | "topics" | "text" | "npc";

export function subjectKind(subject: string): SubjectKind {
  const [kind] = subject.split(":");
  return (kind as SubjectKind) ?? "project";
}

export function subjectKey(subject: string): string {
  return subject.slice(subject.indexOf(":") + 1);
}

/** What the plaque under a frame reads. */
export function boardLabel(subject: string, lang: Lang): string {
  const dict = t(lang);
  const key = subjectKey(subject);
  switch (subjectKind(subject)) {
    case "projects":
      return dict.interior.allTitle;
    case "topics":
      return dict.interior.indexTitle;
    case "topic":
      return findTopic(key)?.title[lang] ?? key;
    case "npc":
      return findNpc(key)?.name[lang] ?? key;
    case "text":
      return libraryLeaf(key, lang)?.title ?? key;
    default:
      return findProject(key)?.name ?? key;
  }
}
