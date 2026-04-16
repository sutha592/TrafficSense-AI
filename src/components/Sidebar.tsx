import { 
  LayoutDashboard, 
  Monitor, 
  BarChart3, 
  Settings, 
  Sun, 
  Moon,
  Cpu,
  Activity,
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  isDarkMode: boolean;
  onThemeChange: (dark: boolean) => void;
  systemStatus: {
    cpu: number;
    memory: number;
    network: number;
  };
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'monitoring', label: 'Monitoring', icon: Monitor },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activePage, onPageChange, isDarkMode, onThemeChange, systemStatus }: SidebarProps) {
  return (
    <div className="w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-white">Traffic AI</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Smart Control</p>
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="p-4">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex items-center gap-2">
          <Button
            variant={!isDarkMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onThemeChange(false)}
            className={cn(
              'flex-1 gap-2',
              !isDarkMode ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
            )}
          >
            <Sun className="w-4 h-4" />
            Light
          </Button>
          <Button
            variant={isDarkMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onThemeChange(true)}
            className={cn(
              'flex-1 gap-2',
              isDarkMode ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
            )}
          >
            <Moon className="w-4 h-4" />
            Dark
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-blue-500')} />
              <span className="font-medium">{item.label}</span>
              {isActive && <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          System Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Cpu className="w-4 h-4" />
              <span>CPU</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                systemStatus.cpu < 50 ? 'bg-emerald-500' : systemStatus.cpu < 80 ? 'bg-yellow-500' : 'bg-red-500'
              )} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {systemStatus.cpu.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Activity className="w-4 h-4" />
              <span>Memory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                systemStatus.memory < 70 ? 'bg-emerald-500' : systemStatus.memory < 85 ? 'bg-yellow-500' : 'bg-red-500'
              )} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {systemStatus.memory.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Wifi className="w-4 h-4" />
              <span>Network</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                systemStatus.network < 3 ? 'bg-emerald-500' : 'bg-yellow-500'
              )} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {systemStatus.network.toFixed(0)}ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
