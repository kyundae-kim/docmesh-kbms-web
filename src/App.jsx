import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API_PREFIX = '/api';

function formatBytes(value) {
  if (!Number.isFinite(Number(value))) return '—';
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function statusLabel(status) {
  const labels = {
    uploaded: '업로드됨',
    indexing: '색인 중',
    indexed: '색인 완료',
    available: '사용 가능',
    deleted: '삭제됨',
    failed: '오류',
  };
  return labels[status] || status || '알 수 없음';
}

function getErrorMessage(payload, response) {
  if (payload?.detail && Array.isArray(payload.detail)) {
    return payload.detail.map((item) => item.msg || JSON.stringify(item)).join(', ');
  }
  return payload?.detail || payload?.error || `요청에 실패했습니다. (${response.status})`;
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(getErrorMessage(payload, response));
  return payload;
}

function StatusPill({ status }) {
  const tone = status === 'indexed' || status === 'available' ? 'success' : status === 'failed' ? 'danger' : 'neutral';
  return <span className={`status-pill ${tone}`}>{statusLabel(status)}</span>;
}

function Icon({ name }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 20h16" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.9-4L3 10" /><path d="M3 4v6h6" /><path d="M4 13a8 8 0 0 0 14.9 4L21 14" /><path d="M21 20v-6h-6" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>,
    external: <><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2M19 6l-1 15H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name="file" /></div>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

function DocumentRow({ document, onStatus, onMetadata, onDelete, deleting }) {
  return (
    <article className="document-row" data-testid="document-row">
      <div className="document-main">
        <div className="file-mark"><Icon name="file" /></div>
        <div className="document-name">
          <strong title={document.filename}>{document.filename || '이름 없는 문서'}</strong>
          <span>{document.document_id}</span>
        </div>
      </div>
      <div className="document-type">
        <span>{document.content_type || '알 수 없는 형식'}</span>
        <small>{formatBytes(document.file_size)}</small>
      </div>
      <div className="document-status"><StatusPill status={document.status} /></div>
      <div className="document-date">{formatDate(document.updated_at || document.created_at)}</div>
      <div className="document-actions">
        <button className="icon-button" type="button" onClick={() => onStatus(document.document_id)} aria-label="상태 보기" title="상태 보기">
          <Icon name="activity" />
        </button>
        <button className="icon-button" type="button" onClick={() => onMetadata(document.document_id)} aria-label="메타데이터 보기" title="메타데이터 보기">
          <Icon name="info" />
        </button>
        <a className="icon-button" href={`${API_PREFIX}/documents/${encodeURIComponent(document.document_id)}/content`} aria-label="원본 다운로드" title="원본 다운로드">
          <Icon name="upload" />
        </a>
        <button className="icon-button danger" type="button" onClick={() => onDelete(document.document_id)} aria-label="문서 삭제" title="문서 삭제" disabled={deleting === document.document_id}>
          <Icon name="trash" />
        </button>
      </div>
    </article>
  );
}

export default function App() {
  const [health, setHealth] = useState('loading');
  const [documents, setDocuments] = useState({ items: [], next_cursor: null, has_more: false });
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cursorStack, setCursorStack] = useState([]);
  const [inspect, setInspect] = useState(null);
  const [deleting, setDeleting] = useState('');
  const [hardDelete, setHardDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [sourceUri, setSourceUri] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [metadata, setMetadata] = useState('{}');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const uploadForm = useRef(null);

  const [query, setQuery] = useState('');
  const [searchLimit, setSearchLimit] = useState('5');
  const [searchDocumentId, setSearchDocumentId] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const refreshHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const result = await requestJson('/health');
      setHealth(result?.status === 'ok' ? 'ok' : 'error');
    } catch {
      setHealth('error');
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const loadDocuments = useCallback(async (nextCursor = null, { pushCursor = false } = {}) => {
    setLoadingDocuments(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (nextCursor) params.set('cursor', nextCursor);
      const result = await requestJson(`/documents?${params.toString()}`);
      setDocuments(result || { items: [], next_cursor: null, has_more: false });
      if (pushCursor && nextCursor) setCursorStack((current) => [...current, nextCursor]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    void loadDocuments();
  }, [loadDocuments, refreshHealth]);

  const documentCountLabel = useMemo(() => {
    const count = documents.items?.length || 0;
    return `${count}개 문서`;
  }, [documents.items]);

  async function handleUpload(event) {
    event.preventDefault();
    setUploadError('');
    setSuccess('');
    if (!file) {
      setUploadError('업로드할 파일을 선택하세요.');
      return;
    }
    if (!title.trim() || !sourceUri.trim()) {
      setUploadError('문서 제목과 원본 URI를 입력하세요.');
      return;
    }

    let parsedMetadata;
    try {
      parsedMetadata = JSON.parse(metadata || '{}');
      if (!parsedMetadata || Array.isArray(parsedMetadata) || typeof parsedMetadata !== 'object') {
        throw new Error('object');
      }
    } catch {
      setUploadError('추가 메타데이터는 JSON object여야 합니다.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('source_uri', sourceUri.trim());
    if (documentId.trim()) formData.append('document_id', documentId.trim());
    formData.append('metadata', JSON.stringify(parsedMetadata));

    setUploading(true);
    try {
      const result = await requestJson('/documents', { method: 'POST', body: formData });
      setSuccess(`문서 ${result?.document_id || documentId || file.name}를 업로드했습니다.`);
      setTitle('');
      setSourceUri('');
      setDocumentId('');
      setMetadata('{}');
      setFile(null);
      uploadForm.current?.reset();
      await loadDocuments();
    } catch (requestError) {
      setUploadError(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    setSearchError('');
    if (!query.trim()) {
      setSearchError('검색어를 입력하세요.');
      return;
    }
    setSearching(true);
    try {
      const body = { query: query.trim(), limit: Number(searchLimit) || 5 };
      if (searchDocumentId.trim()) body.document_id = searchDocumentId.trim();
      const result = await requestJson('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSearchResults(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setSearchError(requestError.message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function inspectStatus(id) {
    setInspect({ type: 'loading', id });
    try {
      const result = await requestJson(`/documents/${encodeURIComponent(id)}/status`);
      setInspect({ type: 'status', id, value: result });
    } catch (requestError) {
      setInspect({ type: 'error', id, message: requestError.message });
    }
  }

  async function inspectMetadata(id) {
    setInspect({ type: 'loading', id });
    try {
      const result = await requestJson(`/documents/${encodeURIComponent(id)}`);
      setInspect({ type: 'metadata', id, value: result });
    } catch (requestError) {
      setInspect({ type: 'error', id, message: requestError.message });
    }
  }

  async function handleDelete(id) {
    if (typeof window !== 'undefined' && !window.confirm(`문서 ${id}를 삭제할까요?`)) return;
    setDeleting(id);
    setError('');
    setSuccess('');
    try {
      const queryString = hardDelete ? '?hard_delete=true' : '?hard_delete=false';
      await requestJson(`/documents/${encodeURIComponent(id)}${queryString}`, { method: 'DELETE' });
      setSuccess(`${id} 문서를 ${hardDelete ? '완전히 ' : ''}삭제했습니다.`);
      await loadDocuments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleting('');
    }
  }

  function nextPage() {
    if (documents.has_more && documents.next_cursor) {
      void loadDocuments(documents.next_cursor, { pushCursor: true });
    }
  }

  function previousPage() {
    if (cursorStack.length > 1) {
      const previous = cursorStack[cursorStack.length - 2];
      setCursorStack((current) => current.slice(0, -1));
      void loadDocuments(previous);
    } else if (cursorStack.length === 1) {
      setCursorStack([]);
      void loadDocuments();
    }
  }

  const healthText = loadingHealth ? '확인 중' : health === 'ok' ? '연결됨' : '연결 끊김';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">D</div>
          <div>
            <div className="brand-name">DocMesh</div>
            <div className="brand-subtitle">Knowledge workspace</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className={`health-badge ${health}`} data-testid="health-badge">
            <span className="health-dot" />
            <span>KBMS API · {healthText}</span>
          </div>
          <button className="refresh-button" type="button" onClick={() => { void refreshHealth(); void loadDocuments(); }} aria-label="새로고침">
            <Icon name="refresh" />
          </button>
        </div>
      </header>

      <main className="content-wrap">
        <section className="hero-section">
          <div>
            <p className="eyebrow">DOCUMENT INTELLIGENCE / 0.1.0</p>
            <h1>지식 문서를<br /><em>한 곳에서 연결하세요.</em></h1>
            <p className="hero-copy">원본 파일을 안전하게 보관하고, 색인 상태를 확인하고,<br />필요한 지식을 의미 기반 검색으로 바로 찾아보세요.</p>
          </div>
          <div className="hero-orbit" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-core"><Icon name="activity" /></div>
            <span className="orbit-label label-one">INDEX</span>
            <span className="orbit-label label-two">SEARCH</span>
            <span className="orbit-label label-three">SHARE</span>
          </div>
        </section>

        {error && <div className="notice error" role="alert"><strong>요청 오류</strong><span>{error}</span><button type="button" onClick={() => setError('')}>닫기</button></div>}
        {success && <div className="notice success" role="status"><strong>완료</strong><span>{success}</span><button type="button" onClick={() => setSuccess('')}>닫기</button></div>}

        <section className="metric-grid" aria-label="워크스페이스 요약">
          <div className="metric-card accent-blue"><span className="metric-label">저장된 문서</span><strong>{documents.items?.length || 0}</strong><small>현재 페이지</small></div>
          <div className="metric-card accent-lilac"><span className="metric-label">API 상태</span><strong>{health === 'ok' ? 'OK' : '—'}</strong><small>personal / kbms</small></div>
          <div className="metric-card accent-peach"><span className="metric-label">검색 결과</span><strong>{searchResults.length}</strong><small>최근 semantic query</small></div>
          <div className="metric-card accent-mint"><span className="metric-label">계약 버전</span><strong>0.1.0</strong><small>docmesh-kbms-api</small></div>
        </section>

        <div className="workspace-grid">
          <section className="panel search-panel">
            <div className="panel-heading">
              <div><p className="section-kicker">SEMANTIC RETRIEVAL</p><h2>무엇을 찾고 있나요?</h2></div>
              <div className="panel-icon search-icon"><Icon name="search" /></div>
            </div>
            <form className="search-form" data-testid="search-form" onSubmit={handleSearch}>
              <label htmlFor="search-query">검색어</label>
              <div className="search-input-wrap"><Icon name="search" /><input id="search-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 플랫폼 운영 가이드" /></div>
              <div className="form-row compact-row">
                <label className="field-grow" htmlFor="search-document-id">문서 범위 <span>선택</span><input id="search-document-id" value={searchDocumentId} onChange={(event) => setSearchDocumentId(event.target.value)} placeholder="전체 문서에서 검색" /></label>
                <label className="limit-field" htmlFor="search-limit">결과 수<select id="search-limit" value={searchLimit} onChange={(event) => setSearchLimit(event.target.value)}><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></label>
              </div>
              <button className="primary-button full-button" type="submit" disabled={searching}>{searching ? '검색 중…' : <><Icon name="search" /> 검색</>}</button>
              {searchError && <p className="inline-error" role="alert">{searchError}</p>}
            </form>
            <div className="search-results" data-testid="search-results">
              {searchResults.length > 0 ? searchResults.map((hit, index) => (
                <article className="result-card" key={`${hit.document_id}-${hit.chunk_index}-${index}`}>
                  <div className="result-topline"><span className="result-index">0{index + 1}</span><span className="result-doc">{hit.document_id}</span><strong>{Number(hit.score || 0).toFixed(3)}</strong></div>
                  <p>{hit.text}</p>
                  {hit.source_uri && <a href={hit.source_uri} target="_blank" rel="noreferrer">원본 URI <Icon name="external" /></a>}
                </article>
              )) : <div className="search-empty"><Icon name="search" /><span>검색 결과가 여기에 표시됩니다.</span></div>}
            </div>
          </section>

          <section className="panel upload-panel">
            <div className="panel-heading">
              <div><p className="section-kicker">INGEST DOCUMENT</p><h2>새 문서 추가</h2></div>
              <div className="panel-icon upload-icon"><Icon name="upload" /></div>
            </div>
            <form ref={uploadForm} className="upload-form" data-testid="upload-form" onSubmit={handleUpload}>
              <label className="file-drop" htmlFor="file-input">
                <input id="file-input" type="file" aria-label="파일" onChange={(event) => { const selected = event.target.files?.[0] || null; setFile(selected); if (selected && !title) setTitle(selected.name.replace(/\.[^/.]+$/, '')); }} />
                <span className="file-drop-icon"><Icon name="upload" /></span>
                <strong>{file ? file.name : '파일을 선택하거나 여기에 놓으세요'}</strong>
                <small>{file ? `${formatBytes(file.size)} · ${file.type || 'application/octet-stream'}` : '원본 파일 · multipart/form-data'}</small>
              </label>
              <div className="form-row">
                <label htmlFor="document-title">문서 제목<input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Platform guide" /></label>
                <label htmlFor="document-id">문서 ID <span>선택</span><input id="document-id" value={documentId} onChange={(event) => setDocumentId(event.target.value)} placeholder="자동 생성" /></label>
              </div>
              <label htmlFor="source-uri">원본 URI<input id="source-uri" value={sourceUri} onChange={(event) => setSourceUri(event.target.value)} placeholder="https://example.com/source" /></label>
              <label htmlFor="metadata">추가 메타데이터 <span>JSON object · 선택</span><textarea id="metadata" rows="2" value={metadata} onChange={(event) => setMetadata(event.target.value)} /></label>
              {uploadError && <p className="inline-error" role="alert">{uploadError}</p>}
              <button className="primary-button full-button" type="submit" disabled={uploading}>{uploading ? '업로드 중…' : <><Icon name="upload" /> 업로드</>}</button>
            </form>
          </section>
        </div>

        <section className="panel documents-panel">
          <div className="panel-heading documents-heading">
            <div><p className="section-kicker">DOCUMENT LIBRARY</p><h2>내 문서 <span className="heading-count">{documentCountLabel}</span></h2></div>
            <div className="document-controls"><label className="delete-toggle"><input type="checkbox" checked={hardDelete} onChange={(event) => setHardDelete(event.target.checked)} /> <span>완전 삭제</span></label><button className="secondary-button" type="button" onClick={() => { void loadDocuments(); }}><Icon name="refresh" /> 새로고침</button></div>
          </div>
          <div className="table-header"><span>문서</span><span>형식 / 크기</span><span>상태</span><span>최근 업데이트</span><span>작업</span></div>
          <div className="document-list" data-testid="document-list">
            {loadingDocuments ? <div className="loading-state"><span className="spinner" /> 문서를 불러오는 중…</div> : documents.items?.length ? documents.items.map((document) => <DocumentRow key={document.document_id} document={document} onStatus={inspectStatus} onMetadata={inspectMetadata} onDelete={handleDelete} deleting={deleting} />) : <EmptyState title="아직 문서가 없습니다.">첫 문서를 업로드하면 이곳에서 색인 상태와 원본을 관리할 수 있습니다.</EmptyState>}
          </div>
          {(documents.has_more || cursorStack.length > 0) && <div className="pagination"><button type="button" className="secondary-button" disabled={!cursorStack.length || loadingDocuments} onClick={previousPage}>이전</button><span>{documents.has_more ? '다음 페이지가 있습니다.' : '마지막 페이지'}</span><button type="button" className="secondary-button" disabled={!documents.has_more || loadingDocuments} onClick={nextPage}>다음 <Icon name="chevron" /></button></div>}
        </section>

        {inspect && <section className="panel inspect-panel" aria-live="polite"><div className="panel-heading"><div><p className="section-kicker">DOCUMENT INSPECTOR</p><h2>{inspect.id}</h2></div><button type="button" className="close-button" onClick={() => setInspect(null)}>닫기</button></div>{inspect.type === 'loading' && <div className="loading-state"><span className="spinner" /> 불러오는 중…</div>}{inspect.type === 'error' && <p className="inline-error">{inspect.message}</p>}{inspect.type === 'status' && <div className="inspect-content"><div className="inspect-status"><StatusPill status={inspect.value.status} /><span>{inspect.value.chunks_count ?? 0} chunks</span></div><dl><dt>업데이트</dt><dd>{formatDate(inspect.value.updated_at)}</dd><dt>파이프라인 오류</dt><dd>{inspect.value.error || '없음'}</dd></dl></div>}{inspect.type === 'metadata' && <pre className="json-view">{JSON.stringify(inspect.value, null, 2)}</pre>}</section>}

        <footer className="footer"><span>DocMesh Knowledge Workspace</span><span className="footer-links"><a href={`${API_PREFIX}/openapi.json`} target="_blank" rel="noreferrer">OpenAPI JSON <Icon name="external" /></a><a href={`${API_PREFIX}/docs`} target="_blank" rel="noreferrer">Swagger UI <Icon name="external" /></a><a href={`${API_PREFIX}/redoc`} target="_blank" rel="noreferrer">ReDoc <Icon name="external" /></a></span></footer>
      </main>
    </div>
  );
}
