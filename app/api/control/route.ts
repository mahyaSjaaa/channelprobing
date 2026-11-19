import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({error:'Invalid JSON'}, {status:400}); }
  const { role, action, experimentId } = body ?? {};
  const roles = ['alice','bob','eve'];
  if (!['start','stop'].includes(action)) return NextResponse.json({error:'Invalid action'}, {status:400});
  if (action === 'start' && (!roles.includes(role) || typeof experimentId !== 'string' || !experimentId.trim())) return NextResponse.json({error:'Role dan experiment ID wajib diisi.'}, {status:400});
  if (action === 'start') {
    const {error: expError}=await supabase.from('experiments').upsert({id:experimentId.trim(),frequency_hz:920000000,radio:'RF95W',firmware:'LoRa_Python_Bridge',updated_at:new Date().toISOString()},{onConflict:'id'});
    if(expError)return NextResponse.json({error:expError.message},{status:500});
  }
  const targets = action === 'stop' ? roles : [role];
  const rows = targets.map((r:string) => ({ role:r, action, experiment_id: action === 'start' ? experimentId.trim() : null, status:'queued' }));
  const { data, error } = await supabase.from('agent_commands').insert(rows).select('id,role,action,status');
  if (error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true,commands:data});
}
