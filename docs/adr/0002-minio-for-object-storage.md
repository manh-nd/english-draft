# MinIO for object storage

Images uploaded in the editor are stored in a self-hosted MinIO instance (S3-compatible) rather than the local filesystem or cloud storage. MinIO runs as a Docker container alongside the app. This adds one more container but gives us S3 API compatibility — if we ever move to cloud storage (R2, S3), only the endpoint config changes, not the upload code.

Considered: local filesystem (simplest, but no S3 API, harder to migrate), Cloudflare R2 (reliable but adds external dependency and cost).
