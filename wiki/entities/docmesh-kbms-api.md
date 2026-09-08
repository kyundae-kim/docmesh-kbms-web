---
title: docmesh-kbms API
created: 2026-09-09
updated: 2026-09-09
type: entity
tags: [api, backend, architecture, testing, integration]
sources: [raw/articles/docmesh-kbms-api-api-v0-1-0.md, raw/articles/docmesh-kbms-api-examples-v0-1-0.md]
confidence: medium
---

# docmesh-kbms API

## 개요

`docmesh-kbms-api`는 지식 문서를 업로드·관리하고 semantic search를 제공하는 `docmesh-kbms` REST API다. 이 페이지가 다루는 기준은 API contract와 예제가 함께 참조하는 source revision `09d8edb1c62eb69575a432b6e950553bea11d46b`다.

## 버전과 재현성

- API contract, OpenAPI `info.version`, Python project version: `0.1.0`
- FastAPI entrypoint: `app.main:app`
- 기준 branch: `kbms-v0.1.0`
- 현재 HTTP 경로에는 `/v1` 같은 version prefix가 없다.
- 실행 중인 `GET /openapi.json`의 `info.version`과 source revision을 함께 확인해야 한다.
- 호환성이 깨지는 변경은 새 API version과 source revision을 문서 metadata 및 예제의 `API_VERSION`에 반영해야 한다.

## 실행 및 provider 구성

로컬 실행 예시는 다음과 같다.

```bash
uv sync
KBMS_MINIO_ENDPOINT=localhost:9000 uv run fastapi dev
```

애플리케이션 startup은 SQLite, Milvus, MinIO, Ollama provider를 구성한다. Docker Compose 네트워크에서는 MinIO endpoint를 `minio:9000`으로 설정한다. 이 provider 구성이 준비되지 않으면 live integration lifecycle을 재현할 수 없다.

## 공통 경계

- 기본 예시 base URL: `http://localhost:8000`
- JSON 요청: `application/json`
- 파일 업로드: `multipart/form-data`
- 기본 DMS identity: `dms`; 서버 설정 `KBMS_USER_ID`로 변경 가능
- API route가 사용하는 partition은 `partition_kind: personal`, `partition_id: kbms`로 고정
- client는 identity, access context, partition을 request body나 query로 지정하지 않는다.

## Public surface 요약

- 상태 확인: `GET /health`
- 문서 lifecycle: 업로드, 목록, 상태, metadata, 원본 content, 삭제
- 검색: `POST /search`
- 자동 문서 surface: `/openapi.json`, `/docs`, `/docs/oauth2-redirect`, `/redoc`

애플리케이션 endpoint의 세부 입력·응답·오류 계약은 [[document-api-lifecycle]]과 [[semantic-search-api]]에 분리해 정리했다.

## 검증 구조

fake facade를 사용하는 application-level 테스트와 provider를 포함하는 live integration 테스트가 분리되어 있다. live lifecycle의 검증 순서는 업로드 → 상태 → 목록 → metadata → content → search → 삭제 → 삭제 상태 확인이다.

## 관련 페이지

- [[document-api-lifecycle]] — 문서 endpoint의 입력, 상태, pagination, 삭제 및 오류 계약
- [[semantic-search-api]] — 검색 요청·응답과 partition 범위

## 출처

- [API contract raw source](../raw/articles/docmesh-kbms-api-api-v0-1-0.md)
- [Examples raw source](../raw/articles/docmesh-kbms-api-examples-v0-1-0.md)
