import { ru } from "./dictionaries/ru";
import { en } from "./dictionaries/en";

export type Locale = "ru" | "en";

export function getDictionary(locale: string | null | undefined) {
  if (locale === "en") {
    return en;
  }

  return ru;
}