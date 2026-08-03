# English Draft

A self-hosted web application for learning English through real work — writing emails, docs, proposals, and notes — with AI-powered grammar correction, vocabulary building, and spaced repetition review.

## Language

### Content

**Document**:
A piece of written content created by the user — an email draft, a technical doc, a proposal, meeting notes, or any free-form English text. Stored as a Tiptap/ProseMirror JSON tree with a parallel plain-text extraction for search.
_Avoid_: Page, note, file

**Folder**:
A flat grouping mechanism for Documents. Each Document belongs to at most one Folder.
_Avoid_: Workspace, space, category

### AI Assistance

**Inline Suggestion**:
An AI-generated correction or improvement that appears directly in the editor when the user selects text. Operates on the selected text plus surrounding context.
_Avoid_: Autocomplete, hint

**Side Panel**:
A persistent chat interface beside the editor where the user can ask the AI to explain, translate, or discuss content from the current Document in depth.
_Avoid_: Sidebar chat, chatbot

**Correction**:
A recorded instance where the AI changed the user's text — capturing the original text, the corrected text, the error type (grammar, vocabulary, style), and the surrounding context. Auto-saved to the Correction Bank on every accepted Inline Suggestion.
_Avoid_: Error, mistake, fix

**Correction Bank**:
The collection of all Corrections. Each entry can be starred for priority review. Source data for the Review System.
_Avoid_: Error log, mistake history

### Learning & Review

**Vocabulary Item**:
A word or phrase the user explicitly saves for later review — either from an Inline Suggestion, from the Side Panel, or by selecting text and choosing "Save to review."
_Avoid_: Flashcard, card, word

**Review Item**:
The union of Corrections and Vocabulary Items that are scheduled for review. Each Review Item carries SRS scheduling metadata (interval, ease factor, next review date).
_Avoid_: Card, entry

**Review Session**:
A timed practice session where the SRS engine presents due Review Items as AI-generated exercises. The user must respond actively (typing, rewriting) — never passive multiple choice.
_Avoid_: Quiz, test, drill

**Exercise**:
An AI-generated active-recall task based on a Review Item. Types include fill-in-the-blank, rewrite/correct, translation, and free writing prompt. The AI selects the exercise type based on the Review Item's error type and history.
_Avoid_: Question, problem, challenge

### Infrastructure

**Key Pool**:
The set of Gemini API keys available for rotation. Requests cycle through keys round-robin; on rate-limit (429), the next key is tried. When all keys for a model are exhausted, the system cascades to a lighter model before reporting an error.
_Avoid_: API key list, key ring
