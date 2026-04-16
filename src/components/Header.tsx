import { useState } from 'react';
import { Bell, User, Clock, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCurrentTime, useNotifications } from '@/hooks/useRealtimeData';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  activeFilters?: string[];
  onFilterChange?: (filter: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  userName?: string;
  onProfileClick?: () => void;
  onLogout?: () => void;
  showFilters?: boolean;
  showTabs?: boolean;
}

const timeFilters = ['Real-time', 'Last Hour', 'Last 6h', 'Today', 'Last Week', 'Last Month'];
const tabs = ['Overview', 'Live Status', 'Quick Actions', 'Insights'];

export function Header({ 
  title, 
  subtitle, 
  activeFilters = ['Real-time'], 
  onFilterChange, 
  activeTab = 'Overview', 
  onTabChange, 
  userName = 'Sutha',
  onProfileClick,
  onLogout,
  showFilters = true,
  showTabs = true
}: HeaderProps) {
  const currentTime = useCurrentTime();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [profileOpen, setProfileOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).replace(/\//g, '-');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleProfileClick = () => {
    setProfileOpen(false);
    onProfileClick?.();
  };

  const handleLogout = () => {
    setProfileOpen(false);
    onLogout?.();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Time Filters - Only on Dashboard */}
          {showFilters && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              {timeFilters.map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilters.includes(filter) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onFilterChange?.(filter)}
                  className={activeFilters.includes(filter) 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }
                >
                  {filter}
                </Button>
              ))}
            </div>
          )}

          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Live</span>
          </div>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-slate-500">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800',
                        !notification.read && 'bg-blue-50 dark:bg-blue-900/10'
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-2',
                          notification.type === 'critical' ? 'bg-red-500' :
                          notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        )} />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900 dark:text-white">{notification.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {notification.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User Profile */}
          <Popover open={profileOpen} onOpenChange={setProfileOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{userName}</span>
                <ChevronDown className="w-4 h-4 text-blue-600" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0" align="end">
              <div className="p-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3" 
                  onClick={handleProfileClick}
                >
                  <User className="w-4 h-4" /> Profile
                </Button>
              </div>
              <div className="p-2 border-t border-slate-200 dark:border-slate-700">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-red-600"
                  onClick={handleLogout}
                >
                  <X className="w-4 h-4" /> Logout
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Secondary Navigation - Only on Dashboard */}
      {showTabs && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onTabChange?.(tab)}
                className={activeTab === tab 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'text-slate-600 dark:text-slate-400'
                }
              >
                {tab}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4" />
            <span>{formatDate(currentTime)} {formatTime(currentTime)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
