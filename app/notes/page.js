'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Send, Link2, Edit2, Trash2, Check, ExternalLink, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

export default function NotesPage() {
  const router = useRouter();
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);

  const [loading, setLoading]   = useState(true);
  const [myRole, setMyRole]     = useState(null);   // 'groom' | 'bride'
  const [myUserId, setMyUserId] = useState(null);
  const [coupleId, setCoupleId] = useState(null);
  const [notes, setNotes]       = useState([]);

  // 입력 상태
  const [content,  setContent]  = useState('');
  const [linkUrl,  setLinkUrl]  = useState('');
  const [showLink, setShowLink] = useState(false);
  const [sending,  setSending]  = useState(false);

  // 검색
  const [search, setSearch]     = useState('');
  const [searching, setSearching] = useState(false);

  // 수정
  const [editId,      setEditId]      = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editLink,    setEditLink]    = useState('');

  // 삭제 확인
  const [deleteId, setDeleteId] = useState(null);

  const filtered = search.trim()
    ? notes.filter(n =>
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        (n.link_url || '').toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  // ── 초기 로드 ──────────────────────────────────────────────
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

  // ── Realtime 구독 ──────────────────────────────────────────
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase.channel(`notes-${coupleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'couple_notes',
        filter: `couple_id=eq.${coupleId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotes(prev => {
            if (prev.find(n => n.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
        if (payload.eventType === 'UPDATE') {
          setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
        }
        if (payload.eventType === 'DELETE') {
          setNotes(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  // ── 새 노트 전송 ────────────────────────────────────────────
  async function handleSend() {
    const text = content.trim();
    if (!text || !coupleId || !myRole) return;
    setSending(true);

    const payload = {
      couple_id: coupleId,
      user_id:   myUserId,
      role:      myRole,
      content:   text,
      link_url:  linkUrl.trim() || null,
    };

    const { data } = await supabase.from('couple_notes').insert(payload).select().single();
    if (data) {
      setNotes(prev => prev.find(n => n.id === data.id) ? prev : [...prev, data]);
    }

    setContent('');
    setLinkUrl('');
    setShowLink(false);
    setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  // ── 수정 저장 ───────────────────────────────────────────────
  async function handleEdit(note) {
    if (!editContent.trim()) return;
    const { data } = await supabase
      .from('couple_notes')
      .update({ content: editContent.trim(), link_url: editLink.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', note.id)
      .select().single();
    if (data) setNotes(prev => prev.map(n => n.id === data.id ? data : n));
    setEditId(null);
  }

  // ── 삭제 ────────────────────────────────────────────────────
  async function handleDelete(id) {
    await supabase.from('couple_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    setDeleteId(null);
  }

  function startEdit(note) {
    setEditId(note.id);
    setEditContent(note.content);
    setEditLink(note.link_url || '');
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const isGroom = myRole === 'groom';

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ paddingBottom: 0 }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
          📎 정보 공유
        </h1>
        <button
          onClick={() => setSearching(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            color: searching ? 'var(--toss-blue)' : 'var(--toss-text-tertiary)' }}>
          <Search size={20} />
        </button>
      </div>

      {/* 검색바 */}
      {searching && (
        <div className="mb-3 flex items-center gap-2 px-4 rounded-2xl"
          style={{ backgroundColor: 'var(--toss-bg)', border: '1.5px solid var(--toss-border)', height: 44 }}>
          <Search size={16} color="var(--toss-text-tertiary)" />
          <input
            autoFocus
            type="text"
            placeholder="링크·메모 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'none', outline: 'none',
              fontSize: 14, color: 'var(--toss-text-primary)', fontFamily: 'inherit' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={14} color="var(--toss-text-tertiary)" />
            </button>
          )}
        </div>
      )}

      {/* 역할 배지 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: isGroom ? '#e8f0fe' : '#fce4ec',
              color: isGroom ? '#1a56db' : '#c2185b' }}>
            {isGroom ? '🤵 신랑' : '👰 신부'} 으로 작성 중
          </div>
        </div>
        <span className="text-xs tabular-nums" style={{ color: 'var(--toss-text-tertiary)' }}>
          {filtered.length}개
        </span>
      </div>

      {/* 노트 목록 */}
      <div style={{ overflowY: 'auto', maxHeight: 'calc(100dvh - 340px)', paddingBottom: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>📎</p>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--toss-text-primary)' }}>
              {search ? '검색 결과가 없어요' : '아직 공유된 정보가 없어요'}
            </p>
            <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)', lineHeight: 1.6 }}>
              {search ? '다른 키워드로 검색해보세요' : '블로그 링크나 메모를 아래에서 공유해보세요'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 2px' }}>
            {filtered.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                isMe={note.user_id === myUserId}
                isGroom={note.role === 'groom'}
                editId={editId}
                editContent={editContent}
                editLink={editLink}
                deleteId={deleteId}
                onEditStart={() => startEdit(note)}
                onEditChange={(c, l) => { setEditContent(c); setEditLink(l); }}
                onEditSave={() => handleEdit(note)}
                onEditCancel={() => setEditId(null)}
                onDeleteRequest={() => setDeleteId(note.id)}
                onDeleteConfirm={() => handleDelete(note.id)}
                onDeleteCancel={() => setDeleteId(null)}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 맨 아래로 버튼 */}
      {!search && notes.length > 3 && (
        <div className="flex justify-center mb-2">
          <button onClick={scrollToBottom}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--toss-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <ChevronDown size={14} /> 최신 메시지로
          </button>
        </div>
      )}

      {/* 입력창 */}
      <div className="card" style={{ borderRadius: 20, marginBottom: 80, padding: '12px 16px' }}>
        {showLink && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--toss-bg)' }}>
            <Link2 size={14} color="var(--toss-blue)" />
            <input
              type="url"
              placeholder="https://..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none',
                fontSize: 13, color: 'var(--toss-text-primary)', fontFamily: 'inherit' }}
            />
            <button onClick={() => { setShowLink(false); setLinkUrl(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={14} color="var(--toss-text-tertiary)" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowLink(v => !v)}
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
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none', overflow: 'hidden',
              fontSize: 14, lineHeight: 1.5, backgroundColor: 'transparent',
              color: 'var(--toss-text-primary)', fontFamily: 'inherit', padding: '6px 0',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!content.trim() || sending}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', cursor: content.trim() ? 'pointer' : 'not-allowed',
              backgroundColor: content.trim() ? 'var(--toss-blue)' : 'var(--toss-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background-color 0.15s',
            }}>
            <Send size={16} color="white" />
          </button>
        </div>
      </div>

      <BottomNav active="notes" />
    </div>
  );
}

// ─── 개별 노트 아이템 ──────────────────────────────────────────────────────
function NoteItem({ note, isMe, isGroom, editId, editContent, editLink, deleteId,
  onEditStart, onEditChange, onEditSave, onEditCancel, onDeleteRequest, onDeleteConfirm, onDeleteCancel }) {

  const isEditing  = editId  === note.id;
  const isDeleting = deleteId === note.id;

  const bubbleColor = isGroom
    ? { bg: '#e8f0fe', text: '#1a56db', badge: '🤵' }
    : { bg: '#fce4ec', text: '#c2185b', badge: '👰' };

  const align = isGroom ? 'flex-start' : 'flex-end';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 2 }}>
      {/* 역할 배지 */}
      <span style={{ fontSize: 10, color: 'var(--toss-text-tertiary)', paddingLeft: isGroom ? 4 : 0, paddingRight: isGroom ? 0 : 4 }}>
        {bubbleColor.badge} {isGroom ? '신랑' : '신부'}
      </span>

      {/* 말풍선 */}
      <div style={{
        maxWidth: '78%', padding: '10px 14px', borderRadius: isGroom ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        backgroundColor: isEditing ? 'white' : bubbleColor.bg,
        border: isEditing ? `1.5px solid ${bubbleColor.text}` : 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {isEditing ? (
          /* 수정 모드 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
            <textarea
              autoFocus
              value={editContent}
              onChange={e => onEditChange(e.target.value, editLink)}
              rows={2}
              style={{ border: 'none', outline: 'none', resize: 'none', fontSize: 14,
                lineHeight: 1.5, fontFamily: 'inherit', color: 'var(--toss-text-primary)', width: '100%' }}
            />
            <div className="flex items-center gap-1.5" style={{ borderTop: '1px solid #e5e8eb', paddingTop: 8 }}>
              <Link2 size={12} color="var(--toss-text-tertiary)" />
              <input type="url" placeholder="링크 (선택)" value={editLink}
                onChange={e => onEditChange(editContent, e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12,
                  fontFamily: 'inherit', color: 'var(--toss-text-secondary)' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={onEditCancel}
                style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #e5e8eb',
                  backgroundColor: 'white', fontSize: 12, cursor: 'pointer', color: 'var(--toss-text-secondary)' }}>
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
          /* 삭제 확인 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
            <p style={{ fontSize: 13, color: 'var(--toss-text-primary)', margin: 0 }}>삭제할까요?</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onDeleteCancel}
                style={{ flex: 1, padding: '4px 0', borderRadius: 8, border: '1px solid #e5e8eb',
                  backgroundColor: 'white', fontSize: 12, cursor: 'pointer', color: 'var(--toss-text-secondary)' }}>
                취소
              </button>
              <button onClick={onDeleteConfirm}
                style={{ flex: 1, padding: '4px 0', borderRadius: 8, border: 'none',
                  backgroundColor: '#ff4d4f', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                삭제
              </button>
            </div>
          </div>
        ) : (
          /* 일반 모드 */
          <>
            <p style={{ fontSize: 14, color: 'var(--toss-text-primary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {note.content}
            </p>
            {note.link_url && (
              <a href={note.link_url} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6,
                  fontSize: 12, color: bubbleColor.text, textDecoration: 'none', wordBreak: 'break-all' }}>
                <Link2 size={11} />
                {note.link_url.length > 40 ? note.link_url.slice(0, 40) + '…' : note.link_url}
                <ExternalLink size={10} style={{ flexShrink: 0 }} />
              </a>
            )}
          </>
        )}
      </div>

      {/* 시간 + 수정/삭제 버튼 */}
      {!isEditing && !isDeleting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6,
          flexDirection: isGroom ? 'row' : 'row-reverse', paddingLeft: isGroom ? 4 : 0, paddingRight: isGroom ? 0 : 4 }}>
          <span style={{ fontSize: 10, color: 'var(--toss-text-tertiary)' }}>
            {new Date(note.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            {note.updated_at !== note.created_at && ' (수정됨)'}
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
