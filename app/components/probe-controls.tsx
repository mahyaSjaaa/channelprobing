'use client';
import { useEffect, useState } from 'react';
const roles = ['alice','bob','eve'] as const;
type Role = typeof roles[number];
type Agent = { role: Role; device_id: string | null; status: string; experiment_id: string | null; last_seen_at: string | null; error: string | null };
export default function ProbeControls({experimentId}:{experimentId:string}) {
  const [agents,setAgents]=useState<Agent[]>([]); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  async function refresh(){ if(!experimentId)return; const r=await fetch(`/api/status?experiment=${encodeURIComponent(experimentId)}`,{cache:'no-store'}); const j=await r.json(); if(r.ok)setAgents(j.agents??[]); }
  useEffect(()=>{ refresh(); const t=setInterval(refresh,3000); return()=>clearInterval(t); },[experimentId]);
  async function command(action:'start'|'stop',role?:Role){ setBusy(true); setMessage(''); try { const r=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,role,experimentId})}); const j=await r.json(); if(!r.ok)throw new Error(j.error); setMessage(action==='stop'?'Perintah stop dikirim ke Alice, Bob, dan Eve.':`Perintah start ${role?.toUpperCase()} dikirim.`); await refresh(); } catch(e){setMessage(e instanceof Error?e.message:'Gagal mengirim perintah');} finally{setBusy(false);} }
  return <section className="panel control-panel"><div className="panel-heading"><div><div className="section-label">REMOTE CONTROL</div><h2>Kontrol Channel Probing</h2></div></div>
    <div className="control-buttons">{roles.map(role=><button key={role} disabled={busy||!experimentId} onClick={()=>command('start',role)} className="download-button">Start {role.toUpperCase()}</button>)}<button disabled={busy} onClick={()=>command('stop')} className="download-button stop-button">Stop Channel Probing</button></div>
    <div className="agent-grid">{roles.map(role=>{const a=agents.find(x=>x.role===role);return <div key={role} className="agent-card"><strong>{role.toUpperCase()}</strong><span className={`agent-status ${a?.status??'offline'}`}>{a?.status??'offline'}</span><small>{a?.device_id??'Belum terhubung'}</small>{a?.error&&<small className="agent-error">{a.error}</small>}</div>})}</div>{message&&<p className="muted">{message}</p>}</section>;
}
