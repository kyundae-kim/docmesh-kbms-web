# Wiki Schema

## Domain
지식 저장소 관리 시스템 웹 개발: 지식의 수집·정리·검색·공유를 지원하는 웹 애플리케이션의 제품 요구사항, UX, 아키텍처, 구현, 운영, 품질을 기록한다.

## Language and Scope
- 본문은 한국어를 우선하되, 제품명·라이브러리명·API 식별자·코드 심볼은 원문을 보존한다.
- 이 위키는 시스템 개발에 직접 관련된 사실, 설계 결정, 구현 지식, 검증 결과, 조사 결과를 다룬다.
- 개인적인 일반 지식이나 프로젝트와 무관한 기술 내용은 만들지 않는다.
- 사실, 제안, 결정, 미해결 질문을 문맥상 명확히 구분한다.

## Conventions
- 파일 이름: 소문자와 하이픈만 사용하고 공백은 쓰지 않는다(예: `knowledge-search.md`).
- 모든 위키 페이지는 아래 YAML frontmatter로 시작한다.
- 페이지 간 연결에는 `[[wikilinks]]`를 사용한다. 새 페이지와 수정 페이지는 최소 2개의 유효한 outbound link를 갖는다.
- 페이지를 수정할 때마다 `updated` 날짜를 갱신한다.
- 새 페이지는 반드시 `index.md`의 올바른 섹션에 알파벳순으로 추가한다.
- 모든 작업은 `log.md`에 append-only 형식으로 기록한다.
- `raw/`는 불변 원본 계층이다. 원본을 고치지 말고, 정정·해석·요약은 Layer 2 페이지에 반영한다.
- 3개 이상 원본을 종합한 페이지는 출처별 주장이 있는 문단 끝에 `^[raw/articles/source-file.md]` 형식의 provenance marker를 붙인다.
- 기술 조사나 빠르게 변하는 정보는 `confidence: medium` 또는 `low`를 사용한다. 여러 독립 출처로 확인된 내용만 `high`로 표시한다.
- 설계 제안과 확정 결정은 구분한다. 확정된 결정은 관련 페이지와 함께 결정 근거와 영향 범위를 기록한다.

## Frontmatter
```yaml
---
title: Page Title
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: entity | concept | comparison | query | summary
tags: [from taxonomy below]
sources: [raw/articles/source-name.md]
# Optional quality signals:
confidence: high | medium | low
contested: true
contradictions: [other-page-slug]
---
```

## Raw Source Frontmatter
Raw sources also begin with this block. The SHA-256 is calculated over the body after the closing `---`, excluding frontmatter.

```yaml
---
source_url: https://example.com/article
ingested: YYYY-MM-DD
sha256: <hex digest of the raw content below the frontmatter>
---
```

On re-ingest, recompute the body hash. Skip unchanged sources; flag drift when the hash differs.

## Tag Taxonomy
Every page tag must be listed here. Add a tag here before using it.

### Product and UX
- `product`: product scope, goals, personas, and value
- `requirements`: functional and non-functional requirements
- `ux`: information architecture, interaction, and visual design

### Engineering
- `architecture`: system structure and technical boundaries
- `frontend`: browser, UI, and client-side implementation
- `backend`: server-side services and application logic
- `data`: schemas, storage, migrations, and data lifecycle
- `api`: API contracts and protocols
- `search`: indexing, retrieval, ranking, and discovery
- `integration`: external systems and third-party services

### Quality and Operations
- `security`: authentication, authorization, privacy, and threat handling
- `testing`: test strategy, fixtures, and verification
- `performance`: latency, throughput, and resource efficiency
- `accessibility`: inclusive and assistive-technology support
- `operations`: deployment, monitoring, backups, and incident response

### Meta
- `decision`: architecture or product decision records
- `comparison`: side-by-side evaluations
- `open-question`: unresolved issue or research question

## Page Thresholds
- Create a page when an entity or concept appears in 2+ sources, or is central to one source.
- Add information to an existing page when a new source mentions something already covered.
- Do not create pages for passing mentions, minor details, or topics outside this domain.
- Split a page when it exceeds approximately 200 lines; link the new sub-pages.
- Archive a page when its content is fully superseded: move it to `_archive/`, remove it from the index, and repair inbound links.

## Page Types
- **Entity:** a notable product, project, library, service, organization, or person.
- **Concept:** a technical or product topic, such as knowledge ingestion or hybrid search.
- **Comparison:** a side-by-side evaluation of alternatives with a synthesis.
- **Query:** a durable answer that would be costly to re-derive.
- **Summary:** a compact overview of a broader area, linked to detail pages.

## Update Policy
When new information conflicts with existing content:
1. Check source dates; newer sources generally supersede older ones.
2. If both claims remain relevant, retain both with dates and source references.
3. Mark the page with `contested: true` and add the conflicting page to `contradictions:` when applicable.
4. Surface the conflict in the next lint report; never silently overwrite a material disagreement.

## Quality Checks
A healthy wiki has no broken wikilinks, no unindexed pages, and no unexplained orphan pages. Every page must have complete frontmatter, taxonomy-valid tags, source references, and meaningful cross-links. Pages over 200 lines, low-confidence pages, single-source pages without a confidence field, stale pages, source hash drift, and log files over 500 entries require review.
