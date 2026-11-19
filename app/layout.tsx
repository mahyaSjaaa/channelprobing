import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LoRa Channel Probing Dashboard',
  description: 'Monitoring RSSI channel probing Alice dan Bob melalui Supabase',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
