import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const experiment = req.nextUrl.searchParams.get('experiment');
  let q = supabase.from('agent_status').select('*').order('role');
  if (experiment) q = q.eq('experiment_id',experiment);
  const {data,error}=await q;
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({agents:data ?? []});
}
