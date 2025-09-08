
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  LayoutDashboard, 
  Search, 
  Shield, 
  AlertTriangle, 
  Settings, 
  TrendingUp,
  FileText,
  Bell,
  Users,
  Database,
  BarChart3,
  Globe
} from 'lucide-react';

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Monitoraggio',
    icon: Search,
    items: [
      {
        title: 'Contenuti Monitorati',
        href: '/dashboard/contenuti',
        icon: FileText,
      },
      {
        title: 'Analisi Sentiment',
        href: '/dashboard/sentiment',
        icon: TrendingUp,
      },
      {
        title: 'Keywords',
        href: '/dashboard/keywords',
        icon: Search,
      },
      {
        title: 'Integrazione Awario',
        href: '/dashboard/awario',
        icon: Globe,
      },
    ],
  },
  {
    title: 'Verifica Etichette',
    icon: Shield,
    items: [
      {
        title: 'Repository Ufficiali',
        href: '/dashboard/etichette',
        icon: Database,
      },
      {
        title: 'Verifiche',
        href: '/dashboard/verifiche',
        icon: Shield,
      },
    ],
  },
  {
    title: 'Alert & Notifiche',
    icon: AlertTriangle,
    items: [
      {
        title: 'Alert Attivi',
        href: '/dashboard/alert',
        icon: AlertTriangle,
      },
      {
        title: 'Notifiche',
        href: '/dashboard/notifiche',
        icon: Bell,
      },
    ],
  },
  {
    title: 'Report & Export',
    href: '/dashboard/report',
    icon: BarChart3,
  },
  {
    title: 'Configurazioni',
    href: '/dashboard/configurazioni',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="pb-12 w-64 bg-white border-r border-gray-200">
      <div className="space-y-4 py-4">
        <div className="px-6 py-2">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">🫒</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Monitoraggio Olio
              </h2>
              <p className="text-xs text-gray-500">Roma-Lazio</p>
            </div>
          </Link>
        </div>
        
        <Separator className="mx-6" />
        
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <div key={item.title}>
                {item.href ? (
                  <Link href={item.href}>
                    <Button
                      variant={pathname === item.href ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start',
                        pathname === item.href && 'bg-blue-50 text-blue-700 border border-blue-200'
                      )}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {item.title}
                    </Button>
                  </Link>
                ) : (
                  <>
                    <div className="px-3 py-2">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.title}
                      </div>
                    </div>
                    {item.items && (
                      <div className="ml-6 space-y-1">
                        {item.items.map((subItem) => (
                          <Link key={subItem.href} href={subItem.href}>
                            <Button
                              variant={pathname === subItem.href ? 'secondary' : 'ghost'}
                              size="sm"
                              className={cn(
                                'w-full justify-start text-xs',
                                pathname === subItem.href && 'bg-blue-50 text-blue-700 border border-blue-200'
                              )}
                            >
                              <subItem.icon className="mr-2 h-3 w-3" />
                              {subItem.title}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
