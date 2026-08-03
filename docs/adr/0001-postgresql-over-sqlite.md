# PostgreSQL over SQLite

Single-user app, but we chose PostgreSQL for full-text search (tsvector + GIN), JSONB indexing on Tiptap document content, and pg_trgm for fuzzy vocabulary search. SQLite would suffice for storage but lacks these features without extensions. The trade-off is ~200–500 MB extra RAM on the Oracle server (24 GB available) and an additional Docker container.
