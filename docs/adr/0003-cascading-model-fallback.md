# Cascading model fallback for Gemini API

AI tasks use two tiers of Gemini models. Free tier rate limits per key:

- **gemini-3.5-flash-lite**: 15 RPM, 250K TPM, 500 RPD — primary model for all tasks (inline suggestions, side panel chat)
- **gemini-3.5-flash / gemini-3.6-flash**: 5 RPM, 250K TPM, 20 RPD each — reserved for high-value tasks only (exercise generation, grading)

With 5 keys, effective daily budget: ~2500 RPD Flash Lite, ~200 RPD Flash-class (combined 3.5 + 3.6).

Multiple API keys rotate round-robin per model. On rate-limit (429): try the next key for the same model. When all keys for a model are exhausted, cascade down: Flash → Flash Lite → user-facing error. This means the user almost always gets a response, at worst with slightly reduced quality.

Considered: single model for everything (simpler but wastes Flash-class quota on trivial tasks), hard error on rate limit (bad UX), per-key usage tracking (over-engineered for the traffic level).
