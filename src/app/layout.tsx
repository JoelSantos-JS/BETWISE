import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { BackgroundFlames } from '@/components/background-flames';

export const metadata: Metadata = {
  title: 'BetWise Dashboard',
  description: 'An intelligent dashboard for tracking and analyzing your betting performance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          html,body{height:100%;margin:0;overflow:hidden}
          .vignette{position:fixed;inset:0;pointer-events:none;
            background: radial-gradient(70% 90% at 50% 65%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%);
            mix-blend-mode:multiply}
        `}</style>
      </head>
      <body className="font-body antialiased bg-background">
        <BackgroundFlames />
        <div className="vignette"></div>
        <div style={{position: 'relative', zIndex: 1, height: '100vh', overflowY: 'auto'}}>
            {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
