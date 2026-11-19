'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Point = { sequence: number; alice: number | null; bob: number | null; timestamp: string };

export default function RssiChart({ data }: { data: Point[] }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [router]);

  if (!data.length) return <div className="empty-chart">Belum ada sampel RSSI untuk eksperimen ini.</div>;
  return <div className="chart-wrap">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7eaf0" />
        <XAxis dataKey="sequence" tick={{ fill: '#687386', fontSize: 12 }} label={{ value: 'Sequence', position: 'insideBottom', offset: -4, fill: '#687386' }} />
        <YAxis domain={['auto', 'auto']} tick={{ fill: '#687386', fontSize: 12 }} unit=" dBm" width={76} />
        <Tooltip labelFormatter={(v) => `Sequence ${v}`} formatter={(v) => [`${v} dBm`]} />
        <Legend />
        <Line connectNulls type="monotone" dataKey="alice" name="Alice (RSSI diterima Alice)" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line connectNulls type="monotone" dataKey="bob" name="Bob (RSSI diterima Bob)" stroke="#e07828" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
