import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Dashboard } from '@/pages/Dashboard';
import { Monitoring } from '@/pages/Monitoring';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';
import { useSystemStatus } from '@/hooks/useRealtimeData';
import { cn } from '@/lib/utils';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Real-time');
  const [activeTab, setActiveTab] = useState('Overview');
  const [userName, setUserName] = useState('Sutha');
  const systemStatus = useSystemStatus();

  const handleProfileClick = () => {
    setActivePage('settings');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      alert('Logged out successfully!');
      // In a real app, this would clear session and redirect to login
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard activeFilter={activeFilter} activeTab={activeTab} onTabChange={setActiveTab} />;
      case 'monitoring':
        return <Monitoring />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings onNameChange={setUserName} />;
      default:
        return <Dashboard activeFilter={activeFilter} activeTab={activeTab} onTabChange={setActiveTab} />;
    }
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return { title: 'Traffic Control Dashboard', subtitle: `Welcome back, ${userName}` };
      case 'monitoring':
        return { title: 'Traffic Monitoring', subtitle: 'Real-time intersection monitoring and control' };
      case 'analytics':
        return { title: 'Analytics Dashboard', subtitle: 'Comprehensive traffic analysis and insights' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Configure system preferences' };
      default:
        return { title: 'Traffic Control Dashboard', subtitle: '' };
    }
  };

  const pageInfo = getPageTitle();
  const isDashboard = activePage === 'dashboard';

  return (
    <div className={cn('flex h-screen overflow-hidden', isDarkMode && 'dark')}>
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage}
        isDarkMode={isDarkMode}
        onThemeChange={setIsDarkMode}
        systemStatus={systemStatus}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Header 
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          activeFilters={[activeFilter]}
          onFilterChange={setActiveFilter}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userName={userName}
          onProfileClick={handleProfileClick}
          onLogout={handleLogout}
          showFilters={isDashboard && activeTab === 'Overview'}
          showTabs={isDashboard}
        />
        
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
