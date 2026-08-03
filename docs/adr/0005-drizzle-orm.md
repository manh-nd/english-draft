# Drizzle ORM over Prisma

We use Drizzle for database access instead of Prisma. Drizzle is TypeScript-first with SQL-like syntax, no binary engine dependency, and smaller Docker images. Prisma's Rust query engine adds cold-start latency and binary size that matters on a self-hosted 4-core server.

Considered: Prisma (more mature migration tooling but heavier runtime), raw SQL with pg driver (maximum control but no migration tool or type generation).
