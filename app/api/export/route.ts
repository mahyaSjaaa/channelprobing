import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Sample = {
  node: 'alice' | 'bob';
  sequence: number;
  rssi_dbm: number;
  received_at: string;
};

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const experimentId = request.nextUrl.searchParams.get('experiment')?.trim();

  if (!experimentId || experimentId.length > 200) {
    return NextResponse.json({ error: 'Parameter experiment wajib diisi.' }, { status: 400 });
  }

  const { data: experiment, error: experimentError } = await supabase
    .from('experiments')
    .select('id')
    .eq('id', experimentId)
    .maybeSingle();

  if (experimentError) {
    return NextResponse.json({ error: experimentError.message }, { status: 500 });
  }
  if (!experiment) {
    return NextResponse.json({ error: 'Experiment tidak ditemukan.' }, { status: 404 });
  }

  // Supabase membatasi jumlah baris per request; ambil per halaman sampai seluruh data selesai.
  const pageSize = 1000;
  const allSamples: Sample[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('rssi_samples')
      .select('node, sequence, rssi_dbm, received_at')
      .eq('experiment_id', experimentId)
      .order('sequence', { ascending: true })
      .order('node', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const page = (data ?? []) as Sample[];
    allSamples.push(...page);
    if (page.length < pageSize) break;
  }

  // Pasangkan hasil penerimaan Alice dan Bob berdasarkan sequence.
  const paired = new Map<number, {
    sequence: number;
    timestamp_alice: string | null;
    rssi_alice_dbm: number | null;
    timestamp_bob: string | null;
    rssi_bob_dbm: number | null;
  }>();

  for (const sample of allSamples) {
    const row = paired.get(sample.sequence) ?? {
      sequence: sample.sequence,
      timestamp_alice: null,
      rssi_alice_dbm: null,
      timestamp_bob: null,
      rssi_bob_dbm: null,
    };

    if (sample.node === 'alice') {
      row.timestamp_alice = sample.received_at;
      row.rssi_alice_dbm = sample.rssi_dbm;
    } else {
      row.timestamp_bob = sample.received_at;
      row.rssi_bob_dbm = sample.rssi_dbm;
    }
    paired.set(sample.sequence, row);
  }

  const header = [
    'sequence',
    'timestamp_alice',
    'rssi_alice_dbm',
    'timestamp_bob',
    'rssi_bob_dbm',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const row of [...paired.values()].sort((a, b) => a.sequence - b.sequence)) {
    lines.push([
      row.sequence,
      row.timestamp_alice,
      row.rssi_alice_dbm,
      row.timestamp_bob,
      row.rssi_bob_dbm,
    ].map(csvCell).join(','));
  }

  const safeName = experimentId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const csv = '\uFEFF' + lines.join('\r\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="channel_probing_${safeName}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
