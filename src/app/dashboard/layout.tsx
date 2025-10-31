import { AuthProvider } from "@/context/auth-context";
import Image from "next/image";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import Link from 'next/link';
import { BackgroundFlames } from "@/components/background-flames";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <style>{`
          html,body{height:100%;margin:0;overflow:hidden}
          .vignette{position:fixed;inset:0;pointer-events:none;
            background: radial-gradient(70% 90% at 50% 65%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%);
            mix-blend-mode:multiply}
        `}</style>
      <BackgroundFlames />
      <div className="vignette"></div>
      <div style={{position: 'relative', zIndex: 1, height: '100vh', overflowY: 'auto'}}>
        <div className="flex-col md:flex">
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex h-16 items-center px-4 md:px-8">
            <Link href="/dashboard" className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6">
                <rect width="256" height="256" fill="none"></rect>
                <path d="M144,16.8,32.3,108.5a8,8,0,0,0,4.3,14.2l20.6,3.4a8,8,0,0,1,6.5,6.5l3.4,20.6a8,8,0,0,0,14.2,4.3L193.2,48A112,112,0,0,0,48,193.2L157.5,83.7a8,8,0,0,0,4.3,14.2l20.6,3.4a8,8,0,0,1,6.5,6.5l3.4,20.6a8,8,0,0,0,14.2,4.3L239.2,112A112.2,112.2,0,0,0,144,16.8Z" fill="currentColor" className="text-primary"></path>
                </svg>
                <h1 className="text-2xl font-bold tracking-tight">BetWise</h1>
            </Link>
             <div className="ml-auto flex items-center space-x-4">
                <UserNav />
            </div>
            </div>
        </div>
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            {children}
        </div>
        </div>
      </div>
    </AuthProvider>
  );
}
