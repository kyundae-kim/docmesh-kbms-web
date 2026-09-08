# DocMesh Knowledge Workspace

문서 기반 지식 관리 시스템 웹입니다. `docmesh-kbms-api`의 공개 HTTP 기능을 React 화면과 Express BFF를 통해 제공합니다.

## 구조

```text
Browser
  └─ React + Vite (개발: 5173)
       └─ Express BFF (3001, /api/*)
            └─ KBMS API (기본값: http://kbms:8000)
```

- `src/`: React 문서 라이브러리, multipart 업로드, 상태/metadata 조회, 원본 다운로드, 삭제, semantic search UI
- `server/`: upstream URL을 보존하는 Express BFF. multipart와 원본 bytes를 파싱하지 않고 전달합니다.
- `tests/connection/`: 실제 `kbms-api` 연결 및 OpenAPI 계약 확인
- `tests/unit/`: BFF helper와 React 동작 단위 테스트
- `tests/integration/`: 가짜 upstream을 이용한 BFF 전체 public surface 테스트
- `tests/real/`: 실제 provider를 포함한 문서 lifecycle 테스트
- `wiki/entities/docmesh-kbms-api.md`: 연동 기준 문서

## 제공 기능

화면에서 다음 application endpoint를 모두 사용할 수 있습니다.

- `GET /health` — 상단 KBMS 연결 상태
- `POST /documents` — 파일, 제목, source URI, 선택 metadata/document ID 업로드
- `GET /documents` — cursor pagination 문서 목록
- `GET /documents/{document_id}/status` — pipeline 상태와 chunk 수
- `GET /documents/{document_id}` — metadata inspector
- `GET /documents/{document_id}/content` — 원본 bytes 다운로드
- `DELETE /documents/{document_id}` — soft delete 또는 `hard_delete=true` 완전 삭제
- `POST /search` — 전체 또는 특정 문서 범위 semantic search

FastAPI 문서 surface도 `/api/openapi.json`, `/api/docs`, `/api/docs/oauth2-redirect`, `/api/redoc`으로 전달하며, Swagger/ReDoc이 참조하는 root alias도 제공합니다.

## 실행

Node.js 22 이상을 사용합니다.

```bash
npm install --include=dev
cp .env.example .env
npm run dev
```

- React: <http://localhost:5173>
- BFF: <http://localhost:3001>
- KBMS upstream은 `KBMS_API_URL` 환경변수로 변경할 수 있습니다.

운영 번들 실행:

```bash
npm run build
npm start
```

운영 서버도 `dist/`를 Express가 정적으로 서빙합니다.

## 검증 명령

```bash
# KBMS 연결 + health + OpenAPI version/path
npm run test:connection

# BFF helper + React UI 동작
npm run test:unit

# 가짜 upstream을 통한 BFF 계약/스트리밍/문서 surface
npm run test:integration

# 실제 http://kbms:8000 provider lifecycle
npm run test:real

# 네 gate를 순서대로 실행
npm run test:all
```

실환경 테스트는 provider가 준비된 환경에서 실행해야 합니다. 기본 lifecycle은 업로드 → indexed 상태 → 목록 → metadata → 원본 bytes → 검색 → hard delete → deleted 상태 확인 순서입니다. 다른 주소를 사용할 때는 다음처럼 실행합니다.

```bash
KBMS_API_URL=http://localhost:8000 npm run test:real
```

## API 계약

연동 기준은 API contract `0.1.0`, source revision `09d8edb1c62eb69575a432b6e950553bea11d46b`입니다. client가 identity나 `personal/kbms` partition을 요청에 넣지 않고, KBMS server가 관리하도록 유지합니다.
