---
source_url: https://github.com/kyundae-kim/docmesh-kbms-api/wiki/API
ingested: 2026-09-09
sha256: 285e25ff9c6c7c8cb810485391b5dcf7553dce1cf4738ed01937da9c0189e752
---

# docmesh-kbms REST API — v0.1.0

이 페이지는 `docmesh-kbms-api`의 **API contract v0.1.0** 스냅샷이다. 엔드포인트, 입력, 응답, 오류, 구현 위치, 테스트 위치를 같은 표에서 추적할 수 있도록 작성했다.

## 문서 식별자

| 항목 | 값 |
|---|---|
| API contract version | `0.1.0` |
| OpenAPI `info.version` | `0.1.0` |
| Python project version | [`pyproject.toml`의 `project.version`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/pyproject.toml#L1-L5) |
| FastAPI entrypoint | `app.main:app` |
| Source branch | `kbms-v0.1.0` |
| Source revision | [`09d8edb1c62eb69575a432b6e950553bea11d46b`](https://github.com/kyundae-kim/docmesh-kbms-api/commit/09d8edb1c62eb69575a432b6e950553bea11d46b) |
| 검증 시각 | `2026-09-07T22:06:55Z` |
| Runtime OpenAPI | `GET /openapi.json` |
| Interactive docs | `/docs` (Swagger UI), `/redoc` (ReDoc) |

### 버전 식별 규칙

- 현재 HTTP 경로에는 `/v1` 같은 버전 prefix가 없다. 경로만 보고 버전을 추정하지 말고, 실행 중인 `GET /openapi.json`의 `info.version`과 이 페이지의 source revision을 함께 확인한다.
- `0.1.0`은 [`app/main.py`의 `FastAPI(..., version="0.1.0")`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L170)와 Python project version이 일치하는지로 검증한다.
- 재현 가능한 확인이 필요하면 source branch가 아니라 위의 immutable commit URL을 기준으로 코드와 문서를 비교한다.
- 호환성이 깨지는 API 변경은 새 API version과 새 source revision을 문서 metadata에 기록해야 한다. 예제의 `API_VERSION`도 같은 값으로 갱신한다.

## 공통 계약

- 기본 base URL 예시: `http://localhost:8000`
- JSON 요청의 `Content-Type`: `application/json`
- 업로드 요청의 `Content-Type`: `multipart/form-data`
- 서버가 사용하는 기본 DMS identity: `dms` (`KBMS_USER_ID`로 서버 설정 가능)
- API route가 서버에 전달하는 partition은 고정되어 있다.
  - `partition_kind`: `personal`
  - `partition_id`: `kbms`
- client는 identity, access context, partition 값을 request body/query로 지정하지 않는다. 위 고정값은 [`app/main.py#L26-L27`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L26-L27)과 각 route handler에서 확인할 수 있다.
- 예기치 않은 provider 오류는 서버 오류로 전파된다. 아래 오류 표는 route가 명시적으로 변환하는 domain/input 오류의 계약이다.

## Public HTTP surface

### Application endpoints

아래 표의 `구현`과 `테스트` 링크가 각 public endpoint의 추적 경로다. 테스트 링크는 fake facade를 이용한 application-level 검증이며, 마지막 행의 live integration 테스트는 provider를 포함한 전체 흐름을 검증한다.

| Method | Path | 입력 요약 | 성공 | 구현 | 테스트 |
|---|---|---|---|---|---|
| `GET` | `/health` | 없음 | `200` | [`main.py#L172-L174`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L172-L174) | [`test_app.py#L94-L99`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/unit/test_app.py#L94-L99) |
| `POST` | `/documents` | multipart: `file`, `title`, `source_uri`; optional `document_id`, JSON 문자열 `metadata` | `201` | [`main.py#L176-L195`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L176-L195) | [`test_api.py#L86-L111`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L86-L111) |
| `GET` | `/documents` | query: `cursor`, `limit` | `200` | [`main.py#L197-L208`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L197-L208) | [`test_api.py#L144-L157`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L144-L157) |
| `GET` | `/documents/{document_id}/status` | path: `document_id` | `200` | [`main.py#L210-L218`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L210-L218) | [`test_api.py#L172-L178`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L172-L178) |
| `GET` | `/documents/{document_id}` | path: `document_id` | `200` | [`main.py#L220-L228`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L220-L228) | [`test_api.py#L159-L169`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L159-L169) |
| `GET` | `/documents/{document_id}/content` | path: `document_id` | `200` + 원본 bytes | [`main.py#L230-L240`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L230-L240) | [`test_api.py#L128-L141`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L128-L141) |
| `DELETE` | `/documents/{document_id}` | path: `document_id`; query: `hard_delete` | `204` | [`main.py#L242-L250`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L242-L250) | [`test_api.py#L180-L193`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L180-L193) |
| `POST` | `/search` | JSON: `query`, `limit`, optional `document_id` | `200` | [`main.py#L252-L261`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L252-L261) | [`test_api.py#L63-L83`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L63-L83) |
실제 provider를 사용하는 전체 lifecycle 검증은 [`test_real_integration.py#L17-L101`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/integration/test_real_integration.py#L17-L101)에서 upload → status → list → metadata → content → search → delete → deleted status 순서로 수행한다.

### FastAPI framework endpoints

애플리케이션 route 외에도 FastAPI가 다음 public 문서 endpoint를 자동으로 제공한다. 이 endpoint들은 API business operation이 아니라 동일한 `app`에서 생성되는 문서 surface다.

| Method | Path | 용도 | 추적 위치 |
|---|---|---|---|
| `GET`, `HEAD` | `/openapi.json` | versioned OpenAPI document | [`FastAPI` app construction](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L170) |
| `GET`, `HEAD` | `/docs` | Swagger UI | 위와 동일 |
| `GET`, `HEAD` | `/docs/oauth2-redirect` | Swagger UI callback | 위와 동일 |
| `GET`, `HEAD` | `/redoc` | ReDoc | 위와 동일 |

## Endpoint details

### `GET /health`

응답:

```
{"status":"ok"}
```

### `POST /documents`

`multipart/form-data` 필드:

| 필드 | 필수 | 형식 | 설명 |
|---|---|---|---|
| `file` | 예 | file | 원본 파일. `content_type`이 없으면 `application/octet-stream`으로 전달된다. |
| `title` | 예 | string | 문서 title |
| `source_uri` | 예 | string | 원본 source URI |
| `document_id` | 아니오 | string | 지정하지 않으면 domain이 생성한다. |
| `metadata` | 아니오 | JSON object 문자열 | 예: `{"team":"platform"}`. 배열/문자열/잘못된 JSON은 `422`다. |
성공 응답 `201`은 현재 FastAPI `jsonable_encoder` 결과 기준으로 다음 형태다. 시간, checksum, 상태 값은 실행 결과에 따라 바뀐다.

```
{
  "document_id": "doc-123",
  "metadata": {
    "document_id": "doc-123",
    "original_filename": "guide.txt",
    "content_type": "text/plain",
    "file_size": 12,
    "status": "uploaded",
    "created_at": "2026-01-01T00:00:00+00:00",
    "updated_at": "2026-01-01T00:00:00+00:00",
    "partition": {
      "kind": "personal",
      "partition_id": "kbms"
    },
    "checksum": "sha256:...",
    "deleted_at": null,
    "created_by": "dms",
    "extra_metadata": {
      "team": "platform"
    }
  },
  "created": true
}
```

> `extra_metadata`는 현재 response object를 dataclass로 JSON encode할 때의 실제 필드명이다. SDK의 별도 `to_public_dict()` 표현과 혼동하지 않는다.

### `GET /documents`

query parameter:

| 이름 | 기본값 | 제약 | 설명 |
|---|---|---|---|
| `cursor` | 없음 | string 또는 null | 이전 page의 `next_cursor` |
| `limit` | `100` | `1 <= limit <= 1000` | page 크기 |
응답 `200`:

```
{
  "items": [
    {
      "document_id": "doc-123",
      "filename": "guide.txt",
      "content_type": "text/plain",
      "file_size": 12,
      "status": "available",
      "created_at": "2026-01-01T00:00:00+00:00",
      "updated_at": "2026-01-01T00:00:00+00:00",
      "partition_kind": "personal",
      "partition_id": "kbms",
      "checksum": "sha256:...",
      "created_by": "dms",
      "metadata": {
        "team": "platform"
      }
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

`has_more`가 `true`이면 다음 요청의 `cursor`에 `next_cursor`를 그대로 전달한다.

### `GET /documents/{document_id}/status`

응답 `200`:

```
{
  "document_id": "doc-123",
  "status": "indexed",
  "chunks_count": 3,
  "error": null,
  "updated_at": "2026-01-01T00:00:00+00:00"
}
```

pipeline 상태는 provider/pipeline 진행에 따라 달라질 수 있다. live lifecycle 테스트에서는 `indexed`와 삭제 후 `deleted`를 확인한다. facade가 `None`을 반환하면 `404`다.

### `GET /documents/{document_id}`

응답 `200`은 list item과 같은 `KnowledgeDocument` 표현이다. `filename`, `content_type`, `file_size`, `status`, `created_at`, `updated_at`, `partition_kind`, `partition_id`, `checksum`, `created_by`, `metadata` 필드를 포함한다.

### `GET /documents/{document_id}/content`

응답 `200`:

- body: 저장된 원본 bytes
- `Content-Type`: 저장된 문서의 content type
- `Content-Disposition`: `attachment; filename="<sanitized filename>"`
이 route는 JSON을 반환하지 않는다. filename의 backslash, quote, CR/LF는 response header injection을 막기 위해 정리된다.

### `DELETE /documents/{document_id}`

query parameter:

| 이름 | 기본값 | 설명 |
|---|---|---|
| `hard_delete` | `false` | domain DMS 문서를 hard delete할지 여부 |
성공 시 body가 없는 `204 No Content`다. live integration 예제는 `hard_delete=true`를 사용하고 삭제 후 status를 다시 조회한다.

### `POST /search`

JSON body:

| 필드 | 필수 | 제약 |
|---|---|---|
| `query` | 예 | string |
| `limit` | 아니오 | integer, `> 0`, 기본값 `5` |
| `document_id` | 아니오 | string 또는 null |
`SearchRequest`는 unknown field를 허용하지 않는다. 응답 `200`은 검색 hit 배열이다.

```
[
  {
    "document_id": "doc-123",
    "chunk_index": 0,
    "text": "knowledge document",
    "score": 0.9123,
    "start": null,
    "end": null,
    "source_uri": "https://example.test/guide"
  }
]
```

### 오류 상태 매핑

| HTTP | 원인 |
|---|---|
| `403` | `AccessDeniedError`, `PermissionError` |
| `404` | `DocumentNotFoundError`, status 조회 결과 `None` |
| `409` | `DuplicateDocumentError` |
| `410` | `DocumentDeletedError` |
| `413` | `PayloadTooLargeError` |
| `422` | FastAPI request validation, `TypeError`, `ValidationError`, `ValueError` |
| `500` 계열 | 위에서 명시하지 않은 예기치 않은 오류 |
`HTTPException`의 domain/input 오류 body는 일반적으로 `{"detail":"<message>"}`이고, FastAPI schema validation 오류는 `detail` 배열이다. 현재 OpenAPI 생성 결과는 기본적으로 `422`를 선언하며, 위 domain 오류는 handler의 [`_raise_http`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L54-L67) 구현으로 추적한다.
