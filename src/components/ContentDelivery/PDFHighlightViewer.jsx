import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';

export default function PDFHighlightViewer({ fileUrl, highlights = [] }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [openId, setOpenId] = useState(null);
  const containerRef = useRef(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  const pageHighlights = Array.isArray(highlights)
    ? highlights.filter(h => Number(h.page) === Number(pageNumber))
    : [];

  const onDocLoad = ({ numPages }) => setNumPages(numPages);

  // Measure rendered page size to support pixel-based rects
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const canvas = el.querySelector('.react-pdf__Page canvas');
      const img = el.querySelector('.react-pdf__Page img');
      const target = canvas || img;
      if (target) {
        const w = target.clientWidth || target.offsetWidth || 0;
        const h = target.clientHeight || target.offsetHeight || 0;
        if (w && h && (w !== pageSize.width || h !== pageSize.height)) {
          setPageSize({ width: w, height: h });
        }
      }
    };

    // Attempt immediate measurement and observe changes
    updateSize();
    const obs = new MutationObserver(() => updateSize());
    obs.observe(el, { childList: true, subtree: true });
    const resize = () => updateSize();
    window.addEventListener('resize', resize);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [fileUrl, pageNumber]);

  const rectStyle = (rect) => {
    const r = rect || {};
    const isPixelRect = [r.x, r.y, r.w, r.h].some(v => typeof v === 'number' && v > 1);

    if (isPixelRect && pageSize.width && pageSize.height) {
      return {
        position: 'absolute',
        left: `${r.x || 0}px`,
        top: `${r.y || 0}px`,
        width: `${(r.w || 0.1 * pageSize.width)}px`,
        height: `${(r.h || 0.03 * pageSize.height)}px`,
        cursor: 'pointer',
        background: 'rgba(255, 230, 0, 0.35)',
        outline: '2px solid rgba(255,200,0,0.8)'
      };
    }

    // Fractional (0..1) rects fallback
    const left = `${(r.x || 0) * 100}%`;
    const top = `${(r.y || 0) * 100}%`;
    const width = `${(r.w || 0.1) * 100}%`;
    const height = `${(r.h || 0.03) * 100}%`;
    return {
      position: 'absolute',
      left, top, width, height,
      cursor: 'pointer',
      background: 'rgba(255, 230, 0, 0.35)',
      outline: '2px solid rgba(255,200,0,0.8)'
    };
  };

  return (
    <div className="pdf-viewer space-y-2">
      <div className="flex items-center gap-2">
        <button
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(p => Math.max(1, p - 1))}
          className="px-2 py-1 bg-gray-100 border rounded"
        >
          Prev
        </button>
        <span className="text-sm">Page {pageNumber}{numPages ? ` of ${numPages}` : ''}</span>
        <button
          disabled={!numPages || pageNumber >= numPages}
          onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
          className="px-2 py-1 bg-gray-100 border rounded"
        >
          Next
        </button>
      </div>

      <div className="relative inline-block" ref={containerRef} style={{ lineHeight: 0 }}>
        <Document file={fileUrl} onLoadSuccess={onDocLoad}>
          <Page pageNumber={pageNumber} width={800} renderAnnotationLayer={false} renderTextLayer={false} />
        </Document>

        {pageHighlights.map(h => {
          const isOpen = openId === (h.id || '')
          return (
            <div
              key={h.id || `${h.word}-${h.rect?.x}-${h.rect?.y}`}
              style={rectStyle(h.rect)}
              onClick={(e) => { e.stopPropagation(); setOpenId(isOpen ? null : (h.id || 'open')); }}
              title={h.word}
            />
          );
        })}

        {pageHighlights.map(h => {
          const isOpen = openId === (h.id || '')
          if (!isOpen) return null;
          const r = h.rect || {};
          const isPixelRect = [r.x, r.y, r.w, r.h].some(v => typeof v === 'number' && v > 1);
          const leftOffset = isPixelRect
            ? `${((r.x || 0) + (r.w || 0)) + 6}px`
            : `${((r.x || 0) + (r.w || 0)) * 100 + 1}%`;
          const topOffset = isPixelRect
            ? `${(r.y || 0)}px`
            : `${(r.y || 0) * 100}%`;

          return (
            <div
              key={`popover-${h.id || 'open'}`}
              style={{ position: 'absolute', left: leftOffset, top: topOffset, transform: 'translateY(-10%)', zIndex: 20 }}
              className="bg-white border shadow-lg rounded p-3 w-80"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{h.word}</div>
                  {!!(h.synonyms || []).length && (
                    <div className="text-xs text-gray-600 mt-1">Synonyms: {(h.synonyms || []).join(', ')}</div>
                  )}
                </div>
                <button className="text-xs px-2 py-1 bg-gray-100 border rounded" onClick={() => setOpenId(null)}>Close</button>
              </div>

              <div className="mt-2 space-y-2">
                {!!(h.refs?.images || []).length && (
                  <div className="space-y-1">
                    {(h.refs.images || []).map((u, i) => (
                      <img key={i} src={u} alt="ref" className="max-h-24 rounded border" />
                    ))}
                  </div>
                )}
                {!!(h.refs?.audio || []).length && (
                  <div>
                    {(h.refs.audio || []).map((u, i) => <audio key={i} controls src={u} className="w-full" />)}
                  </div>
                )}
                {!!(h.refs?.video || []).length && (
                  <div>
                    {(h.refs.video || []).map((u, i) => <video key={i} controls src={u} className="w-full max-h-56" />)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


