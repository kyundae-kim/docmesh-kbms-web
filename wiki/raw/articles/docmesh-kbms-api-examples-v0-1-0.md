---
source_url: https://github.com/kyundae-kim/docmesh-kbms-api/wiki/Examples
ingested: 2026-09-09
sha256: 88110b6c2f960d01beb062c3d4a8450c6ce9df844469682d54d7dadfcd8df9dc
---

# docmesh-kbms API Examples — v0.1.0

이 페이지의 모든 요청은 [API contract v0.1.0](API)의 endpoint와 동일한 source revision을 기준으로 한다.

## 실행 전 설정

애플리케이션을 local에서 실행하는 예시다. 애플리케이션은 startup 때 SQLite, Milvus, MinIO, Ollama provider를 구성하므로 provider 설정은 실제 환경에 맞게 조정한다.

```
uv sync
KBMS_MINIO_ENDPOINT=localhost:9000 uv run fastapi dev
```

기본 설정과 provider 연결 확인은 repository [`README.md`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/README.md)를 참조한다. Docker Compose 네트워크 안에서는 `KBMS_MINIO_ENDPOINT=minio:9000`을 사용한다.

공통 변수:

```
export BASE_URL="http://localhost:8000"
export API_VERSION="0.1.0"
export SOURCE_REVISION="09d8edb1c62eb69575a432b6e950553bea11d46b"
export DOCUMENT_ID="doc-123"
```

`API_VERSION`과 `SOURCE_REVISION`은 요청 header가 아니라 이 예제를 실행한 contract/source를 기록하는 변수다. 서버가 실제로 제공하는 버전은 `/openapi.json`의 `info.version`으로 확인한다.

## 1. API version과 OpenAPI 확인

```
curl --fail-with-body -sS "$BASE_URL/openapi.json" \
  | jq '{title: .info.title, version: .info.version, paths: (.paths | keys)}'
```

기대되는 version:

```
{
  "title": "docmesh-kbms REST API",
  "version": "0.1.0",
  "paths": [
    "/documents",
    "/documents/{document_id}",
    "/documents/{document_id}/content",
    "/documents/{document_id}/status",
    "/health",
    "/search"
  ]
}
```

> `/docs`와 `/redoc`은 UI이고, `/openapi.json`은 machine-readable contract다. 위 결과의 `version`이 `0.1.0`이 아니면 이 페이지의 예제를 그대로 사용하지 말고 해당 API 문서 revision을 확인한다.

## 2. Health check — `GET /health`

```
curl --fail-with-body -sS "$BASE_URL/health"
```

응답:

```
{"status":"ok"}
```

구현 추적: [`app/main.py#L172-L174`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L172-L174)

## 3. 문서 업로드 — `POST /documents`

`metadata`는 JSON object를 multipart string field로 전달한다. `personal/kbms` partition과 `dms` identity는 server가 넣으므로 요청에 포함하지 않는다.

```
curl --fail-with-body -sS -X POST "$BASE_URL/documents" \
  -F 'file=@./guide.txt;type=text/plain' \
  --form-string 'title=Platform guide' \
  --form-string 'source_uri=https://example.test/guide' \
  --form-string "document_id=$DOCUMENT_ID" \
  --form-string 'metadata={"team":"platform","source":"manual"}'
```

대표 응답 `201`:

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
      "team": "platform",
      "source": "manual"
    }
  },
  "created": true
}
```

구현/테스트 추적: [`main.py#L176-L195`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L176-L195), [`test_api.py#L86-L111`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L86-L111)

잘못된 metadata 예시:

```
curl -sS -o - -w '\nHTTP %{http_code}\n' -X POST "$BASE_URL/documents" \
  -F 'file=@./guide.txt;type=text/plain' \
  --form-string 'title=Platform guide' \
  --form-string 'source_uri=https://example.test/guide' \
  --form-string 'metadata=[]'
```

`422`와 `metadata must be a JSON object` detail을 기대한다.

## 4. pipeline 상태 조회 — `GET /documents/{document_id}/status`

```
curl --fail-with-body -sS "$BASE_URL/documents/$DOCUMENT_ID/status" | jq
```

대표 응답:

```
{
  "document_id": "doc-123",
  "status": "indexed",
  "chunks_count": 3,
  "error": null,
  "updated_at": "2026-01-01T00:00:00+00:00"
}
```

provider가 indexing을 끝내기 전에는 상태가 다를 수 있다. `error`가 null이 아니면 pipeline 오류 내용을 확인한다.

구현/테스트 추적: [`main.py#L210-L218`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L210-L218), [`test_api.py#L172-L178`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L172-L178)

## 5. 문서 목록과 cursor pagination — `GET /documents`

첫 페이지:

```
curl --fail-with-body -sS "$BASE_URL/documents?limit=100" | jq
```

다음 페이지는 이전 응답의 `next_cursor`를 그대로 사용한다.

```
NEXT_CURSOR='paste-next_cursor-here'
curl --fail-with-body -sS \
  "$BASE_URL/documents?cursor=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$NEXT_CURSOR")&limit=100" \
  | jq
```

대표 응답:

```
{
  "items": [],
  "next_cursor": null,
  "has_more": false
}
```

`limit`은 `1` 이상 `1000` 이하이고 기본값은 `100`이다.

구현/테스트 추적: [`main.py#L197-L208`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L197-L208), [`test_api.py#L144-L157`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L144-L157)

## 6. 문서 metadata 조회 — `GET /documents/{document_id}`

```
curl --fail-with-body -sS "$BASE_URL/documents/$DOCUMENT_ID" | jq
```

응답의 주요 field는 `document_id`, `filename`, `content_type`, `file_size`, `status`, `created_at`, `updated_at`, `partition_kind`, `partition_id`, `checksum`, `created_by`, `metadata`다.

구현/테스트 추적: [`main.py#L220-L228`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L220-L228), [`test_api.py#L159-L169`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L159-L169)

## 7. 원본 bytes 다운로드 — `GET /documents/{document_id}/content`

```
curl --fail-with-body -sS \
  -D ./guide.response.headers \
  -o ./guide.downloaded.txt \
  "$BASE_URL/documents/$DOCUMENT_ID/content"

cat ./guide.response.headers
file ./guide.downloaded.txt
```

응답 body는 JSON이 아니라 원본 bytes다. `Content-Type`은 저장된 content type이고, `Content-Disposition`은 attachment filename을 포함한다.

구현/테스트 추적: [`main.py#L230-L240`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L230-L240), [`test_api.py#L128-L141`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L128-L141)

## 8. Semantic search — `POST /search`

```
curl --fail-with-body -sS -X POST "$BASE_URL/search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "knowledge document",
    "limit": 5,
    "document_id": "doc-123"
  }' | jq
```

`document_id`를 생략하면 고정된 `personal/kbms` partition 전체에서 검색한다. `limit`은 양수여야 하고 기본값은 `5`다.

대표 응답:

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

구현/테스트 추적: [`main.py#L252-L261`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L252-L261), [`test_api.py#L63-L83`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L63-L83)

## 9. 문서 삭제 — `DELETE /documents/{document_id}`

기본값은 `hard_delete=false`다.

```
curl --fail-with-body -sS -i -X DELETE \
  "$BASE_URL/documents/$DOCUMENT_ID"
```

hard delete가 필요하면 query parameter를 명시한다.

```
curl --fail-with-body -sS -i -X DELETE \
  "$BASE_URL/documents/$DOCUMENT_ID?hard_delete=true"
```

성공 응답은 body 없는 `204 No Content`다. live lifecycle에서는 삭제 후 다음 요청으로 상태를 확인한다.

```
curl --fail-with-body -sS "$BASE_URL/documents/$DOCUMENT_ID/status" | jq
```

구현/테스트 추적: [`main.py#L242-L250`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/app/main.py#L242-L250), [`test_api.py#L180-L193`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/test_api.py#L180-L193)

## 10. 전체 live lifecycle

실제 provider를 활성화한 테스트와 같은 순서는 다음과 같다.

1. `POST /documents`
2. `GET /documents/{document_id}/status`
3. `GET /documents`
4. `GET /documents/{document_id}`
5. `GET /documents/{document_id}/content`
6. `POST /search`
7. `DELETE /documents/{document_id}?hard_delete=true`
8. `GET /documents/{document_id}/status`로 `deleted` 확인
재현 명령:

```
KBMS_RUN_REAL_INTEGRATION=1 \
  uv run pytest tests/integration/test_real_integration.py -q
```

이 gate는 MinIO와 Ollama 등 provider가 준비된 환경에서만 실행한다. 구현 근거는 [`test_real_integration.py#L17-L101`](https://github.com/kyundae-kim/docmesh-kbms-api/blob/09d8edb1c62eb69575a432b6e950553bea11d46b/tests/integration/test_real_integration.py#L17-L101)이다.
