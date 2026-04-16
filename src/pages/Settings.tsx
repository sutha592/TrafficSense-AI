import { useState, useEffect } from 'react';
import { 
  Bell, Shield, Database, Globe, Moon, Smartphone, Mail, Save,
  RefreshCw, User, Download, Check, X, Upload, FileText, Trash2, QrCode
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { indianStatesTrafficData } from '@/data/indianTrafficData';

// ── localStorage helpers ───────────────────────────────────────────────────────
const LS_KEY = 'traffic_app_settings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lsLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return fallback;
    const all = JSON.parse(raw);
    return key in all ? all[key] : fallback;
  } catch { return fallback; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lsSave(key: string, value: any) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[key] = value;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// ── Default values ─────────────────────────────────────────────────────────────
const DEFAULT_PROFILE = {
  firstName: 'Sutha', lastName: '', email: 'sutha@traffical.com',
  organization: 'Traffic Control Department', avatar: '', verified: true,
};
const DEFAULT_NOTIFICATIONS = { email: true, push: true, sms: false, criticalAlerts: true, dailyReports: true };
const DEFAULT_SYSTEM = { autoOptimize: true, dataRetention: '90', updateFrequency: '5', aiModel: 'advanced' };
const DEFAULT_REGIONAL = { timezone: 'IST', dateFormat: 'DD/MM/YYYY', timeFormat: '24-hour', defaultState: 'Tirunelveli Bypass' };
const DEFAULT_DATA = { autoExport: true, exportHour: '05', exportMinute: '00', exportPeriod: 'PM', dataRetention: true, retentionDays: 90 };

interface SettingsProps {
  onNameChange?: (name: string) => void;
}

export function Settings({ onNameChange }: SettingsProps) {
  // Load from localStorage on mount
  const [profile, setProfile] = useState(() => lsLoad('profile', DEFAULT_PROFILE));
  const [notifications, setNotifications] = useState(() => lsLoad('notifications', DEFAULT_NOTIFICATIONS));
  const [systemSettings, setSystemSettings] = useState(() => lsLoad('system', DEFAULT_SYSTEM));
  const [regionalSettings, setRegionalSettings] = useState(() => lsLoad('regional', DEFAULT_REGIONAL));
  const [dataManagement, setDataManagement] = useState(() => lsLoad('data', DEFAULT_DATA));
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => lsLoad('2fa', false));
  const [showQRCode, setShowQRCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Sync name to header on first load
  useEffect(() => {
    const saved = lsLoad('profile', DEFAULT_PROFILE);
    if (saved.firstName) onNameChange?.(saved.firstName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    // Persist every section to localStorage
    lsSave('profile', profile);
    lsSave('notifications', notifications);
    lsSave('system', systemSettings);
    lsSave('regional', regionalSettings);
    lsSave('data', dataManagement);
    lsSave('2fa', twoFactorEnabled);

    // Sync with Backend for Email Scheduling
    try {
      await fetch('http://localhost:8000/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          autoExport: dataManagement.autoExport,
          exportHour: dataManagement.exportHour,
          exportMinute: dataManagement.exportMinute,
          exportPeriod: dataManagement.exportPeriod
        })
      });
    } catch (err) {
      console.error('Failed to sync email settings with backend', err);
    }

    // Push name up to App so Header updates immediately
    onNameChange?.(profile.firstName || 'User');

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownloadStateReport = () => {
    if (!regionalSettings.timezone || !regionalSettings.dateFormat || !regionalSettings.timeFormat || !regionalSettings.defaultState) {
      alert('Please fill all Regional Settings fields before downloading the report.');
      return;
    }
    const stateData = indianStatesTrafficData.find(s => s.state === regionalSettings.defaultState);
    if (!stateData) return;
    const csvContent = [
      ['State Traffic Report'],
      ['Generated:', new Date().toLocaleString('en-IN')],
      [''],
      ['State', stateData.state],
      ['City', stateData.city],
      ['Active Intersections', stateData.activeIntersections.toString()],
      ['Average Congestion', stateData.avgCongestion + '%'],
      ['Total Vehicles', stateData.totalVehicles.toString()],
      ['Peak Hours', stateData.peakHours.join(', ')],
      [''],
      ['Recommendations:'],
      ['1. Optimize signal timing during peak hours'],
      ['2. Add additional monitoring cameras'],
      ['3. Implement AI-based congestion prediction'],
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${regionalSettings.defaultState}-traffic-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleExportAllData = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
    alert(`Export data email sent to ${profile.email}! Check your inbox.`);
  };

  const handleEnable2FA = () => { setTwoFactorEnabled(true); setShowQRCode(true); };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfile({ ...profile, avatar: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Save Success Toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span>Settings saved successfully!</span>
        </div>
      )}
      {emailSent && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <Mail className="w-5 h-5" />
          <span>Email sent to {profile.email}!</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure and manage your AI traffic monitoring system</p>
        </div>
        <Button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600 text-white">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800 mb-6 flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* ── Profile ── */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Profile Settings
              </CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                  {profile.avatar
                    ? <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    : <User className="w-10 h-10 text-slate-400" />}
                </div>
                <div>
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      <Upload className="w-4 h-4" /> Upload Photo
                    </div>
                  </Label>
                  <input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <p className="text-xs text-slate-500 mt-2">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="flex-1" />
                  {profile.verified && (
                    <Badge className="bg-emerald-500 text-white"><Check className="w-3 h-3 mr-1" /> Verified</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">This email will receive all alert notifications</p>
              </div>

              <div className="space-y-2">
                <Label>Organization</Label>
                <Input value={profile.organization} onChange={(e) => setProfile({ ...profile, organization: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── General ── */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-500" />Area Configuration</CardTitle>
              <CardDescription>Configure your specific monitoring zone and local preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={regionalSettings.timezone} onValueChange={(v) => setRegionalSettings({ ...regionalSettings, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IST">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="GMT">GMT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={regionalSettings.dateFormat} onValueChange={(v) => setRegionalSettings({ ...regionalSettings, dateFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select value={regionalSettings.timeFormat} onValueChange={(v) => setRegionalSettings({ ...regionalSettings, timeFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24-hour">24-hour</SelectItem>
                      <SelectItem value="12-hour">12-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Monitoring Zone</Label>
                <Select value={regionalSettings.defaultState} onValueChange={(v) => setRegionalSettings({ ...regionalSettings, defaultState: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {indianStatesTrafficData.map((s) => (
                      <SelectItem key={s.state} value={s.state}>{s.state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" className="w-full justify-start gap-3" onClick={handleDownloadStateReport}>
                  <Download className="w-4 h-4" />
                  Download {regionalSettings.defaultState} Zone Traffic Report
                </Button>
                <p className="text-xs text-slate-500 mt-2">All fields must be filled to download</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Moon className="w-5 h-5 text-blue-500" />Display Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-slate-900 dark:text-white">Dark Mode</p><p className="text-sm text-slate-500 dark:text-slate-400">Enable dark theme</p></div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-slate-900 dark:text-white">Compact View</p><p className="text-sm text-slate-500 dark:text-slate-400">Show more information in less space</p></div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-yellow-500" />Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'email',         icon: Mail,        label: 'Email Notifications',  desc: 'Receive updates via email' },
                { key: 'push',          icon: Smartphone,  label: 'Push Notifications',   desc: 'Receive push notifications on your device' },
                { key: 'criticalAlerts',icon: Bell,        label: 'Critical Alerts',      desc: 'Get notified for critical traffic incidents' },
                { key: 'dailyReports',  icon: RefreshCw,   label: 'Daily Reports',        desc: 'Receive daily traffic summary reports' },
              ].map(({ key, icon: Icon, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-slate-500" />
                    <div><p className="font-medium text-slate-900 dark:text-white">{label}</p><p className="text-sm text-slate-500">{desc}</p></div>
                  </div>
                  <Switch
                    checked={notifications[key as keyof typeof notifications] as boolean}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-blue-500" />Email Report Settings</CardTitle>
              <CardDescription>Configure automatic email reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  Daily traffic reports will be sent to {profile.email} at {dataManagement.exportHour}:{dataManagement.exportMinute} {dataManagement.exportPeriod}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Data Management ── */}
        <TabsContent value="data" className="space-y-6">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-blue-500" />Data Management</CardTitle>
              <CardDescription>Manage data export and retention settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div><p className="font-medium text-slate-900 dark:text-white">Auto-Export Data</p><p className="text-sm text-slate-500">Automatically export data daily</p></div>
                <Switch checked={dataManagement.autoExport} onCheckedChange={(checked) => setDataManagement({ ...dataManagement, autoExport: checked })} />
              </div>

              {dataManagement.autoExport && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-slate-900 dark:text-white">Daily Export Schedule</p><p className="text-sm text-slate-500">Data will be sent to {profile.email}</p></div>
                    <Badge className="bg-emerald-500 text-white">Active</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label>Export Time</Label>
                    <div className="flex items-center gap-2">
                      <Input type="text" value={dataManagement.exportHour}
                        onChange={(e) => setDataManagement({ ...dataManagement, exportHour: e.target.value })}
                        className="w-16 text-center" placeholder="HH" maxLength={2} />
                      <span className="text-xl">:</span>
                      <Input type="text" value={dataManagement.exportMinute}
                        onChange={(e) => setDataManagement({ ...dataManagement, exportMinute: e.target.value })}
                        className="w-16 text-center" placeholder="MM" maxLength={2} />
                      <Select value={dataManagement.exportPeriod} onValueChange={(v) => setDataManagement({ ...dataManagement, exportPeriod: v })}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">
                      Daily traffic reports will be sent to {profile.email} at {dataManagement.exportHour}:{dataManagement.exportMinute} {dataManagement.exportPeriod}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div><p className="font-medium text-slate-900 dark:text-white">Data Retention</p><p className="text-sm text-slate-500">Keep data for {dataManagement.retentionDays} days</p></div>
                <Switch checked={dataManagement.dataRetention} onCheckedChange={(checked) => setDataManagement({ ...dataManagement, dataRetention: checked })} />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3" onClick={handleExportAllData}>
                  <FileText className="w-4 h-4" /> Export All Data
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> Clear All Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── System ── */}
        <TabsContent value="system" className="space-y-6">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-blue-500" />System Configuration</CardTitle>
              <CardDescription>Configure system behavior and performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-slate-900 dark:text-white">Auto Optimization</p><p className="text-sm text-slate-500">Automatically optimize traffic signals</p></div>
                <Switch checked={systemSettings.autoOptimize} onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, autoOptimize: checked })} />
              </div>
              <div className="space-y-2">
                <Label>Data Retention (days)</Label>
                <Select value={systemSettings.dataRetention} onValueChange={(v) => setSystemSettings({ ...systemSettings, dataRetention: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Update Frequency (seconds)</Label>
                <Select value={systemSettings.updateFrequency} onValueChange={(v) => setSystemSettings({ ...systemSettings, updateFrequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 second</SelectItem>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500">Note: Simulation and AI optimization parameters are managed by the FastAPI backend service.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-red-500" />Security Settings</CardTitle>
              <CardDescription>Manage access control and security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Current Password</Label><Input type="password" placeholder="Enter current password" /></div>
              <div className="space-y-2"><Label>New Password</Label><Input type="password" placeholder="Enter new password" /></div>
              <div className="space-y-2"><Label>Confirm New Password</Label><Input type="password" placeholder="Confirm new password" /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 2FA QR Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>Scan this QR code with your authenticator app to enable 2FA.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-32 h-32 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mt-4">Scan with Google Authenticator or similar app</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowQRCode(false)}><X className="w-4 h-4 mr-2" />Cancel</Button>
            <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowQRCode(false)}><Check className="w-4 h-4 mr-2" />Verify & Enable</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
