/**
 * Utilities for parsing and formatting rich vocabulary data
 * (phonetics/IPA, parts of speech, bilingual definitions, SRS status, and audio playback).
 */

export interface ParsedVocabulary {
  phrase: string;
  ipa: string | null;
  partOfSpeech: string | null;
  enDefinition: string | null;
  viDefinition: string | null;
}

const POS_KEYWORDS: readonly string[] = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "idiom",
  "phrase",
  "phrasal verb",
  "n",
  "v",
  "adj",
  "adv",
  "prep",
  "conj",
];

/**
 * Normalizes short part of speech abbreviations to full names.
 */
export function normalizePartOfSpeech(pos: string): string {
  const lower = pos
    .toLowerCase()
    .replace(/[.[\]()]/g, "")
    .trim();
  switch (lower) {
    case "n":
      return "noun";
    case "v":
      return "verb";
    case "adj":
      return "adjective";
    case "adv":
      return "adverb";
    case "prep":
      return "preposition";
    case "conj":
      return "conjunction";
    case "phr":
      return "phrase";
    default:
      return lower;
  }
}

/**
 * Parses raw definition string which may contain IPA, POS tags, and bilingual definitions.
 * Example formats:
 * - "/kəmˈpæʃ.ən/ (noun) A strong feeling of sympathy • Lòng trắc ẩn"
 * - "[adj.] extremely large or great | Vô cùng to lớn"
 * - "noun - to make something better"
 * - "A feeling of deep sympathy"
 */
export function parseVocabularyDefinition(
  rawDefinition: string | null | undefined,
  phrase?: string
): ParsedVocabulary {
  const result: ParsedVocabulary = {
    phrase: phrase ?? "",
    ipa: null,
    partOfSpeech: null,
    enDefinition: null,
    viDefinition: null,
  };

  if (!rawDefinition || rawDefinition.trim().length === 0) {
    return result;
  }

  let text = rawDefinition.trim();

  // 1. Extract IPA phonetic transcription (e.g. /.../ or [...])
  const ipaSlashMatch = text.match(/\/([^/]+)\//);
  if (ipaSlashMatch) {
    result.ipa = `/${ipaSlashMatch[1].trim()}/`;
    text = text.replace(ipaSlashMatch[0], "").trim();
  } else {
    const ipaBracketMatch = text.match(/\[([^\]]+)\]/);
    // Check if bracket contains IPA symbols or is POS tag
    if (
      ipaBracketMatch &&
      !POS_KEYWORDS.includes(ipaBracketMatch[1].toLowerCase().replace(".", ""))
    ) {
      result.ipa = `[${ipaBracketMatch[1].trim()}]`;
      text = text.replace(ipaBracketMatch[0], "").trim();
    }
  }

  // 2. Extract Part of Speech (e.g. (noun), (adj.), [verb], n., v., adj.)
  const posParenMatch = text.match(/\(([a-zA-Z. ]+)\)/);
  if (posParenMatch) {
    const candidate = posParenMatch[1].trim().toLowerCase().replace(".", "");
    if (POS_KEYWORDS.includes(candidate)) {
      result.partOfSpeech = normalizePartOfSpeech(candidate);
      text = text.replace(posParenMatch[0], "").trim();
    }
  }

  if (!result.partOfSpeech) {
    const posPrefixMatch = text.match(/^([a-zA-Z]+)\.\s+/);
    if (posPrefixMatch) {
      const candidate = posPrefixMatch[1].trim().toLowerCase();
      if (POS_KEYWORDS.includes(candidate)) {
        result.partOfSpeech = normalizePartOfSpeech(candidate);
        text = text.replace(posPrefixMatch[0], "").trim();
      }
    }
  }

  // Clean leading/trailing punctuation left by extractions
  text = text.replace(/^[-:•|/,\s]+/, "").trim();

  // 3. Extract bilingual definitions if separated by •, |, //, or \n
  const splitDelimiters = [" • ", " | ", " // ", "\n", " - "];
  let foundSplit: [string, string] | null = null;

  for (const delim of splitDelimiters) {
    if (text.includes(delim)) {
      const parts = text
        .split(delim)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        foundSplit = [parts[0], parts.slice(1).join(" • ")];
        break;
      }
    }
  }

  if (foundSplit) {
    result.enDefinition = foundSplit[0];
    result.viDefinition = foundSplit[1];
  } else {
    result.enDefinition = text.length > 0 ? text : null;
  }

  return result;
}

export type SrsStatusVariant =
  "due" | "mastered" | "learning" | "new" | "unscheduled";

export interface SrsStatusInfo {
  variant: SrsStatusVariant;
  label: string;
  badgeClass: string;
  isDue: boolean;
  description: string;
}

/**
 * Computes human-friendly SRS status and badge properties.
 */
export function getSrsStatus(
  reviewItem?: {
    interval: number;
    easeFactor: number;
    nextReviewAt: Date | string;
    lastReviewedAt?: Date | string | null;
  } | null
): SrsStatusInfo {
  if (!reviewItem) {
    return {
      variant: "unscheduled",
      label: "New",
      badgeClass:
        "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
      isDue: false,
      description: "Not yet practiced",
    };
  }

  const nextDate = new Date(reviewItem.nextReviewAt);
  const now = new Date();
  const isDue = nextDate.getTime() <= now.getTime();

  if (isDue) {
    return {
      variant: "due",
      label: "Due for Review",
      badgeClass:
        "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold",
      isDue: true,
      description: "Needs practice today",
    };
  }

  if (reviewItem.interval >= 21 || reviewItem.easeFactor >= 2.6) {
    return {
      variant: "mastered",
      label: "Mastered",
      badgeClass:
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      isDue: false,
      description: `Interval: ${reviewItem.interval}d (Ease ${reviewItem.easeFactor.toFixed(1)})`,
    };
  }

  if (reviewItem.interval >= 3) {
    return {
      variant: "learning",
      label: `Review in ${Math.max(1, Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))}d`,
      badgeClass:
        "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
      isDue: false,
      description: `Interval: ${reviewItem.interval}d`,
    };
  }

  return {
    variant: "learning",
    label: "Learning",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    isDue: false,
    description: `Interval: ${reviewItem.interval}d`,
  };
}

/**
 * Triggers English speech synthesis in the browser.
 */
export function speakPhrase(phrase: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(phrase);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
