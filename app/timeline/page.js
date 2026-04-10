'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

const TABS = [
  { label: '이번달', value: null },
  { label: 'D-12', value: 12 },
  { label: 'D-10', value: 10 },
  { label: 'D-8',  value: 8 },
  { label: 'D-6',  value: 6 },
  { label: 'D-3',  value: 3 },
  { label: 'D-1',  value: 1 },
];

const ASSIGNED_LABELS = {
  groom: { label: '신랑', cls: 'tag-stone' },
  bride: { label: '신부', cls: 'tag-rose' },
  both:  { label: '둘다', cls: 'tag-green' },
};

const ASSIGNED_OPTIONS = ['both', 'groom', 'bride'];

export default function TimelinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [coupleId, setCoupleId] = useState(null);
  const [weddingDate, setWeddingDate] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssigned, setNewAssigned] = useState('both');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', session.user.id)
        .single();

      if (!user?.couple_id) { router.push('/connect'); return; }

      const cId = user.couple_id;
      setCoupleId(cId);

      const [coupleRes, itemsRes] = await Promise.all([
        supabase.from('couples').select('wedding_date').eq('id', cId).single(),
        supabase.from('checklist_items').select('*').eq('couple_id', cId).order('due_months_before', { ascending: false }),
      ]);

      setWeddingDate(coupleRes.data?.wedding_date || null);
      setItems(itemsRes.data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  async function toggleItem(id, current) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, is_done: !current } : it))
    );
    await supabase.from('checklist_items').update({ is_done: !current }).eq('id', id);
  }

  async function addItem() {
    if (!newTitle.trim() || !coupleId) return;
    setSaving(true);
    const months = activeTab ?? 1;
    const { data, error } = await supabase
      .from('checklist_items')
      .insert({
        couple_id: coupleId,
        title: newTitle.trim(),
        due_months_before: months,
        assigned_to: newAssigned,
        is_done: false,
      })
      .select()
      .single();

    if (!error && data) {
      setItems((prev) => [...prev, data]);
    }
    setNewTitle('');
    setNewAssigned('both');
    setAdding(false);
    setSaving(false);
  }

  function filterItems(tab) {
    if (tab === null) {
      if (!weddingDate) return items;
      const today = new Date();
      const wedding = new Date(weddingDate);
      const monthsDiff = (wedding - today) / (1000 * 60 * 60 * 24 * 30);
      return items.filter((i) =>
        i.due_months_before >= monthsDiff - 0.5 && i.due_months_before <= monthsDiff + 1.5
      );
    }
    return items.filter((i) => i.due_months_before === tab);
  }

  const displayed = filterItems(activeTab);

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <h1
        className="text-xl font-semibold mb-4"
        style={{ color: 'var(--ink)' }}
      >
        📅 준비 타임라인
      </h1>

      {/* 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((t) => {
          const isActive = t.value === activeTab;
          return (
            <button
              key={String(t.value)}
              onClick={() => setActiveTab(t.value)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: isActive ? 'var(--rose)' : 'white',
                color: isActive ? 'white' : 'var(--stone)',
                border: `1.5px solid ${isActive ? 'var(--rose)' : 'var(--stone-light)'}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 리스트 */}
      <div className="card mb-4">
        {displayed.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--stone)' }}>
            항목이 없어요
          </p>
        ) : (
          <ul className="flex flex-col divide-y" style={{ borderColor: 'var(--beige)' }}>
            {displayed.map((item) => {
              const tag = ASSIGNED_LABELS[item.assigned_to] || ASSIGNED_LABELS.both;
              return (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <button
                    onClick={() => toggleItem(item.id, item.is_done)}
                    className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: item.is_done ? 'var(--rose)' : 'var(--stone-light)',
                      backgroundColor: item.is_done ? 'var(--rose)' : 'transparent',
                    }}
                  >
                    {item.is_done && <span className="text-white text-xs">✓</span>}
                  </button>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: item.is_done ? 'var(--stone)' : 'var(--ink)',
                      textDecoration: item.is_done ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </span>
                  <span className={`tag ${tag.cls}`}>{tag.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 항목 추가 */}
      {adding ? (
        <div className="card flex flex-col gap-3">
          <input
            className="input-field"
            placeholder="항목 이름 입력"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            {ASSIGNED_OPTIONS.map((a) => {
              const lbl = ASSIGNED_LABELS[a];
              return (
                <button
                  key={a}
                  onClick={() => setNewAssigned(a)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: newAssigned === a ? 'var(--rose)' : 'white',
                    color: newAssigned === a ? 'white' : 'var(--stone)',
                    border: `1.5px solid ${newAssigned === a ? 'var(--rose)' : 'var(--stone-light)'}`,
                  }}
                >
                  {lbl.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-outline flex-1"
              onClick={() => { setAdding(false); setNewTitle(''); }}
            >
              취소
            </button>
            <button
              className="btn-rose flex-1"
              onClick={addItem}
              disabled={saving || !newTitle.trim()}
            >
              {saving ? '추가 중...' : '추가'}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn-outline w-full"
          onClick={() => setAdding(true)}
        >
          + 항목 직접 추가
        </button>
      )}

      <BottomNav active="timeline" />
    </div>
  );
}
