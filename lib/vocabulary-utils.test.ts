import { describe, expect, it } from "bun:test";
import {
  parseVocabularyDefinition,
  normalizePartOfSpeech,
  getSrsStatus,
} from "./vocabulary-utils";

describe("vocabulary-utils", () => {
  describe("normalizePartOfSpeech", () => {
    it("normalizes short abbreviations", () => {
      expect(normalizePartOfSpeech("n.")).toBe("noun");
      expect(normalizePartOfSpeech("(v.)")).toBe("verb");
      expect(normalizePartOfSpeech("[adj]")).toBe("adjective");
      expect(normalizePartOfSpeech("adv")).toBe("adverb");
      expect(normalizePartOfSpeech("prep")).toBe("preposition");
    });
  });

  describe("parseVocabularyDefinition", () => {
    it("handles null or empty string", () => {
      const res = parseVocabularyDefinition(null, "test");
      expect(res.phrase).toBe("test");
      expect(res.ipa).toBeNull();
      expect(res.partOfSpeech).toBeNull();
      expect(res.enDefinition).toBeNull();
      expect(res.viDefinition).toBeNull();
    });

    it("parses full formatted string with IPA, POS, and bilingual definition", () => {
      const input =
        "/kəmˈpæʃ.ən/ (noun) A strong feeling of sympathy • Lòng trắc ẩn";
      const res = parseVocabularyDefinition(input, "compassion");

      expect(res.phrase).toBe("compassion");
      expect(res.ipa).toBe("/kəmˈpæʃ.ən/");
      expect(res.partOfSpeech).toBe("noun");
      expect(res.enDefinition).toBe("A strong feeling of sympathy");
      expect(res.viDefinition).toBe("Lòng trắc ẩn");
    });

    it("parses definition with bracketed IPA and pipe separator", () => {
      const input =
        "[ˌrev.əˈluː.ʃən] (n.) A forcible overthrow of a government | Cuộc cách mạng";
      const res = parseVocabularyDefinition(input, "revolution");

      expect(res.ipa).toBe("[ˌrev.əˈluː.ʃən]");
      expect(res.partOfSpeech).toBe("noun");
      expect(res.enDefinition).toBe("A forcible overthrow of a government");
      expect(res.viDefinition).toBe("Cuộc cách mạng");
    });

    it("parses prefix POS format like 'adj. very large in size'", () => {
      const input = "adj. very large in size";
      const res = parseVocabularyDefinition(input, "huge");

      expect(res.partOfSpeech).toBe("adjective");
      expect(res.enDefinition).toBe("very large in size");
      expect(res.viDefinition).toBeNull();
    });

    it("handles simple unformatted plain text", () => {
      const input = "A feeling of deep affection";
      const res = parseVocabularyDefinition(input, "love");

      expect(res.ipa).toBeNull();
      expect(res.partOfSpeech).toBeNull();
      expect(res.enDefinition).toBe("A feeling of deep affection");
      expect(res.viDefinition).toBeNull();
    });
  });

  describe("getSrsStatus", () => {
    it("returns unscheduled status when no reviewItem is provided", () => {
      const status = getSrsStatus(null);
      expect(status.variant).toBe("unscheduled");
      expect(status.label).toBe("New");
      expect(status.isDue).toBe(false);
    });

    it("returns due status when nextReviewAt is in the past", () => {
      const status = getSrsStatus({
        interval: 1,
        easeFactor: 2.5,
        nextReviewAt: new Date(Date.now() - 1000 * 60 * 60),
      });
      expect(status.variant).toBe("due");
      expect(status.isDue).toBe(true);
      expect(status.label).toBe("Due for Review");
    });

    it("returns mastered status when interval is high", () => {
      const status = getSrsStatus({
        interval: 25,
        easeFactor: 2.8,
        nextReviewAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
      });
      expect(status.variant).toBe("mastered");
      expect(status.isDue).toBe(false);
      expect(status.label).toBe("Mastered");
    });

    it("returns learning status with days remaining when scheduled ahead", () => {
      const status = getSrsStatus({
        interval: 4,
        easeFactor: 2.5,
        nextReviewAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
      });
      expect(status.variant).toBe("learning");
      expect(status.isDue).toBe(false);
      expect(status.label).toContain("Review in");
    });
  });
});
