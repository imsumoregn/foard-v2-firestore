'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, LayoutDashboard, Lightbulb, PenSquare, Target } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


function UserProfile() {
  const { state } = useSidebar();
  return (
    <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
            <AvatarImage src="https://placehold.co/100x100.png" alt="@Ry" data-ai-hint="avatar" />
            <AvatarFallback>RY</AvatarFallback>
        </Avatar>
        <div className={`flex flex-col overflow-hidden transition-all duration-200 ${state === 'collapsed' ? 'w-0' : 'w-auto'}`}>
            <h2 className="text-lg font-semibold tracking-tight text-sidebar-foreground">Ry</h2>
            <p className="text-xs text-muted-foreground">SphynxFT</p>
        </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/notes', label: 'Notes', icon: PenSquare },
    { href: '/reading-list', label: 'Reading List', icon: Book },
    { href: '/goals', label: 'Goals', icon: Target },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <UserProfile />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{
                    children: item.label,
                    className: 'bg-primary text-primary-foreground',
                  }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {/* You can add footer items here if needed */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
           <SidebarTrigger className="md:hidden" />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
