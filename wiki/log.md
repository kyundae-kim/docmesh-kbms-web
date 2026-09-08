# Wiki Log

> 위키의 모든 작업을 시간순으로 기록한다. Append-only.
> 형식: `## [YYYY-MM-DD] action | subject`
> Actions: ingest, update, query, lint, create, archive, delete
> 500개 항목을 넘으면 `log-YYYY.md`로 회전한다.

## [2026-09-09] create | Wiki initialized
- Domain: 지식 저장소 관리 시스템 웹 개발
- Path: `/workspaces/docmesh-kbms-web/wiki`
- Structure created: `SCHEMA.md`, `index.md`, `log.md`, `raw/`, `entities/`, `concepts/`, `comparisons/`, `queries/`
- Pages created: 0

## [2026-09-09] ingest | docmesh-kbms API v0.1.0
- Sources captured:
  - `raw/articles/docmesh-kbms-api-api-v0-1-0.md`
  - `raw/articles/docmesh-kbms-api-examples-v0-1-0.md`
- Layer 2 pages created:
  - `entities/docmesh-kbms-api.md`
  - `concepts/document-api-lifecycle.md`
  - `concepts/semantic-search-api.md`
- Navigation updated: `index.md` (`Total pages: 3`)
- Files updated: `index.md`, `log.md`

## [2026-09-09] update | raw source hash metadata verified
- Recomputed SHA-256 over the captured raw bodies and aligned the frontmatter values.
- Files updated: `raw/articles/docmesh-kbms-api-api-v0-1-0.md`, `raw/articles/docmesh-kbms-api-examples-v0-1-0.md`, `log.md`
