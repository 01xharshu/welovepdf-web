import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Paper — PDF, refined.', description: 'A precise, private PDF editor for the modern web.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
