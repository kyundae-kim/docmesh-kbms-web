---
title: 문서 API lifecycle
created: 2026-09-09
updated: 2026-09-09
type: concept
tags: [api, backend, data, testing, requirements]
sources: [raw/articles/docmesh-kbms-api-api-v0-1-0.md, raw/articles/docmesh-kbms-api-examples-v0-1-0.md]
confidence: medium
---

# 문서 API lifecycle

## 정의

`docmesh-kbms`의 문서 API는 원본 파일과 metadata를 저장한 뒤 pipeline 상태와 검색 가능 여부를 확인하고, 필요하면 원본을 조회하거나 삭제하는 HTTP 흐름이다. 대표적인 provider 포함 흐름은 업로드 → 상태 → 목록 → metadata → content → 검색 → 삭제 → 삭제 상태 확인 순서다.

## Endpoint 계약

| Method | Path | 성공 | 핵심 입력·동작 |
| --- | --- | --- | --- |
| `GET` | `/health` | `200` | `{"status":"ok"}` |
| `POST` | `/documents` | `201` | multipart `file`, `title`, `source_uri`; 선택 `document_id`, JSON object 문자열 `metadata` |
| `GET` | `/documents` | `200` | cursor pagination: `cursor`, `limit` |
| `GET` | `/documents/{document_id}/status` | `200` | pipeline 상태, `chunks_count`, 오류, 갱신 시각 |
| `GET` | `/documents/{document_id}` | `200` | 문서 `KnowledgeDocument` metadata |
| `GET` | `/documents/{document_id}/content` | `200` | JSON이 아닌 저장 원본 bytes |
| `DELETE` | `/documents/{document_id}` | `204` | `hard_delete` query로 hard delete 여부 선택 |

구현 위치와 application/live 테스트 위치는 [API contract raw source](../raw/articles/docmesh-kbms-api-api-v0-1-0.md)의 endpoint 표에서 추적한다.

## 업로드 계약

`POST /documents`는 `multipart/form-data`를 사용한다.

- 필수: `file`, `title`, `source_uri`
- 선택: `document_id`, `metadata`
- `metadata`는 JSON object를 문자열 field로 전달해야 한다.
- 배열, 문자열, 잘못된 JSON은 `422`이며 대표 detail은 `metadata must be a JSON object`다.
- identity와 `personal/kbms` partition은 서버가 주입하므로 client가 요청에 넣지 않는다.
- 성공 응답은 `document_id`, `metadata`, `created: true`를 포함한다. metadata 안에는 원본 파일명, content type, 크기, 상태, partition, checksum, 삭제 시각, 생성자, `extra_metadata`가 나타난다.

## 목록, 상태, 원본 조회

`GET /documents`의 `limit` 기본값은 `100`, 허용 범위는 `1 <= limit <= 1000`이다. 응답의 `has_more`가 `true`이면 `next_cursor`를 다음 요청의 `cursor`에 그대로 전달한다.

상태 응답은 `document_id`, `status`, `chunks_count`, `error`, `updated_at`을 제공한다. provider pipeline이 끝나기 전에는 상태가 달라질 수 있으므로 client는 상태 endpoint를 기준으로 후속 동작을 결정해야 한다. live integration 예제는 `indexed`와 삭제 뒤 `deleted`를 확인한다.

`GET /documents/{document_id}/content`는 JSON 대신 원본 bytes를 반환한다. 저장된 content type을 `Content-Type`에 사용하고, sanitized filename을 포함한 `Content-Disposition: attachment`를 보낸다. filename의 backslash, quote, CR/LF는 response header injection 방지를 위해 정리된다.

## 삭제와 오류

`DELETE /documents/{document_id}`의 `hard_delete` 기본값은 `false`이며 성공 응답은 body 없는 `204 No Content`다. 실제 예제에서 완전 삭제와 후속 상태 확인이 필요할 때 `hard_delete=true`를 명시한다.

| HTTP | 명시적 원인 |
| --- | --- |
| `403` | `AccessDeniedError`, `PermissionError` |
| `404` | `DocumentNotFoundError`, status 결과 `None` |
| `409` | `DuplicateDocumentError` |
| `410` | `DocumentDeletedError` |
| `413` | `PayloadTooLargeError` |
| `422` | request validation, `TypeError`, `ValidationError`, `ValueError` |
| `500` 계열 | 위에서 변환하지 않은 예기치 않은 오류 |

## 관련 페이지

- [[docmesh-kbms-api]] — 공통 version, provider, partition 경계
- [[semantic-search-api]] — lifecycle 후 수행하는 검색 계약

## 출처

- [API contract raw source](../raw/articles/docmesh-kbms-api-api-v0-1-0.md)
- [Examples raw source](../raw/articles/docmesh-kbms-api-examples-v0-1-0.md)
