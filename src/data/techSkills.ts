import type { Lang } from "../i18n/ui";

/**
 * Everything I know how to wield, grouped the way the curriculum groups it.
 * One source for the places it shows: the procession floating over the Guild
 * Hall and the strip on the experience page.
 *
 * Icons are Simple Icons (CC0), downloaded into public/tech. A tech without
 * one is a concept rather than a brand (AOP, OLAP, Clean Code), or a brand
 * the set does not carry (AWS marks, StarRocks, Mockito): those float as gems.
 */

export interface TechItem {
  name: string;
  /** Basename under /tech, without extension. */
  icon?: string;
}

export interface TechCategory {
  key: string;
  label: Record<Lang, string>;
  items: TechItem[];
}

export const techCategories: TechCategory[] = [
  {
    key: "languages",
    label: { en: "Languages", pt: "Linguagens" },
    items: [
      { name: "Java (8 - 25)", icon: "openjdk" },
      { name: "TypeScript", icon: "typescript" },
      { name: "JavaScript", icon: "javascript" },
      { name: "SQL" },
      { name: "HTML/CSS", icon: "html5" },
      { name: "Python", icon: "python" },
    ],
  },
  {
    key: "frontend",
    label: { en: "Frontend", pt: "Frontend" },
    items: [
      { name: "React", icon: "react" },
      { name: "Redux", icon: "redux" },
      { name: "Tailwind CSS", icon: "tailwindcss" },
      { name: "Material UI", icon: "mui" },
    ],
  },
  {
    key: "backend",
    label: { en: "Backend & APIs", pt: "Backend e APIs" },
    items: [
      { name: "Spring Boot", icon: "springboot" },
      { name: "Spring WebFlux", icon: "spring" },
      { name: "Spring Security", icon: "springsecurity" },
      { name: "JPA/Hibernate", icon: "hibernate" },
      { name: "AOP" },
      { name: "RESTful APIs" },
      { name: "JWT", icon: "jsonwebtokens" },
      { name: "Kafka", icon: "apachekafka" },
    ],
  },
  {
    key: "databases",
    label: { en: "Databases", pt: "Bancos de dados" },
    items: [
      { name: "PostgreSQL", icon: "postgresql" },
      { name: "Redis", icon: "redis" },
      { name: "StarRocks" },
      { name: "R2DBC" },
    ],
  },
  {
    key: "caching",
    label: { en: "Caching", pt: "Cache" },
    items: [
      { name: "Caffeine (L1)" },
      { name: "Redis/Redisson (L2)", icon: "redis" },
      { name: "Pub/sub invalidation" },
    ],
  },
  {
    key: "testing",
    label: { en: "Testing", pt: "Testes" },
    items: [
      { name: "JUnit 5", icon: "junit5" },
      { name: "Mockito" },
      { name: "Testcontainers" },
      { name: "k6", icon: "k6" },
      { name: "Integration & contract tests" },
    ],
  },
  {
    key: "cloud",
    label: { en: "Cloud & DevOps", pt: "Cloud e DevOps" },
    items: [
      { name: "AWS Bedrock" },
      { name: "AWS Lambda" },
      { name: "ECS" },
      { name: "S3" },
      { name: "RDS" },
      { name: "Elastic Beanstalk" },
      { name: "ElastiCache" },
      { name: "MSK" },
      { name: "Docker", icon: "docker" },
      { name: "CI/CD pipelines", icon: "githubactions" },
    ],
  },
  {
    key: "architecture",
    label: { en: "Architecture", pt: "Arquitetura" },
    items: [
      { name: "Microservices" },
      { name: "Event-driven" },
      { name: "SSE streaming" },
      { name: "Virtual Threads", icon: "openjdk" },
      { name: "Liquibase", icon: "liquibase" },
      { name: "Keycloak", icon: "keycloak" },
    ],
  },
  {
    key: "data",
    label: { en: "Data & Analytics", pt: "Dados e Analytics" },
    items: [{ name: "Jooq" }, { name: "OLAP" }, { name: "Materialized Views" }],
  },
  {
    key: "other",
    label: { en: "Other", pt: "Outros" },
    items: [
      { name: "Figma", icon: "figma" },
      { name: "Apache Hop", icon: "apache" },
      { name: "Git/GitHub", icon: "github" },
      { name: "Clean Code" },
      { name: "SOLID" },
    ],
  },
];

/** Every item, flat, with the category it came from. */
export const allTech: Array<TechItem & { category: string }> = techCategories.flatMap(
  (c) => c.items.map((item) => ({ ...item, category: c.key })),
);
