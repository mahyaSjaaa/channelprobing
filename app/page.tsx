import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RssiChart from './components/rssi-chart';
import ProbeControls from './components/probe-controls';
import ExperimentLauncher from './components/experiment-launcher';
export const dynamic='force-dynamic'; export const revalidate=0;
type Node='alice'|'bob'|'eve';
type Sample={id:number;experiment_id:string;node:Node;sequence:number;rssi_dbm:number;peer_message:string|null;received_at:string;created_at:string};
type Experiment={id:string;frequency_hz:number;radio:string;firmware:string;created_at:string;updated_at:string};
function fmtDate(v?:string|null){if(!v)return '-';return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'medium',timeZone:'Asia/Jakarta'}).format(new Date(v));}
export default async function Home({searchParams}:{searchParams:Promise<{experiment?:string;page?:string}>}){
 const params=await searchParams;
 const {data:experiments,error:expError}=await supabase.from('experiments').select('*').order('updated_at',{ascending:false});
 const list=(experiments??[]) as Experiment[];
 const activeId=list.some(e=>e.id===params.experiment)?params.experiment!:list[0]?.id;
 const pageSize=50; let page=Math.max(1,Number(params.page||1)); if(!Number.isFinite(page))page=1;
 let samples:Sample[]=[];let sampleError='';let total=0;
 if(activeId){const {data,count,error}=await supabase.from('rssi_samples').select('*',{count:'exact'}).eq('experiment_id',activeId).order('id',{ascending:false}).range((page-1)*pageSize,page*pageSize-1);samples=(data??[]) as Sample[];total=count??0;sampleError=error?.message??'';}
 const totalPages=Math.max(1,Math.ceil(total/pageSize));
 const counts:Record<Node,number>={alice:0,bob:0,eve:0};
 if(activeId){for(const n of ['alice','bob','eve'] as Node[]){const {count}=await supabase.from('rssi_samples').select('id',{count:'exact',head:true}).eq('experiment_id',activeId).eq('node',n);counts[n]=count??0;}}
 const grouped=new Map<number,{sequence:number;alice:number|null;bob:number|null;eveAlice:number|null;eveBob:number|null;timestamp:string}>();
 for(const s of samples){const x=grouped.get(s.sequence)??{sequence:s.sequence,alice:null,bob:null,eveAlice:null,eveBob:null,timestamp:s.received_at};if(s.node==='alice')x.alice=s.rssi_dbm;else if(s.node==='bob')x.bob=s.rssi_dbm;else if(s.peer_message==='ALICE')x.eveAlice=s.rssi_dbm;else if(s.peer_message==='BOB')x.eveBob=s.rssi_dbm;grouped.set(s.sequence,x);}
 const chartData=[...grouped.values()].sort((a,b)=>a.sequence-b.sequence);
 const active=list.find(e=>e.id===activeId);
 const pageUrl=(p:number)=>`/?experiment=${encodeURIComponent(activeId??'')}&page=${p}`;
 return <main className="shell"><header className="topbar"><div><div className="eyebrow">RESEARCH MONITORING</div><h1>LoRa Channel Probing</h1><p>Monitoring Alice, Bob, dan Eve · Raspberry Pi + Cosmic LoRa Pulse</p></div><div className="live"><span className="live-dot"/> AUTO REFRESH 5 DETIK</div></header>
 {expError&&<div className="alert">Gagal mengambil eksperimen: {expError.message}</div>}{sampleError&&<div className="alert">Gagal mengambil sampel: {sampleError}</div>}
 <ExperimentLauncher/>
 <section className="panel selector-panel"><div><div className="section-label">EKSPERIMEN AKTIF</div><h2>{activeId??'Belum ada eksperimen'}</h2>{active&&<p className="muted">{active.radio} · {active.firmware} · {(active.frequency_hz/1e6).toFixed(1)} MHz · diperbarui {fmtDate(active.updated_at)}</p>}</div><div className="selector-actions">{list.length>1&&<div className="quick-switch" aria-label="Pilih experiment">{list.slice(0,5).map(e=><Link className={`switch-chip ${e.id===activeId?'active':''}`} href={`/?experiment=${encodeURIComponent(e.id)}`} key={e.id}>{e.id}</Link>)}</div>}{activeId&&<a className="download-button" href={`/api/export?experiment=${encodeURIComponent(activeId)}`}>↓ Download CSV experiment</a>}</div></section>
 {list.length===0?<section className="panel empty-state"><div className="empty-icon">⌁</div><h2>Belum ada data eksperimen</h2><p>Pilih atau mulai eksperimen. Perintah Start dari dashboard akan membuat record eksperimen jika belum ada.</p></section>:<>
 <ProbeControls experimentId={activeId??''}/>
 <section className="stats-grid"><article className="stat-card"><div className="stat-title">TOTAL SAMPEL</div><div className="stat-value">{total.toLocaleString('id-ID')}</div><div className="stat-foot">Total seluruh halaman</div></article><article className="stat-card"><div className="stat-title">SAMPEL ALICE</div><div className="stat-value">{counts.alice.toLocaleString('id-ID')}</div><div className="stat-foot">RSSI yang diterima Alice</div></article><article className="stat-card"><div className="stat-title">SAMPEL BOB</div><div className="stat-value">{counts.bob.toLocaleString('id-ID')}</div><div className="stat-foot">RSSI yang diterima Bob</div></article><article className="stat-card"><div className="stat-title">SAMPEL EVE</div><div className="stat-value">{counts.eve.toLocaleString('id-ID')}</div><div className="stat-foot">Paket Alice dan Bob yang didengar Eve</div></article></section>
 <section className="panel chart-panel"><div className="panel-heading"><div><div className="section-label">CHANNEL QUALITY</div><h2>RSSI per Sequence — halaman aktif</h2></div><span className="unit-pill">dBm</span></div><RssiChart data={chartData}/></section>
 <section className="panel table-panel"><div className="panel-heading"><div><div className="section-label">RAW MEASUREMENT</div><h2>Data RSSI</h2></div><span className="muted">{total.toLocaleString('id-ID')} baris · {pageSize} per halaman</span></div>
 <div className="table-scroll"><table><thead><tr><th>Sequence</th><th>Node penerima</th><th>Pengirim</th><th>RSSI</th><th>Waktu (WIB)</th></tr></thead><tbody>{samples.map(s=><tr key={s.id}><td className="mono">{s.sequence}</td><td><span className={`node-tag ${s.node}`}>{s.node.toUpperCase()}</span></td><td>{s.node==='eve'?s.peer_message??'-':s.node==='alice'?'BOB':'ALICE'}</td><td className="rssi-value">{s.rssi_dbm} dBm</td><td>{fmtDate(s.received_at)}</td></tr>)}{samples.length===0&&<tr><td colSpan={5} className="no-data">Belum ada sampel pada halaman ini.</td></tr>}</tbody></table></div>
 <div className="pagination"><span>Halaman {page} dari {totalPages}</span><div><Link aria-disabled={page<=1} className={`page-link ${page<=1?'disabled':''}`} href={pageUrl(Math.max(1,page-1))}>← Sebelumnya</Link><Link aria-disabled={page>=totalPages} className={`page-link ${page>=totalPages?'disabled':''}`} href={pageUrl(Math.min(totalPages,page+1))}>Berikutnya →</Link></div></div></section>
 <section className="panel experiments-panel"><div className="panel-heading"><div><div className="section-label">HISTORY</div><h2>Daftar Eksperimen</h2></div></div><div className="experiment-list">{list.map(e=><Link className={`experiment-row ${e.id===activeId?'selected':''}`} href={`/?experiment=${encodeURIComponent(e.id)}`} key={e.id}><span><strong>{e.id}</strong><small>{e.radio} · {(e.frequency_hz/1e6).toFixed(1)} MHz</small></span><span className="muted">{fmtDate(e.updated_at)}</span><span className="arrow">↗</span></Link>)}</div></section>
 </>}
 <footer>LoRa Channel Probing Dashboard · Data berasal dari Supabase · Waktu ditampilkan dalam WIB</footer></main>;
}
