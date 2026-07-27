export type EventCategory =
  | "fed_decision"
  | "tariff"
  | "election"
  | "banking_crisis"
  | "exogenous_shock";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  fed_decision: "Fed Decision",
  tariff: "Tariff",
  election: "Election",
  banking_crisis: "Banking Crisis",
  exogenous_shock: "Exogenous Shock",
};

export const CATEGORY_CLASSES: Record<EventCategory, string> = {
  fed_decision:
    "bg-[var(--cat-fed)] text-[var(--cat-fed-fg)]",
  tariff:
    "bg-[var(--cat-tariff)] text-[var(--cat-tariff-fg)]",
  election:
    "bg-[var(--cat-election)] text-[var(--cat-election-fg)]",
  banking_crisis:
    "bg-[var(--cat-banking)] text-[var(--cat-banking-fg)]",
  exogenous_shock:
    "bg-[var(--cat-shock)] text-[var(--cat-shock-fg)]",
};

export function getCategoryClasses(category: string): string {
  return CATEGORY_CLASSES[category as EventCategory] ?? "";
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as EventCategory] ?? category;
}
