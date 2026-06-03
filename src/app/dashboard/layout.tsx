import { AuthProvider } from "@/context/auth-context";
import Image from "next/image";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex-col md:flex">
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex min-h-14 items-center px-3 py-2 md:h-16 md:px-8 md:py-0">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6">
                <rect width="256" height="256" fill="none"></rect>
                <path d="M144,16.8,32.3,108.5a8,8,0,0,0,4.3,14.2l20.6,3.4a8,8,0,0,1,6.5,6.5l3.4,20.6a8,8,0,0,0,14.2,4.3L193.2,48A112,112,0,0,0,48,193.2L157.5,83.7a8,8,0,0,0,4.3,14.2l20.6,3.4a8,8,0,0,1,6.5,6.5l3.4,20.6a8,8,0,0,0,14.2,4.3L239.2,112A112.2,112.2,0,0,0,144,16.8Z" fill="currentColor" className="text-primary"></path>
                </svg>
                <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">BetWise</h1>
            </Link>
            <MainNav className="mx-6 hidden md:flex" />
             <div className="ml-auto flex items-center space-x-2 md:space-x-4">
                <UserNav />
            </div>
            </div>
            <div className="border-t px-3 py-2 md:hidden">
                <MainNav />
            </div>
        </div>
        <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-8">
            {children}
        </div>
        </div>
    </AuthProvider>
  );
}
