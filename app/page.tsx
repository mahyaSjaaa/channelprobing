import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RssiChart from './components/rssi-chart';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Sample = { id: number; experiment_id: string; node: 'alice' | 'bob'; sequence: number; rssi_dbm: number; peer_message: string | null; received_at: string; created_at: string };
type Experiment = { id: string; frequency_hz: number; radio: string; firmware: string; created_at: string; updated_at: string };

function fmtDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}

export default async function Home({ searchParams }: { searchParams: Promise<{ experiment?: string }> }) {
  const params = await searchParams;
  const { data: experiments, error: expError } = await supabase.from('experiments').select('*').order('updated_at', { ascending: false });
  const list = (experiments ?? []) as Experiment[];
  const activeId = list.some((e) => e.id === params.experiment) ? params.experiment! : list[0]?.id;

  let samples: Sample[] = [];
  let sampleError = '';
  if (activeId) {
    const { data, error } = await supabase.from('rssi_samples').select('*').eq('experiment_id', activeId).order('sequence', { ascending: false }).limit(3000);
    samples = ((data ?? []) as Sample[]).reverse();
    sampleError = error?.message ?? '';
  }

  const alice = samples.filter((s) => s.node === 'alice');
  const bob = samples.filter((s) => s.node === 'bob');
  const avg = (arr: Sample[]) => arr.length ? arr.reduce((sum, s) => sum + s.rssi_dbm, 0) / arr.length : null;
  const avgAlice = avg(alice);
  const avgBob = avg(bob);
  const sequences = [...new Set(samples.map((s) => s.sequence))].sort((a, b) => a - b);
  const chartData = sequences.map((sequence) => {
    const a = alice.find((s) => s.sequence === sequence);
    const b = bob.find((s) => s.sequence === sequence);
    return { sequence, alice: a?.rssi_dbm ?? null, bob: b?.rssi_dbm ?? null, timestamp: a?.received_at ?? b?.received_at ?? '' };
  });
  const active = list.find((e) => e.id === activeId);

  return <main className="shell">
    <header className="topbar">
      <div><div className="eyebrow">RESEARCH MONITORING</div><h1>LoRa Channel Probing</h1><p>Monitoring pengukuran RSSI dua arah · Raspberry Pi + Cosmic LoRa Pulse</p></div>
      <div className="live"><span className="live-dot" /> AUTO REFRESH 5 DETIK</div>
    </header>

    {expError && <div className="alert">Gagal mengambil eksperimen: {expError.message}</div>}
    {sampleError && <div className="alert">Gagal mengambil sampel: {sampleError}</div>}

    <section className="panel selector-panel">
      <div><div className="section-label">EKSPERIMEN AKTIF</div><h2>{activeId ?? 'Belum ada eksperimen'}</h2>
        {active && <p className="muted">{active.radio} · {active.firmware} · {(active.frequency_hz / 1e6).toFixed(1)} MHz · diperbarui {fmtDate(active.updated_at)}</p>}
      </div>
      <div className="selector-actions">
        {list.length > 1 && <div className="quick-switch" aria-label="Pilih experiment">{list.slice(0, 5).map((e) => <Link className={`switch-chip ${e.id === activeId ? 'active' : ''}`} href={`/?experiment=${encodeURIComponent(e.id)}`} key={e.id}>{e.id}</Link>)}</div>}
        {activeId && <a className="download-button" href={`/api/export?experiment=${encodeURIComponent(activeId)}`}>↓ Download CSV experiment</a>}
      </div>
    </section>

    {list.length === 0 ? <section className="panel empty-state"><div className="empty-icon">⌁</div><h2>Belum ada data eksperimen</h2><p>Jalankan program Python di Raspberry Pi dengan konfigurasi Supabase yang benar. Setelah tabel <code>experiments</code> terisi, data akan muncul di sini.</p></section> : <>
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-title">TOTAL SAMPEL</div><div className="stat-value">{samples.length.toLocaleString('id-ID')}</div><div className="stat-foot">Sequence unik: {sequences.length}</div></article>
        <article className="stat-card"><div className="stat-title">SAMPEL ALICE</div><div className="stat-value">{alice.length.toLocaleString('id-ID')}</div><div className="stat-foot">Rata-rata RSSI: {avgAlice === null ? '-' : `${avgAlice.toFixed(2)} dBm`}</div></article>
        <article className="stat-card"><div className="stat-title">SAMPEL BOB</div><div className="stat-value">{bob.length.toLocaleString('id-ID')}</div><div className="stat-foot">Rata-rata RSSI: {avgBob === null ? '-' : `${avgBob.toFixed(2)} dBm`}</div></article>
        <article className="stat-card"><div className="stat-title">EKSPERIMEN TERSIMPAN</div><div className="stat-value">{list.length}</div><div className="stat-foot">Seluruh eksperimen Supabase</div></article>
      </section>

      <section className="panel chart-panel"><div className="panel-heading"><div><div className="section-label">CHANNEL QUALITY</div><h2>RSSI per Sequence</h2></div><span className="unit-pill">dBm</span></div><RssiChart data={chartData} /></section>

      <section className="panel table-panel"><div className="panel-heading"><div><div className="section-label">RAW MEASUREMENT</div><h2>Data RSSI Terbaru</h2></div><span className="muted">Maks. 100 baris terakhir</span></div>
        <div className="table-scroll"><table><thead><tr><th>Sequence</th><th>Node penerima</th><th>RSSI</th><th>Pesan peer</th><th>Waktu (WIB)</th></tr></thead><tbody>
          {[...samples].sort((a, b) => b.sequence - a.sequence || b.id - a.id).slice(0, 100).map((s) => <tr key={s.id}><td className="mono">{s.sequence}</td><td><span className={`node-tag ${s.node}`}>{s.node.toUpperCase()}</span></td><td className="rssi-value">{s.rssi_dbm} dBm</td><td>{s.peer_message || '-'}</td><td>{fmtDate(s.received_at)}</td></tr>)}
          {samples.length === 0 && <tr><td colSpan={5} className="no-data">Belum ada sampel pada eksperimen ini.</td></tr>}
        </tbody></table></div>
      </section>
      <section className="panel experiments-panel"><div className="panel-heading"><div><div className="section-label">HISTORY</div><h2>Daftar Eksperimen</h2></div></div><div className="experiment-list">{list.map((e) => <Link className={`experiment-row ${e.id === activeId ? 'selected' : ''}`} href={`/?experiment=${encodeURIComponent(e.id)}`} key={e.id}><span><strong>{e.id}</strong><small>{e.radio} · {(e.frequency_hz / 1e6).toFixed(1)} MHz</small></span><span className="muted">{fmtDate(e.updated_at)}</span><span className="arrow">↗</span></Link>)}</div></section>
    </>}
    <footer>LoRa Channel Probing Dashboard <span>·</span> Data berasal dari Supabase <span>·</span> Waktu ditampilkan dalam WIB</footer>
  </main>;
}
