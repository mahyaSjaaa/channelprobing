import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Sample = {
  node: 'alice' | 'bob' | 'eve';
  sequence: number;
  rssi_dbm: number;
  peer_message: string | null;
  received_at: string;
};

function cell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

// Format timestamps consistently as local Indonesian Western Time (WIB).
function formatWib(value: string | null | undefined) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')} WIB`;
}

async function getSamples(experimentId: string, nodeFilter: 'alice-bob' | 'eve') {
  const all: Sample[] = [];
  const size = 1000;

  for (let from = 0; ; from += size) {
    let query = supabase
      .from('rssi_samples')
      .select('node,sequence,rssi_dbm,peer_message,received_at')
      .eq('experiment_id', experimentId)
      .order('id', { ascending: true })
      .range(from, from + size - 1);

    query = nodeFilter === 'eve'
      ? query.eq('node', 'eve')
      : query.in('node', ['alice', 'bob']);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Sample[];
    all.push(...rows);
    if (rows.length < size) break;
  }

  return all;
}

export async function GET(req: NextRequest) {
  const experimentId = req.nextUrl.searchParams.get('experiment')?.trim();
  const type = req.nextUrl.searchParams.get('type') ?? 'alice-bob';

  if (!experimentId || experimentId.length > 200) {
    return NextResponse.json(
      { error: 'Parameter experiment wajib diisi.' },
      { status: 400 },
    );
  }

  if (type !== 'alice-bob' && type !== 'eve') {
    return NextResponse.json(
      { error: 'Parameter type harus alice-bob atau eve.' },
      { status: 400 },
    );
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

  let samples: Sample[];
  try {
    samples = await getSamples(experimentId, type);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil data RSSI.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let lines: string[];

  if (type === 'alice-bob') {
    // One row per sequence. RSSI is assigned based on the receiving node.
    const grouped = new Map<number, {
      sequence: number;
      alice: number | null;
      bob: number | null;
      timestamps: string[];
    }>();

    for (const sample of samples) {
      const row = grouped.get(sample.sequence) ?? {
        sequence: sample.sequence,
        alice: null,
        bob: null,
        timestamps: [],
      };

      if (sample.node === 'alice') row.alice = sample.rssi_dbm;
      if (sample.node === 'bob') row.bob = sample.rssi_dbm;
      if (sample.received_at) row.timestamps.push(sample.received_at);
      grouped.set(sample.sequence, row);
    }

    lines = [
      ['sequence', 'alice', 'bob', 'received_at'].map(cell).join(','),
      ...[...grouped.values()]
        .sort((a, b) => a.sequence - b.sequence)
        .map((row) => {
          // For a combined Alice/Bob row, use the earliest receive time available.
          const earliest = row.timestamps
            .map((timestamp) => new Date(timestamp).getTime())
            .filter((timestamp) => Number.isFinite(timestamp))
            .sort((a, b) => a - b)[0];

          const receivedAt = earliest === undefined
            ? ''
            : formatWib(new Date(earliest).toISOString());

          return [row.sequence, row.alice, row.bob, receivedAt].map(cell).join(',');
        }),
    ];
  } else {
    // Eve uses the same wide CSV layout as Alice & Bob.
    // Here, alice/bob represent the RSSI Eve observed from each transmitter.
    const grouped = new Map<number, {
      sequence: number;
      alice: number | null;
      bob: number | null;
      timestamps: string[];
    }>();

    for (const sample of samples) {
      const row = grouped.get(sample.sequence) ?? {
        sequence: sample.sequence,
        alice: null,
        bob: null,
        timestamps: [],
      };

      const transmitter = (sample.peer_message ?? '').toUpperCase();
      if (transmitter === 'ALICE') row.alice = sample.rssi_dbm;
      if (transmitter === 'BOB') row.bob = sample.rssi_dbm;
      if (sample.received_at) row.timestamps.push(sample.received_at);
      grouped.set(sample.sequence, row);
    }

    lines = [
      ['sequence', 'alice', 'bob', 'received_at'].map(cell).join(','),
      ...[...grouped.values()]
        .sort((a, b) => a.sequence - b.sequence)
        .map((row) => {
          const earliest = row.timestamps
            .map((timestamp) => new Date(timestamp).getTime())
            .filter((timestamp) => Number.isFinite(timestamp))
            .sort((a, b) => a - b)[0];

          const receivedAt = earliest === undefined
            ? ''
            : formatWib(new Date(earliest).toISOString());

          return [row.sequence, row.alice, row.bob, receivedAt].map(cell).join(',');
        }),
    ];
  }

  const safeExperimentId = experimentId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = type === 'eve'
    ? `channel_probing_${safeExperimentId}_eve.csv`
    : `channel_probing_${safeExperimentId}_alice_bob.csv`;

  return new NextResponse('\uFEFF' + lines.join('\r\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
