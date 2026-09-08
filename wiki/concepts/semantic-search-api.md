---
title: Semantic search API
created: 2026-09-09
updated: 2026-09-09
type: concept
tags: [search, api, backend, data, testing]
sources: [raw/articles/docmesh-kbms-api-api-v0-1-0.md, raw/articles/docmesh-kbms-api-examples-v0-1-0.md]
confidence: medium
---

# Semantic search API

## 정의

`POST /search`는 `docmesh-kbms`에 저장·인덱싱된 문서 chunk를 semantic query로 조회하는 endpoint다. 결과는 문서 식별자, chunk 위치, 텍스트, score, 선택적 offset, 원본 URI를 제공한다.

## 요청 계약

요청은 `Content-Type: application/json`이다.

| 필드 | 필수 | 제약 및 의미 |
| --- | --- | --- |
| `query` | 예 | 검색 문자열 |
| `limit` | 아니오 | 양의 정수, 기본값 `5` |
| `document_id` | 아니오 | 특정 문서로 범위를 제한; 생략하면 전체 `personal/kbms` partition |

`SearchRequest`는 unknown field를 허용하지 않는다. `document_id`를 지정하지 않아도 client가 partition이나 identity를 전송할 필요는 없다.

## 응답 계약

성공 응답은 HTTP `200`과 검색 hit 배열이다.

```json
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

`score`는 hit의 상대적 검색 결과 점수로 기록되며, 예시 값은 실행 시 달라질 수 있다. `start`와 `end`는 예시 응답에서 `null`이다.

## Lifecycle과의 연결

검색은 문서 업로드 직후 무조건 가능하다고 가정하지 않는다. provider pipeline이 완료되었는지 `GET /documents/{document_id}/status`로 확인한 뒤 `POST /search`를 호출한다. 전체 live integration 순서는 [[document-api-lifecycle]]에 정리되어 있으며, API와 실행 환경의 공통 경계는 [[docmesh-kbms-api]]에 기록되어 있다.

## 버전 검증

예제는 API contract `0.1.0`과 source revision `09d8edb1c62eb69575a432b6e950553bea11d46b`를 기준으로 한다. 실행 전 `GET /openapi.json`에서 `info.version`을 확인하고, 값이 다르면 해당 revision에 맞는 계약을 사용해야 한다. 경로에 `/v1` prefix가 없으므로 경로만으로 version을 추정하지 않는다.

## 검증

Application-level 테스트는 fake facade로 `POST /search`의 계약을 검증하고, live integration 테스트는 실제 provider를 포함해 문서 lifecycle 안에서 검색을 수행한다. 구현과 테스트 파일 위치는 [API contract raw source](../raw/articles/docmesh-kbms-api-api-v0-1-0.md) 및 [Examples raw source](../raw/articles/docmesh-kbms-api-examples-v0-1-0.md)의 추적 링크를 따른다.

## 출처

- [API contract raw source](../raw/articles/docmesh-kbms-api-api-v0-1-0.md)
- [Examples raw source](../raw/articles/docmesh-kbms-api-examples-v0-1-0.md)
