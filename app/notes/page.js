'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Send, Link2, Edit2, Trash2, ExternalLink, ChevronDown, StickyNote } from 'lucide-react';
import { openExternalUrl } from '@/lib/openUrl';
import Icon from '@/components/Icon';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

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

/* ─── 링크 미리보기 캐시 (세션 수준) ────────────────────────── */
const previewCache = new Map();

function useLinkPreview(url) {
  const [preview, setPreview] = useState(previewCache.get(url) ?? null);
  const [loading, setLoading] = useState(!previewCache.has(url) && !!url);

  useEffect(() => {
    if (!url) return;
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (!data.error) {
          previewCache.set(url, data);
          setPreview(data);
        } else {
          previewCache.set(url, null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          previewCache.set(url, null);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [url]);

  return { preview, loading };
}

/* ─── 메인 페이지 ────────────────────────────────────────────── */
export default function NotesPage() {
  const router = useRouter();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const [loading,  setLoading]  = useState(true);
  const [myRole,   setMyRole]   = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [coupleId, setCoupleId] = useState(null);
  const [notes,    setNotes]    = useState([]);

  const [content,  setContent]  = useState('');
  const [linkUrl,  setLinkUrl]  = useState('');
  const [showLink, setShowLink] = useState(false);
  const [sending,  setSending]  = useState(false);

  const [search,    setSearch]    = useState('');
  const [searching, setSearching] = useState(false);

  const [editId,      setEditId]      = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editLink,    setEditLink]    = useState('');
  const [deleteId,    setDeleteId]    = useState(null);

  const filtered = search.trim()
    ? notes.filter(n =>
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        (n.link_url || '').toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: userData } = await supabase
        .from('users').select('couple_id, role, id').eq('id', session.user.id).single();
      if (!userData?.couple_id) { setLoading(false); return; }

      setMyRole(userData.role);
      setMyUserId(userData.id);
      setCoupleId(userData.couple_id);

      const { data: notesData } = await supabase
        .from('couple_notes')
        .select('*')
        .eq('couple_id', userData.couple_id)
        .order('created_at', { ascending: true });

      setNotes(notesData || []);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase.channel(`notes-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_notes', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === 'INSERT')
            setNotes(prev => prev.find(n => n.id === payload.new.id) ? prev : [...prev, payload.new]);
          if (payload.eventType === 'UPDATE')
            setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
          if (payload.eventType === 'DELETE')
            setNotes(prev => prev.filter(n => n.id !== payload.old.id));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  async function handleSend() {
    const text = content.trim();
    if (!text || !coupleId || !myRole) return;
    setSending(true);
    const { data } = await supabase
      .from('couple_notes')
      .insert({ couple_id: coupleId, user_id: myUserId, role: myRole, content: text, link_url: linkUrl.trim() || null })
      .select().single();
    if (data) setNotes(prev => prev.find(n => n.id === data.id) ? prev : [...prev, data]);
    setContent(''); setLinkUrl(''); setShowLink(false); setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  async function handleEdit(note) {
    if (!editContent.trim()) return;
    const { data } = await supabase
      .from('couple_notes')
      .update({ content: editContent.trim(), link_url: editLink.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', note.id).select().single();
    if (data) setNotes(prev => prev.map(n => n.id === data.id ? data : n));
    setEditId(null);
  }

  async function handleDelete(id) {
    await supabase.from('couple_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    setDeleteId(null);
  }

  function startEdit(note) {
    setEditId(note.id); setEditContent(note.content); setEditLink(note.link_url || '');
  }

  const isGroom = myRole === 'groom';

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>불러오는 중...</p>
      </div>
    );
  }

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
    <div className="page-wrapper" style={{ paddingBottom: 0 }}>
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
            <button onClick={() => setSearch('')}
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
          <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 10, color: isGroom ? 'var(--champagne-2)' : 'var(--rose-ed)', letterSpacing: '0.04em' }}>
            {isGroom ? 'groom' : 'bride'}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: isGroom ? 'var(--champagne)' : 'var(--rose-ed)', display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: isGroom ? 'var(--champagne-2)' : 'var(--rose-ed)' }}>
            {isGroom ? '신랑' : '신부'} 으로 작성 중
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 11, color: 'var(--ink-4)' }}>
          {filtered.length} notes
        </span>
      </div>

      {/* 노트 목록 */}
      <div style={{ overflowY: 'auto', maxHeight: 'calc(100dvh - 340px)', paddingBottom: 8 }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title={search ? '검색 결과가 없어요' : '아직 공유된 정보가 없어요'}
            description={search ? '다른 키워드로 검색해보세요' : '블로그 링크나 메모를 아래에서 공유해보세요'}
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
                  editLink={editLink}
                  deleteId={deleteId}
                  onEditStart={() => startEdit(item.note)}
                  onEditChange={(c, l) => { setEditContent(c); setEditLink(l); }}
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

      {/* 입력창 */}
      <div className="card" style={{ borderRadius: 20, marginBottom: 'calc(80px + env(safe-area-inset-bottom))', padding: '12px 16px' }}>
        {showLink && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--toss-bg)' }}>
            <Link2 size={14} color="var(--toss-blue)" />
            <input type="url" placeholder="https://..." value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none',
                fontSize: 13, color: 'var(--toss-text-primary)', fontFamily: 'inherit' }} />
            <button onClick={() => { setShowLink(false); setLinkUrl(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={14} color="var(--toss-text-tertiary)" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button onClick={() => setShowLink(v => !v)}
            style={{ padding: '8px', borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
              backgroundColor: showLink ? 'var(--toss-blue-light)' : 'var(--toss-bg)',
              color: showLink ? 'var(--toss-blue)' : 'var(--toss-text-tertiary)' }}>
            <Link2 size={18} />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="링크나 메모를 남겨보세요..."
            value={content}
            onChange={e => {
              setContent(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', overflow: 'hidden',
              fontSize: 14, lineHeight: 1.5, backgroundColor: 'transparent',
              color: 'var(--toss-text-primary)', fontFamily: 'inherit', padding: '6px 0' }}
          />
          <button onClick={handleSend} disabled={!content.trim() || sending}
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none',
              cursor: content.trim() ? 'pointer' : 'not-allowed',
              backgroundColor: content.trim() ? 'var(--ink)' : 'var(--rule-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background-color 0.15s' }}>
            <Send size={16} color="var(--ivory)" />
          </button>
        </div>
      </div>

      <BottomNav active="notes" />
    </div>
  );
}

/* ─── 개별 노트 아이템 ──────────────────────────────────────── */
function NoteItem({ note, isMe, isGroom, editId, editContent, editLink, deleteId,
  onEditStart, onEditChange, onEditSave, onEditCancel, onDeleteRequest, onDeleteConfirm, onDeleteCancel }) {

  const isEditing  = editId   === note.id;
  const isDeleting = deleteId === note.id;
  const { preview, loading: previewLoading } = useLinkPreview(note.link_url);

  const bubbleColor = isGroom
    ? { bg: 'var(--champagne-wash)', text: 'var(--champagne-2)', badge: '신랑' }
    : { bg: 'var(--rose-ed-wash)', text: 'var(--rose-ed)', badge: '신부' };

  const align = isGroom ? 'flex-start' : 'flex-end';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 2 }}>
      {/* 역할 배지 */}
      <span style={{ fontSize: 10, color: 'var(--toss-text-tertiary)',
        paddingLeft: isGroom ? 4 : 0, paddingRight: isGroom ? 0 : 4 }}>
        {bubbleColor.badge} {isGroom ? '신랑' : '신부'}
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
            <textarea autoFocus value={editContent}
              onChange={e => onEditChange(e.target.value, editLink)} rows={2}
              style={{ border: 'none', outline: 'none', resize: 'none', fontSize: 14,
                lineHeight: 1.5, fontFamily: 'inherit', color: 'var(--toss-text-primary)', width: '100%' }} />
            <div className="flex items-center gap-1.5"
              style={{ borderTop: '1px solid var(--rule)', paddingTop: 8 }}>
              <Link2 size={12} color="var(--toss-text-tertiary)" />
              <input type="url" placeholder="링크 (선택)" value={editLink}
                onChange={e => onEditChange(editContent, e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12,
                  fontFamily: 'inherit', color: 'var(--toss-text-secondary)' }} />
            </div>
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
            <p style={{ fontFamily: 'var(--font-serif-ko)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.7,
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 400 }}>
              {note.content}
            </p>

            {/* 링크 미리보기 */}
            {note.link_url && (
              <div
                role="link"
                tabIndex={0}
                onClick={() => openExternalUrl(note.link_url)}
                onKeyDown={e => e.key === 'Enter' && openExternalUrl(note.link_url)}
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
                        style={{ width: '100%', maxHeight: 130, objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    )}
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={preview.favicon} alt=""
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
                  /* 파싱 실패 — 일반 링크 */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
                    padding: '8px 10px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(0,0,0,0.08)' }}>
                    <Link2 size={13} color={bubbleColor.text} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: bubbleColor.text, wordBreak: 'break-all', flex: 1 }}>
                      {note.link_url.length > 40 ? note.link_url.slice(0, 40) + '…' : note.link_url}
                    </span>
                    <ExternalLink size={12} color={bubbleColor.text} style={{ flexShrink: 0 }} />
                  </div>
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
          {isMe && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={onEditStart}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <Edit2 size={11} color="var(--toss-text-tertiary)" />
              </button>
              <button onClick={onDeleteRequest}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <Trash2 size={11} color="var(--toss-text-tertiary)" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
