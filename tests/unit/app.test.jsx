// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from '../../src/App.jsx';

const documents = {
  items: [
    {
      document_id: 'doc-123',
      filename: 'guide.txt',
      content_type: 'text/plain',
      file_size: 12,
      status: 'indexed',
      created_at: '2026-01-01T00:00:00+00:00',
      updated_at: '2026-01-01T00:00:00+00:00',
      partition_kind: 'personal',
      partition_id: 'kbms',
      checksum: 'sha256:test',
      created_by: 'dms',
      metadata: { team: 'platform' },
    },
  ],
  next_cursor: null,
  has_more: false,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('knowledge management UI', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        if (url === '/api/health') return jsonResponse({ status: 'ok' });
        if (url === '/api/documents?limit=50') return jsonResponse(documents);
        if (url === '/api/search') {
          return jsonResponse([
            {
              document_id: 'doc-123',
              chunk_index: 0,
              text: 'knowledge document',
              score: 0.9123,
              start: null,
              end: null,
              source_uri: 'https://example.test/guide',
            },
          ]);
        }
        if (url === '/api/documents' && options.method === 'POST') {
          return jsonResponse({ document_id: 'doc-123', metadata: {}, created: true }, 201);
        }
        if (url === '/api/documents/doc-123/status') {
          return jsonResponse({
            document_id: 'doc-123', status: 'indexed', chunks_count: 1, error: null,
            updated_at: '2026-01-01T00:00:00+00:00',
          });
        }
        if (url === '/api/documents/doc-123') {
          return jsonResponse({ ...documents.items[0], title: 'Platform guide' });
        }
        if (url === '/api/documents/doc-123?hard_delete=false' && options.method === 'DELETE') {
          return new Response(null, { status: 204 });
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the connection status and document list, then performs semantic search', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('guide.txt')).toBeInTheDocument();
    expect(screen.getByTestId('health-badge')).toHaveTextContent('연결됨');

    await user.type(screen.getByLabelText('검색어'), 'knowledge');
    await user.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByText('knowledge document')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/search',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'knowledge', limit: 5 }),
      }),
    );
  });

  it('submits a multipart document upload with the required fields', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText('guide.txt');
    await user.type(screen.getByLabelText('문서 제목'), 'Platform guide');
    await user.type(screen.getByLabelText('원본 URI'), 'https://example.test/guide');
    await user.upload(
      screen.getByLabelText('파일'),
      new File(['hello knowledge'], 'guide.txt', { type: 'text/plain' }),
    );
    await user.click(screen.getByRole('button', { name: '업로드' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/documents',
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
      );
    });
    const uploadCall = fetch.mock.calls.find(
      ([url, options]) => url === '/api/documents' && options?.method === 'POST',
    );
    expect(uploadCall[1].body.get('title')).toBe('Platform guide');
    expect(uploadCall[1].body.get('source_uri')).toBe('https://example.test/guide');
    expect(uploadCall[1].body.get('file').name).toBe('guide.txt');
  });

  it('shows document metadata actions in each row', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: '상태 보기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '메타데이터 보기' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '원본 다운로드' })).toHaveAttribute(
      'href',
      '/api/documents/doc-123/content',
    );
  });

  it('loads status and metadata, then deletes a document through the API', async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true);
    render(<App />);
    await screen.findByText('guide.txt');

    await user.click(screen.getByRole('button', { name: '상태 보기' }));
    expect(await screen.findByText('1 chunks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '메타데이터 보기' }));
    expect(await screen.findByText(/"filename": "guide.txt"/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '문서 삭제' }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/documents/doc-123?hard_delete=false',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
