'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, X, Send, Edit2, Trash2, ExternalLink, ChevronDown, StickyNote, ImagePlus, Copy, Check } from 'lucide-react';
import { useCouple } from '@/lib/useCouple';
import PageLoader from '@/components/PageLoader';
import { openExternalUrl } from '@/lib/openUrl';
import { copyToClipboard } from '@/lib/clipboard';
import Icon from '@/components/Icon';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

/* ─── 본문에서 첫 URL 추출 — 링크를 따로 입력하지 않아도 자동 미리보기 ─── */
const URL_RE = /(https?:\/\/[^\s<>"']+)/i;
function extractFirstUrl(text) {
  if (!text) return null;
  const m = text.match(URL_RE);
  if (!m) return null;
  let url = m[0];
  // 끝에 붙은 문장부호 제거 (예: "...com)." → "...com")
  // 단, URL 안에 여는 괄호가 있으면 닫는 괄호는 URL의 일부로 보존 (위키백과 등)
  url = url.replace(/[.,!?]+$/, '');
  if (!url.includes('(')) url = url.replace(/[)\]}>]+$/, '');
  return url;
}

/* ─── 날짜 포맷 ─────────────────────────────────────────────── */
function formatNoteTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const noteDay  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - noteDay) / (1000 * 60 * 60 * 24));
  const timeStr  = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return `어제 ${timeStr}`;
  if (d.getFullYear() === now.getFullYear())
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${timeStr}`;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} ${timeStr}`;
}

function formatDividerDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const noteDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - noteDay) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  if (d.getFullYear() === now.getFullYear())
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth()    === db.getMonth()    &&
         da.getDate()     === db.getDate();
}

/* ─── 링크 미리보기 캐시 — LRU (최대 50개, 세션 수준) ──────── */
const PREVIEW_CACHE_MAX = 50;
const previewCache = new Map(); // insertion-order = LRU order
function cacheSet(key, value) {
  if (previewCache.has(key)) previewCache.delete(key); // 갱신 시 순서 재배치
  previewCache.set(key, value);
  if (previewCache.size > PREVIEW_CACHE_MAX) {
    previewCache.delete(previewCache.keys().next().value); // oldest evict
  }
}
function cacheGet(key) { return previewCache.get(key); }
function cacheHas(key) { return previewCache.has(key); }

function useLinkPreview(url) {
  const [preview, setPreview] = useState(cacheHas(url) ? cacheGet(url) : null);
  const [loading, setLoading] = useState(!cacheHas(url) && !!url);

  useEffect(() => {
    if (!url) return;
    if (cacheHas(url)) {
      setPreview(cacheGet(url));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        cacheSet(url, data.error ? null : data);
        setPreview(data.error ? null : data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          cacheSet(url, null);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [url]);

  return { preview, loading };
}

/* ─── 메인 페이지 ────────────────────────────────────────────── */
export default function NotesPage() {
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const { coupleId, userData, userId: myUserId, loading: authLoading } = useCouple('couple_id, role, id');
  const myRole = userData?.role ?? null;

  const [loading,  setLoading]  = useState(true);
  const [notes,    setNotes]    = useState([]);

  const [content,  setContent]  = useState('');
  const [sending,  setSending]  = useState(false);

  // 사진 첨부
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading,    setUploading]    = useState(false);
  const fileInputRef = useRef(null);

  const [search,    setSearch]    = useState('');
  const [searching, setSearching] = useState(false);

  const [editId,      setEditId]      = useState(null);
  const [editContent, setEditContent] = useState('');
  const [deleteId,    setDeleteId]    = useState(null);

  const filtered = search.trim()
    ? notes.filter(n =>
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        (n.link_url || '').toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  useEffect(() => {
    if (authLoading) return;
    if (!coupleId) { setLoading(false); return; }
    const init = async () => {
      // select('*') — image_url 컬럼이 아직 없을 수도 있으므로 방어적으로 전체 선택
      const { data: notesData } = await supabase
        .from('couple_notes')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: true });
      setNotes(notesData || []);
      setLoading(false);
    };
    init();
  }, [authLoading, coupleId]);

  useEffect(() => {
    if (!coupleId) return;

    // 사용자가 맨 아래 근처(200px 이내)에 있는지
    const isNearBottom = () => {
      if (!bottomRef.current) return true;
      const rect = bottomRef.current.getBoundingClientRect();
      return rect.top - window.innerHeight < 200;
    };

    const channel = supabase.channel(`notes-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_notes', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // 중복 여부를 functional update 안에서 판정 (stale closure 방지)
            let wasNew = false;
            setNotes(prev => {
              if (prev.find(n => n.id === payload.new.id)) return prev;
              wasNew = true;
              return [...prev, payload.new];
            });
            // 상대방의 새 메시지 + 사용자가 맨 아래 근처일 때만 자동 스크롤
            // (스크롤 위로 올려 과거 메시지 읽는 중이면 방해 안 함)
            if (wasNew && payload.new.user_id !== myUserId && isNearBottom()) {
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
          }
          if (payload.eventType === 'UPDATE')
            setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
          if (payload.eventType === 'DELETE')
            setNotes(prev => prev.filter(n => n.id !== payload.old.id));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, myUserId]);

  // 언마운트/미리보기 교체 시 object URL 해제 (메모리 누수 방지)
  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  function pickImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }
  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
  }

  async function handleSend() {
    const text = content.trim();
    if ((!text && !imageFile) || !coupleId || !myRole) return;
    setSending(true);

    // 1) 사진 있으면 먼저 업로드
    let imageUrl = null;
    if (imageFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', imageFile);
        const res = await fetch('/api/notes/upload', { method: 'POST', body: fd });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || '사진 업로드 실패');
        imageUrl = out.url;
      } catch (e) {
        alert(e.message || '사진 업로드에 실패했어요.');
        setUploading(false); setSending(false);
        return;
      }
      setUploading(false);
    }

    // 2) 본문에서 URL 자동 추출 → 링크 미리보기 (수동 입력 불필요)
    const autoLink = extractFirstUrl(text);

    const insertObj = {
      couple_id: coupleId, user_id: myUserId, role: myRole,
      content: text, link_url: autoLink || null,
    };
    if (imageUrl) insertObj.image_url = imageUrl;

    let { data, error } = await supabase
      .from('couple_notes').insert(insertObj).select().single();

    // image_url 컬럼이 아직 없는 경우(마이그레이션 전) → 컬럼 제외하고 재시도
    if (error && imageUrl && /image_url/.test(error.message || '')) {
      alert('사진 기능을 켜려면 DB 컬럼을 추가해야 해요 (관리자: couple_notes.image_url). 우선 텍스트만 저장합니다.');
      delete insertObj.image_url;
      ({ data, error } = await supabase.from('couple_notes').insert(insertObj).select().single());
    }

    if (data) setNotes(prev => prev.find(n => n.id === data.id) ? prev : [...prev, data]);
    setContent(''); clearImage(); setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  async function handleEdit(note) {
    if (!editContent.trim()) return;
    const text = editContent.trim();
    const { data } = await supabase
      .from('couple_notes')
      .update({ content: text, link_url: extractFirstUrl(text) || null, updated_at: new Date().toISOString() })
      .eq('id', note.id).select().single();
    if (data) setNotes(prev => prev.map(n => n.id === data.id ? data : n));
    setEditId(null);
  }

  async function handleDelete(id) {
    const note = notes.find(n => n.id === id);
    await supabase.from('couple_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    setDeleteId(null);
    // 첨부 사진이 있으면 Storage에서도 정리 (orphan 방지) — 실패해도 무시
    if (note?.image_url) {
      fetch(`/api/notes/upload?url=${encodeURIComponent(note.image_url)}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  function startEdit(note) {
    setEditId(note.id); setEditContent(note.content);
  }

  const isGroom = myRole === 'groom';

  if (loading) return <PageLoader />;

  /* 날짜 구분선 삽입 */
  const listWithDividers = [];
  filtered.forEach((note, i) => {
    const prev = filtered[i - 1];
    if (!prev || !isSameDay(prev.created_at, note.created_at)) {
      listWithDividers.push({ type: 'divider', date: note.created_at, key: `div-${note.id}` });
    }
    listWithDividers.push({ type: 'note', note, key: note.id });
  });

  return (
    <div className="page-wrapper" style={{
      // 채팅 UX — 입력창을 늘 맨 아래에 두기 위한 flex column 레이아웃
      // 100dvh: 모바일 키보드 열릴 때 자동 축소 (정적 vh보다 정확)
      height: '100dvh',
      minHeight: 0,
      paddingTop: 24,
      paddingBottom: 'calc(88px + env(safe-area-inset-bottom))', // BottomNav 자리 확보
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
            함께 쓰는 메모
          </h1>
          <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--champagne-2)', margin: '2px 0 0', letterSpacing: '0.04em' }}>
            shared notes &amp; links
          </p>
        </div>
        <button
          onClick={() => setSearching(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            color: searching ? 'var(--champagne-2)' : 'var(--ink-4)' }}>
          <Search size={20} />
        </button>
      </div>

      {/* 검색바 */}
      {searching && (
        <div className="mb-3 flex items-center gap-2 px-4 rounded-2xl"
          style={{ backgroundColor: 'var(--toss-bg)', border: '1.5px solid var(--toss-border)', height: 44 }}>
          <Search size={16} color="var(--toss-text-tertiary)" />
          <input autoFocus type="text" placeholder="링크·메모 검색..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'none', outline: 'none',
              fontSize: 14, color: 'var(--toss-text-primary)', fontFamily: 'inherit' }} />
          {search && (
            <button onClick={() => setSearch('')} aria-label="검색 지우기"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={14} color="var(--toss-text-tertiary)" />
            </button>
          )}
        </div>
      )}

      {/* 역할 배지 */}
      <div className="flex items-center justify-between mb-3">
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20,
          backgroundColor: isGroom ? 'var(--champagne-wash)' : 'var(--rose-ed-wash)',
          border: `1px solid ${isGroom ? 'var(--champagne)' : 'var(--rose-ed)'}`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isGroom ? 'var(--champagne)' : 'var(--rose-ed)', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: isGroom ? 'var(--champagne-2)' : 'var(--rose-ed)' }}>
            {isGroom ? '신랑' : '신부'}으로 작성 중
          </span>
        </div>
        <span className="tabular-nums" style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
          {filtered.length}개
        </span>
      </div>

      {/* 노트 목록 — flex:1로 가용 공간 자동 차지, 내부에서 스크롤 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 8 }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title={search ? '검색 결과가 없어요' : '함께 모아둘 정보가 없어요'}
            description={search
              ? '다른 키워드로 검색해보세요'
              : '드레스 후기 링크, 업체 연락처, 친구 추천 메모 — 한쪽이 올리면 상대방도 실시간으로 확인할 수 있어요'}
            compact
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 2px' }}>
            {listWithDividers.map(item =>
              item.type === 'divider' ? (
                /* ── 날짜 구분선 ── */
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0',
                }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--rule-strong)' }} />
                  <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 10.5, color: 'var(--champagne-2)', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                    {formatDividerDate(item.date)}
                  </span>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--rule-strong)' }} />
                </div>
              ) : (
                <NoteItem
                  key={item.key}
                  note={item.note}
                  isMe={item.note.user_id === myUserId}
                  isGroom={item.note.role === 'groom'}
                  editId={editId}
                  editContent={editContent}
                  deleteId={deleteId}
                  onEditStart={() => startEdit(item.note)}
                  onEditChange={(c) => setEditContent(c)}
                  onEditSave={() => handleEdit(item.note)}
                  onEditCancel={() => setEditId(null)}
                  onDeleteRequest={() => setDeleteId(item.note.id)}
                  onDeleteConfirm={() => handleDelete(item.note.id)}
                  onDeleteCancel={() => setDeleteId(null)}
                />
              )
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 맨 아래로 버튼 */}
      {!search && notes.length > 3 && (
        <div className="flex justify-center mb-2">
          <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--toss-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <ChevronDown size={14} /> 최신 메시지로
          </button>
        </div>
      )}

      {/* 입력창 — flex 컨테이너 맨 아래. 자동 확장돼도 바닥 위치는 고정.
          (이전: marginBottom으로 카드가 위로 자라 리스트를 밀어내던 문제 수정) */}
      <div className="card" style={{
        borderRadius: 20,
        padding: '12px 16px',
        flexShrink: 0,
        marginTop: 8,
      }}>
        {/* 첨부 사진 미리보기 */}
        {imagePreview && (
          <div className="mb-2" style={{ position: 'relative', display: 'inline-block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="첨부 사진"
              style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 12, display: 'block', border: '1px solid var(--rule)' }} />
            <button onClick={clearImage} aria-label="사진 제거"
              style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color="white" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* 숨겨진 파일 입력 */}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { pickImage(e.target.files?.[0]); e.target.value = ''; }} />

        <div className="flex items-end gap-2">
          <button onClick={() => fileInputRef.current?.click()} aria-label="사진 첨부"
            style={{ padding: '8px', borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
              backgroundColor: imageFile ? 'var(--champagne-wash)' : 'var(--toss-bg)',
              color: imageFile ? 'var(--champagne-2)' : 'var(--toss-text-tertiary)' }}>
            <ImagePlus size={18} />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            maxLength={1000}
            placeholder="메모나 링크를 붙여넣어 보세요..."
            value={content}
            onChange={e => {
              setContent(e.target.value.slice(0, 1000));
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', overflow: 'hidden',
              fontSize: 14, lineHeight: 1.5, backgroundColor: 'transparent',
              color: 'var(--toss-text-primary)', fontFamily: 'inherit', padding: '6px 0' }}
          />
          <button onClick={handleSend} disabled={(!content.trim() && !imageFile) || sending} aria-label="전송"
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none',
              cursor: (content.trim() || imageFile) ? 'pointer' : 'not-allowed',
              backgroundColor: (content.trim() || imageFile) ? 'var(--ink)' : 'var(--rule-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background-color 0.15s' }}>
            <Send size={16} color="var(--ivory)" />
          </button>
        </div>
        {uploading && (
          <p style={{ fontSize: 11, color: 'var(--champagne-2)', margin: '6px 0 0', textAlign: 'center' }}>
            사진 올리는 중...
          </p>
        )}
      </div>

      <BottomNav active="notes" />
    </div>
  );
}

/* ─── 개별 노트 아이템 ──────────────────────────────────────── */
function NoteItem({ note, isMe, isGroom, editId, editContent, deleteId,
  onEditStart, onEditChange, onEditSave, onEditCancel, onDeleteRequest, onDeleteConfirm, onDeleteCancel }) {

  const isEditing  = editId   === note.id;
  const isDeleting = deleteId === note.id;
  const [copied, setCopied] = useState(false);
  // link_url 우선, 없으면 본문에서 URL 자동 추출 (옛 메모·새 메모 모두 미리보기)
  const effectiveUrl = note.link_url || extractFirstUrl(note.content);
  const { preview, loading: previewLoading } = useLinkPreview(effectiveUrl);

  async function handleCopy() {
    try {
      await copyToClipboard(note.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사 실패 시 무시 */
    }
  }

  const bubbleColor = isGroom
    ? { bg: 'var(--champagne-wash)', text: 'var(--champagne-2)', badge: '신랑' }
    : { bg: 'var(--rose-ed-wash)', text: 'var(--rose-ed)', badge: '신부' };

  const align = isGroom ? 'flex-start' : 'flex-end';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 2 }}>
      {/* 역할 배지 */}
      <span style={{ fontSize: 10, color: 'var(--toss-text-tertiary)',
        paddingLeft: isGroom ? 4 : 0, paddingRight: isGroom ? 0 : 4,
        display: 'flex', alignItems: 'center', gap: 3 }}>
        <Icon name={isGroom ? 'groom' : 'bride'} size={11} color="var(--toss-text-tertiary)" />
        {isGroom ? '신랑' : '신부'}
      </span>

      {/* 말풍선 */}
      <div style={{
        maxWidth: '78%', padding: '10px 14px',
        borderRadius: isGroom ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        backgroundColor: isEditing ? 'white' : bubbleColor.bg,
        border: isEditing ? `1.5px solid ${bubbleColor.text}` : 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
            <textarea autoFocus value={editContent} maxLength={1000}
              onChange={e => onEditChange(e.target.value.slice(0, 1000))} rows={2}
              style={{ border: 'none', outline: 'none', resize: 'none', fontSize: 14,
                lineHeight: 1.5, fontFamily: 'inherit', color: 'var(--toss-text-primary)', width: '100%' }} />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={onEditCancel}
                style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid var(--rule)',
                  backgroundColor: 'var(--ivory)', fontSize: 12, cursor: 'pointer', color: 'var(--toss-text-secondary)' }}>
                취소
              </button>
              <button onClick={onEditSave}
                style={{ padding: '4px 10px', borderRadius: 8, border: 'none',
                  backgroundColor: bubbleColor.text, color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                저장
              </button>
            </div>
          </div>
        ) : isDeleting ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
            <p style={{ fontSize: 13, color: 'var(--toss-text-primary)', margin: 0 }}>삭제할까요?</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onDeleteCancel}
                style={{ flex: 1, padding: '4px 0', borderRadius: 8, border: '1px solid var(--rule)',
                  backgroundColor: 'var(--ivory)', fontSize: 12, cursor: 'pointer', color: 'var(--toss-text-secondary)' }}>
                취소
              </button>
              <button onClick={onDeleteConfirm}
                style={{ flex: 1, padding: '4px 0', borderRadius: 8, border: 'none',
                  backgroundColor: 'var(--clay)', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                삭제
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 첨부 사진 */}
            {note.image_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={note.image_url}
                alt="첨부 사진"
                onClick={() => openExternalUrl(note.image_url)}
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12,
                  display: 'block', cursor: 'pointer', marginBottom: note.content ? 8 : 0 }}
              />
            )}

            {note.content && (
              <p style={{ fontFamily: 'var(--font-serif-ko)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.7,
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 400,
                userSelect: 'text', WebkitUserSelect: 'text' }}>
                {note.content}
              </p>
            )}

            {/* 링크 미리보기 — link_url 또는 본문에서 자동 추출한 URL */}
            {effectiveUrl && (
              <div
                role="link"
                tabIndex={0}
                onClick={() => openExternalUrl(effectiveUrl)}
                onKeyDown={e => e.key === 'Enter' && openExternalUrl(effectiveUrl)}
                style={{ display: 'block', textDecoration: 'none', marginTop: 8, cursor: 'pointer' }}
              >
                {previewLoading ? (
                  /* 로딩 스켈레톤 */
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)',
                    backgroundColor: 'rgba(255,255,255,0.6)', padding: '10px 12px' }}>
                    <div style={{ height: 11, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.08)', marginBottom: 6, width: '70%' }} />
                    <div style={{ height: 9, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.05)', width: '50%' }} />
                  </div>
                ) : preview ? (
                  /* 미리보기 카드 */
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.12)',
                    backgroundColor: 'rgba(255,255,255,0.85)' }}>
                    {preview.image && (
                      <img src={preview.image} alt=""
                        referrerPolicy="no-referrer"
                        style={{ width: '100%', maxHeight: 130, objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    )}
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={preview.favicon} alt=""
                        referrerPolicy="no-referrer"
                        style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0 }}
                        onError={e => { e.target.style.display = 'none'; }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {preview.title && (
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)',
                            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {preview.title}
                          </p>
                        )}
                        <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0' }}>
                          {preview.domain}
                        </p>
                      </div>
                      <ExternalLink size={13} color="var(--ink-3)" style={{ flexShrink: 0 }} />
                    </div>
                  </div>
                ) : (
                  /* 파싱 실패 — 일반 링크 (클릭하면 새 탭에서 열림) */
                  <a
                    href={effectiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
                      padding: '10px 12px', borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={14} color={bubbleColor.text} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 11, color: bubbleColor.text, opacity: 0.6,
                        margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        링크 (탭하면 열려요)
                      </p>
                      <span style={{
                        fontSize: 12, color: bubbleColor.text, wordBreak: 'break-all',
                        textDecoration: 'underline', textDecorationStyle: 'dotted',
                      }}>
                        {effectiveUrl.length > 50 ? effectiveUrl.slice(0, 50) + '…' : effectiveUrl}
                      </span>
                    </div>
                    <ExternalLink size={13} color={bubbleColor.text} style={{ flexShrink: 0 }} />
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 시간 + 수정/삭제 버튼 */}
      {!isEditing && !isDeleting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6,
          flexDirection: isGroom ? 'row' : 'row-reverse',
          paddingLeft: isGroom ? 4 : 0, paddingRight: isGroom ? 0 : 4 }}>
          <span style={{ fontSize: 10, color: 'var(--toss-text-tertiary)' }}>
            {formatNoteTime(note.created_at)}
            {note.updated_at && note.updated_at !== note.created_at ? ' (수정됨)' : ''}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {/* 복사 — 내 메시지·상대 메시지 모두 가능 (말풍선 단위 복사) */}
            {note.content && (
              <button onClick={handleCopy} aria-label="메시지 복사"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                {copied
                  ? <Check size={11} color="var(--champagne-2)" />
                  : <Copy size={11} color="var(--toss-text-tertiary)" />}
              </button>
            )}
            {isMe && (
              <>
                <button onClick={onEditStart} aria-label="수정"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Edit2 size={11} color="var(--toss-text-tertiary)" />
                </button>
                <button onClick={onDeleteRequest} aria-label="삭제"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Trash2 size={11} color="var(--toss-text-tertiary)" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
