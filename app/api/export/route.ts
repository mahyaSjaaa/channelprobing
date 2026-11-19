import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
export const dynamic='force-dynamic'; export const revalidate=0;
type Sample={node:string;sequence:number;rssi_dbm:number;peer_message:string|null;received_at:string};
function cell(v:unknown){const s=v===null||v===undefined?'':String(v);return `"${s.replace(/"/g,'""')}"`;}
export async function GET(req:NextRequest){const experimentId=req.nextUrl.searchParams.get('experiment')?.trim();if(!experimentId||experimentId.length>200)return NextResponse.json({error:'Parameter experiment wajib diisi.'},{status:400});
 const {data:experiment,error:ee}=await supabase.from('experiments').select('id').eq('id',experimentId).maybeSingle();if(ee)return NextResponse.json({error:ee.message},{status:500});if(!experiment)return NextResponse.json({error:'Experiment tidak ditemukan.'},{status:404});
 const all:Sample[]=[];const size=1000;for(let from=0;;from+=size){const {data,error}=await supabase.from('rssi_samples').select('node,sequence,rssi_dbm,peer_message,received_at').eq('experiment_id',experimentId).order('id',{ascending:true}).range(from,from+size-1);if(error)return NextResponse.json({error:error.message},{status:500});const rows=(data??[]) as Sample[];all.push(...rows);if(rows.length<size)break;}
 const lines=[['sequence','receiver_node','transmitter','rssi_dbm','received_at'].map(cell).join(',')];for(const s of all){const sender=s.node==='eve'?(s.peer_message??''):(s.node==='alice'?'BOB':'ALICE');lines.push([s.sequence,s.node,sender,s.rssi_dbm,s.received_at].map(cell).join(','));}
 const safe=experimentId.replace(/[^a-zA-Z0-9._-]/g,'_');return new NextResponse('\uFEFF'+lines.join('\r\n'),{status:200,headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="channel_probing_${safe}.csv"`,'Cache-Control':'no-store'}});
}
