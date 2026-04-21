'use client';

import { useState, useRef, useCallback, use } from 'react';
import { Camera, Upload, Check, X, ImagePlus, Loader2 } from 'lucide-react';

export default function GuestUploadPage({ params }) {
  const { code } = use(params);

  const [name, setName]           = useState('');
  const [files, setFiles]         = useState([]);   // { file, preview, status: 'pending'|'uploading'|'done'|'error', error }
  const [submitting, setSubmitting] = useState(false);
  const [allDone, setAllDone]     = useState(false);
  const fileInputRef              = useRef(null);

  const addFiles = useCallback((newFiles) => {
    const items = Array.from(newFiles)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        status: 'pending',
        error: null,
        id: Math.random().toString(36).slice(2),
      }));
    setFiles(prev => [...prev, ...items]);
  }, []);

  function removeFile(id) {
    setFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter(x => x.id !== id);
    });
  }

  async function uploadOne(item) {
    const fd = new FormData();
    fd.append('file', item.file);
    fd.append('event_code', code);
    if (name.trim()) fd.append('uploader_name', name.trim());

    const res  = await fetch(`/api/guest/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '업로드 실패');
    return data;
  }

  async function handleSubmit() {
    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) return;

    setSubmitting(true);

    for (const item of pending) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));
      try {
        await uploadOne(item);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done' } : f));
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: err.message } : f));
      }
    }

    setSubmitting(false);
    setFiles(prev => {
      const anyError = prev.some(f => f.status === 'error');
      if (!anyError) setAllDone(true);
      return prev;
    });
  }

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const doneCount    = files.filter(f => f.status === 'done').length;

  if (allDone) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--toss-bg, #f8f9fa)', padding: '24px',
        fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          backgroundColor: '#eaf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Check size={36} color="#3182f6" strokeWidth={2.5} />
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#191f28', marginBottom: 8 }}>
          업로드 완료! 🎉
        </p>
        <p style={{ fontSize: 14, color: '#8b95a1', textAlign: 'center', lineHeight: 1.6 }}>
          {doneCount}장의 사진을 보냈어요.<br />
          소중한 순간을 함께해줘서 감사해요 ♥
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh', maxWidth: 430, margin: '0 auto',
      backgroundColor: '#f8f9fa', padding: '24px 20px 40px',
      fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    }}>
      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{ fontSize: 28, marginBottom: 8 }}>📷</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#191f28', marginBottom: 6 }}>
          사진 공유하기
        </p>
        <p style={{ fontSize: 14, color: '#8b95a1', lineHeight: 1.6 }}>
          오늘의 소중한 순간을<br />신랑신부에게 전달해 주세요
        </p>
      </div>

      {/* 이름 입력 */}
      <div style={{
        backgroundColor: 'white', borderRadius: 20, padding: '20px',
        marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#191f28', display: 'block', marginBottom: 8 }}>
          이름 (선택)
        </label>
        <input
          type="text"
          placeholder="홍길동"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          style={{
            width: '100%', height: 48, borderRadius: 12, border: '1.5px solid #e5e8eb',
            padding: '0 16px', fontSize: 15, color: '#191f28', outline: 'none',
            boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* 사진 선택 */}
      <div style={{
        backgroundColor: 'white', borderRadius: 20, padding: '20px',
        marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#191f28' }}>
            사진 선택
          </label>
          {files.length > 0 && (
            <span style={{ fontSize: 12, color: '#3182f6', fontWeight: 600 }}>
              {files.length}장 선택됨
            </span>
          )}
        </div>

        {/* 추가 버튼 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: files.length > 0 ? 12 : 0 }}>
          <button
            onClick={() => { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click(); }}
            style={{
              flex: 1, height: 48, borderRadius: 12, border: '1.5px dashed #c9d1d9',
              backgroundColor: '#f8f9fa', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: '#4e5968', fontFamily: 'inherit',
            }}>
            <ImagePlus size={16} />
            갤러리
          </button>
          <button
            onClick={() => { fileInputRef.current.setAttribute('capture', 'environment'); fileInputRef.current.click(); }}
            style={{
              flex: 1, height: 48, borderRadius: 12, border: '1.5px dashed #c9d1d9',
              backgroundColor: '#f8f9fa', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: '#4e5968', fontFamily: 'inherit',
            }}>
            <Camera size={16} />
            카메라
          </button>
        </div>

        {/* 미리보기 그리드 */}
        {files.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {files.map(item => (
              <div key={item.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', backgroundColor: '#f2f4f6' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                {/* 상태 오버레이 */}
                {item.status === 'uploading' && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={20} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
                {item.status === 'done' && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(49,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#3182f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={16} color="white" strokeWidth={2.5} />
                    </div>
                  </div>
                )}
                {item.status === 'error' && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,77,79,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#ff4d4f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} color="white" strokeWidth={2.5} />
                    </div>
                  </div>
                )}

                {/* 제거 버튼 (pending만) */}
                {item.status === 'pending' && (
                  <button
                    onClick={() => removeFile(item.id)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 22, height: 22, borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <X size={12} color="white" strokeWidth={2.5} />
                  </button>
                )}

                {/* 에러 메시지 */}
                {item.status === 'error' && item.error && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 4px' }}>
                    <p style={{ fontSize: 9, color: 'white', margin: 0 }}>{item.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 업로드 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={pendingCount === 0 || submitting}
        style={{
          width: '100%', height: 56, borderRadius: 16, border: 'none',
          backgroundColor: pendingCount === 0 || submitting ? '#c9d1d9' : '#3182f6',
          color: 'white', fontSize: 16, fontWeight: 700, cursor: pendingCount === 0 || submitting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background-color 0.2s', fontFamily: 'inherit',
        }}>
        {submitting ? (
          <>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            전송 중...
          </>
        ) : (
          <>
            <Upload size={20} />
            {pendingCount > 0 ? `사진 ${pendingCount}장 전송하기` : '사진을 선택해주세요'}
          </>
        )}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#b0b8c1', marginTop: 16, lineHeight: 1.5 }}>
        업로드한 사진은 신랑신부만 볼 수 있어요
      </p>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
