# Cascading model fallback for Gemini API

AI tasks use two Gemini models: gemini-3.5-flash-lite (inline suggestions — fast, high quota) and gemini-3.6-flash (side panel chat, exercise generation, grading — higher quality). Multiple API keys rotate round-robin per model.

On rate-limit (429): try the next key for the same model. When all keys for a model are exhausted, cascade down: 3.6-flash → 3.5-flash-lite → user-facing error. This means the user almost always gets a response, at worst with slightly reduced quality.

Considered: single model for everything (simpler but wastes quota on trivial tasks), hard error on rate limit (bad UX), per-key usage tracking (over-engineered for the traffic level).
