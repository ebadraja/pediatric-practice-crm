'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Settings,
  Mic,
  MessageSquare,
  Calendar,
  BookOpen,
  Puzzle,
  Bell,
  Lock,
  CreditCard,
  User,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Eye,
  Download,
  ToggleRight,
} from 'lucide-react';

interface SettingsState {
  practiceInfo: {
    practiceName: string;
    tagline: string;
    phone: string;
    email: string;
    address: string;
    website: string;
  };
  aiAgent: {
    active: boolean;
    agentName: string;
    voice: string;
    greeting: string;
    toneSlider: number;
    speedSlider: number;
    empathySlider: number;
    emergencyPhone: string;
  };
  chatbot: {
    active: boolean;
    welcomeMessage: string;
    position: string;
    theme: string;
    autoTriggerSeconds: number;
  };
  notifications: {
    emailNewBooking: boolean;
    emailCancellation: boolean;
    emailEscalation: boolean;
    emailNewPatient: boolean;
    emailDailySummary: boolean;
    emailWeeklyAnalytics: boolean;
  };
  security: {
    twoFactorRequired: boolean;
    sessionTimeout: number;
  };
}

const INTEGRATION_DATA = [
  { name: 'Twilio', service: 'Voice & SMS', status: 'connected', lastSync: '5 min ago' },
  { name: 'OpenAI', service: 'AI Model', status: 'connected', lastSync: '1 hour ago' },
  { name: 'Deepgram', service: 'Speech-to-Text', status: 'connected', lastSync: '2 hours ago' },
  { name: 'Webflow', service: 'Website', status: 'connected', lastSync: '3 hours ago' },
  { name: 'Jotform', service: 'HIPAA Forms', status: 'connected', lastSync: '1 day ago' },
  { name: 'Google Calendar', service: 'Scheduling', status: 'disconnected' },
  { name: 'Stripe', service: 'Payments', status: 'disconnected' },
];

const APPOINTMENT_TYPES_DATA = [
  { id: 1, name: 'Well-Child Visit', duration: 30, color: '#10b981', providers: ['Dr. Tamas', 'Dr. Richards'], buffer: 10 },
  { id: 2, name: 'Sick Visit', duration: 20, color: '#ef4444', providers: ['Dr. Tamas', 'Dr. Richards'], buffer: 5 },
  { id: 3, name: 'Vaccination', duration: 15, color: '#8b5cf6', providers: ['Dr. Tamas', 'Dr. Richards', 'Sarah Mitchell'], buffer: 5 },
  { id: 4, name: 'Follow-up', duration: 15, color: '#3b82f6', providers: ['Dr. Tamas', 'Dr. Richards'], buffer: 5 },
];

const selectCls = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";
const textareaCls = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";
const labelCls = "block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2";

export default function SettingsPage() {
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('practice');
  const [settings, setSettings] = useState<SettingsState>({
    practiceInfo: {
      practiceName: 'Kids 0-18 Integrated Pediatrics',
      tagline: 'Compassionate care from birth through age 18',
      phone: '(555) 123-4567',
      email: 'info@kids018.com',
      address: '123 Medical Plaza Drive, Suite 100',
      website: 'https://kids-0-to-18-integrative-pediatrics.webflow.io',
    },
    aiAgent: {
      active: true,
      agentName: 'Jenny',
      voice: 'rachel',
      greeting: 'Hi! This is Jenny from Kids 0-18 Pediatrics. How can I help you schedule an appointment today?',
      toneSlider: 60,
      speedSlider: 50,
      empathySlider: 70,
      emergencyPhone: '(555) 999-0911',
    },
    chatbot: {
      active: true,
      welcomeMessage: 'Hi there! 👋 How can we help you today?',
      position: 'bottom-right',
      theme: '#3b82f6',
      autoTriggerSeconds: 30,
    },
    notifications: {
      emailNewBooking: true,
      emailCancellation: true,
      emailEscalation: true,
      emailNewPatient: true,
      emailDailySummary: false,
      emailWeeklyAnalytics: true,
    },
    security: {
      twoFactorRequired: true,
      sessionTimeout: 30,
    },
  });

  const handleSettingChange = (section: keyof SettingsState, field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setHasChanges(false);
    alert('Settings saved successfully!');
  };

  const NAV_TABS = [
    { id: 'practice', label: 'Practice Information', icon: Settings },
    { id: 'ai', label: 'AI Voice Agent', icon: Mic },
    { id: 'chatbot', label: 'Website Chatbot', icon: MessageSquare },
    { id: 'appointments', label: 'Appointment Types', icon: Calendar },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'integrations', label: 'Integrations', icon: Puzzle },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security & Compliance', icon: Lock },
    { id: 'billing', label: 'Billing & Subscription', icon: CreditCard },
    { id: 'account', label: 'Account & Profile', icon: User },
  ];

  return (
    <div className="pt-4 pb-8 space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Configure your CRM, integrations, and AI behavior</p>
        </div>
        {hasChanges && (
          <Button className="bg-blue-600 hover:bg-blue-700 self-start sm:self-auto" onClick={handleSave}>
            Save Changes
          </Button>
        )}
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-1">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">

          {/* ── Practice Information ── */}
          {activeTab === 'practice' && (
            <div className="space-y-6">
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Practice Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Practice Name', field: 'practiceName' as const },
                    { label: 'Tagline', field: 'tagline' as const },
                    { label: 'Address', field: 'address' as const },
                    { label: 'Website', field: 'website' as const },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label className={labelCls}>{label}</label>
                      <Input
                        className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                        value={settings.practiceInfo[field]}
                        onChange={(e) => handleSettingChange('practiceInfo', field, e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Phone</label>
                      <Input className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" value={settings.practiceInfo.phone} onChange={(e) => handleSettingChange('practiceInfo', 'phone', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <Input className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" type="email" value={settings.practiceInfo.email} onChange={(e) => handleSettingChange('practiceInfo', 'email', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Business Hours</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{day}</span>
                      <div className="flex items-center gap-2">
                        <Input type="time" defaultValue={day === 'Sunday' ? '' : '08:00'} className="w-24 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" disabled={day === 'Sunday'} />
                        <span className="text-slate-500 dark:text-slate-400">–</span>
                        <Input type="time" defaultValue={day === 'Sunday' ? '' : '17:00'} className="w-24 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" disabled={day === 'Sunday'} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Lunch Break</p>
                    <div className="flex items-center gap-2">
                      <Input type="time" defaultValue="12:30" className="w-24 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" />
                      <span className="text-slate-500 dark:text-slate-400">–</span>
                      <Input type="time" defaultValue="13:00" className="w-24 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Providers</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {['Dr. Jonathan Tamas', 'Dr. Peaches Richards'].map((provider) => (
                    <div key={provider} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/40">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-sm">
                          {provider.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{provider}</span>
                      </div>
                      <Button variant="outline" size="sm" className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">Edit</Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full gap-2 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Plus className="w-4 h-4" />Add Provider
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── AI Voice Agent ── */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="dark:text-slate-50">Voice Agent Status</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${settings.aiAgent.active ? 'bg-green-500' : 'bg-slate-400'}`} />
                      <span className={`text-sm font-medium ${settings.aiAgent.active ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {settings.aiAgent.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className={labelCls}>Agent Name</label>
                    <Input className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" value={settings.aiAgent.agentName} onChange={(e) => handleSettingChange('aiAgent', 'agentName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Voice</label>
                    <select value={settings.aiAgent.voice} onChange={(e) => handleSettingChange('aiAgent', 'voice', e.target.value)} className={selectCls}>
                      <option value="rachel">Rachel - Warm Female</option>
                      <option value="sarah">Sarah - Professional</option>
                      <option value="bella">Bella - Friendly</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Greeting Message</label>
                    <textarea value={settings.aiAgent.greeting} onChange={(e) => handleSettingChange('aiAgent', 'greeting', e.target.value)} className={textareaCls} rows={4} />
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Personality Settings</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: 'toneSlider', label: 'Tone', left: 'Formal', right: 'Casual', display: (v: number) => v < 40 ? 'Formal' : v > 60 ? 'Casual' : 'Balanced' },
                    { key: 'speedSlider', label: 'Speed', left: 'Slow', right: 'Fast', display: (v: number) => v < 40 ? 'Slow' : v > 60 ? 'Fast' : 'Normal' },
                    { key: 'empathySlider', label: 'Empathy', left: 'Direct', right: 'Empathetic', display: (v: number) => v < 40 ? 'Direct' : v > 60 ? 'Empathetic' : 'Balanced' },
                  ].map((slider) => (
                    <div key={slider.key}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">{slider.label}</label>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {slider.display(settings.aiAgent[slider.key as keyof typeof settings.aiAgent] as number)}
                        </span>
                      </div>
                      <input type="range" min="0" max="100" value={settings.aiAgent[slider.key as keyof typeof settings.aiAgent] as number} onChange={(e) => handleSettingChange('aiAgent', slider.key, parseInt(e.target.value))} className="w-full accent-blue-600" />
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{slider.left}</span><span>{slider.right}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Call Routing & Escalation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className={labelCls}>Emergency Phone Number</label>
                    <Input className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" value={settings.aiAgent.emergencyPhone} onChange={(e) => handleSettingChange('aiAgent', 'emergencyPhone', e.target.value)} />
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-3">Escalation Triggers</p>
                    <div className="space-y-3">
                      {['Customer mentions emergency keywords','Customer requests human/manager','Customer sounds upset (sentiment analysis)','3 failed clarification attempts','Insurance/billing disputes'].map((trigger, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked className="rounded accent-blue-600" />
                          <label className="text-sm text-slate-700 dark:text-slate-300">{trigger}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
                <Mic className="w-4 h-4" />Test Call
              </Button>
            </div>
          )}

          {/* ── Website Chatbot ── */}
          {activeTab === 'chatbot' && (
            <div className="space-y-6">
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="dark:text-slate-50">Chatbot Status</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${settings.chatbot.active ? 'bg-green-500' : 'bg-slate-400'}`} />
                      <span className={`text-sm font-medium ${settings.chatbot.active ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {settings.chatbot.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className={labelCls}>Welcome Message</label>
                    <textarea value={settings.chatbot.welcomeMessage} onChange={(e) => handleSettingChange('chatbot', 'welcomeMessage', e.target.value)} className={textareaCls} rows={3} />
                  </div>
                  <div>
                    <label className={labelCls}>Widget Position</label>
                    <select value={settings.chatbot.position} onChange={(e) => handleSettingChange('chatbot', 'position', e.target.value)} className={selectCls}>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Color Theme</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={settings.chatbot.theme} onChange={(e) => handleSettingChange('chatbot', 'theme', e.target.value)} className="w-12 h-10 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">{settings.chatbot.theme}</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Auto-trigger after (seconds)</label>
                    <Input type="number" min="10" max="120" className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" value={settings.chatbot.autoTriggerSeconds} onChange={(e) => handleSettingChange('chatbot', 'autoTriggerSeconds', parseInt(e.target.value))} />
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Quick Reply Buttons</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {['Book Appointment', 'Ask a Question', 'Office Hours', 'Insurance Info'].map((btn, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/40">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{btn}</span>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full gap-2 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Plus className="w-4 h-4" />Add Button
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Appointment Types ── */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />Add New Type
              </Button>
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardContent className="pt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                        {['Name','Duration','Providers','Buffer','Actions'].map((h, i) => (
                          <th key={h} className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {APPOINTMENT_TYPES_DATA.map((type) => (
                        <tr key={type.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} />
                              <span className="font-medium text-slate-900 dark:text-slate-100">{type.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{type.duration} min</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-xs">{type.providers.join(', ')}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{type.buffer} min</td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm" className="dark:text-slate-400 dark:hover:text-slate-200"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Knowledge Base ── */}
          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div className="flex gap-2 items-center">
                <Button variant="outline" className="gap-2 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Download className="w-4 h-4" />Sync with Website
                </Button>
                <p className="text-sm text-slate-600 dark:text-slate-400">Last synced: 2 hours ago</p>
              </div>
              {['Services & Pricing','Insurance Accepted','FAQs','Provider Bios','Office Policies'].map((section) => (
                <Card key={section} className="dark:bg-slate-900 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="dark:text-slate-50">{section}</CardTitle>
                    <Button variant="outline" size="sm" className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">Edit</Button>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      Content for {section} goes here
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ── Integrations ── */}
          {activeTab === 'integrations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INTEGRATION_DATA.map((integration) => (
                <div key={integration.name} className={`bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm ${integration.status === 'connected' ? 'border-green-200 dark:border-green-800/60' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{integration.name}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{integration.service}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                      integration.status === 'connected'
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                    }`}>
                      {integration.status === 'connected' && <CheckCircle className="w-3 h-3" />}
                      {integration.status === 'connected' ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  {integration.lastSync && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Last sync: {integration.lastSync}</p>
                  )}
                  <div className="flex gap-2">
                    {integration.status === 'connected' ? (
                      <>
                        <Button variant="outline" size="sm" className="flex-1 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Configure</Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 dark:text-red-400 dark:border-slate-600 dark:hover:bg-slate-800">Disconnect</Button>
                      </>
                    ) : (
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">Connect</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Email Notifications</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'emailNewBooking', label: 'New appointment booked' },
                    { key: 'emailCancellation', label: 'Appointment cancelled' },
                    { key: 'emailEscalation', label: 'Call escalated to staff' },
                    { key: 'emailNewPatient', label: 'New patient registered' },
                    { key: 'emailDailySummary', label: 'Daily summary report' },
                    { key: 'emailWeeklyAnalytics', label: 'Weekly analytics report' },
                  ].map((notif: any) => (
                    <div key={notif.key} className="flex items-center gap-3">
                      <input type="checkbox" checked={settings.notifications[notif.key as keyof typeof settings.notifications]} onChange={(e) => handleSettingChange('notifications', notif.key, e.target.checked)} className="rounded accent-blue-600" />
                      <label className="text-sm text-slate-700 dark:text-slate-300">{notif.label}</label>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Do Not Disturb</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded accent-blue-600" />
                    <label className="text-sm text-slate-700 dark:text-slate-300">Enable do not disturb hours</label>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">From</label>
                      <Input type="time" defaultValue="18:00" className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" disabled />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">To</label>
                      <Input type="time" defaultValue="08:00" className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="dark:text-slate-50">HIPAA Compliance Status</CardTitle>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />All Compliant
                    </span>
                  </div>
                </CardHeader>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Security Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Two-Factor Authentication</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Required for all admins</p>
                    </div>
                    <input type="checkbox" checked={settings.security.twoFactorRequired} onChange={(e) => handleSettingChange('security', 'twoFactorRequired', e.target.checked)} className="rounded accent-blue-600" />
                  </div>
                  <div>
                    <label className={labelCls}>Session Timeout (minutes)</label>
                    <select value={settings.security.sessionTimeout} onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))} className={selectCls}>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Data Encryption</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Data in transit', status: 'TLS 1.3' },
                    { label: 'Data at rest', status: 'AES-256' },
                    { label: 'Database encryption', status: 'Enabled' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />{item.status}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Audit Logs</CardTitle></CardHeader>
                <CardContent>
                  <Button variant="outline" className="gap-2 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Download className="w-4 h-4" />Export Audit Logs
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Billing ── */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Current Plan</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">Professional – $299/month</div>
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Usage This Month</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Voice calls', used: 687, total: 1000 },
                    { label: 'AI tokens used', used: 2400000, total: 5000000 },
                    { label: 'Storage', used: 12, total: 50, unit: 'GB' },
                  ].map((usage, idx) => {
                    const pct = (usage.used / usage.total) * 100;
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{usage.label}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{usage.used.toLocaleString()} / {usage.total.toLocaleString()} {usage.unit}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div className={`h-2 rounded-full ${pct > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Billing History</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">No recent invoices</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Account ── */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className={labelCls}>Avatar</label>
                    <div className="w-20 h-20 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl font-semibold mb-2">JT</div>
                    <Button variant="outline" size="sm" className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">Change Avatar</Button>
                  </div>
                  {[
                    { label: 'Name', type: 'text', value: 'Jonathan Tamas' },
                    { label: 'Email', type: 'email', value: 'jonathan.tamas@kids018.com' },
                    { label: 'Phone', type: 'tel', value: '(555) 123-4567' },
                    { label: 'Job Title', type: 'text', value: 'Physician / Administrator' },
                  ].map(({ label, type, value }) => (
                    <div key={label}>
                      <label className={labelCls}>{label}</label>
                      <Input type={type} defaultValue={value} className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Change Password</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {['Current Password','New Password','Confirm Password'].map((label) => (
                    <div key={label}>
                      <label className={labelCls}>{label}</label>
                      <Input type="password" className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" />
                    </div>
                  ))}
                  <Button className="bg-blue-600 hover:bg-blue-700">Update Password</Button>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader><CardTitle className="dark:text-slate-50">Preferences</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Theme', options: ['Light','Dark','System'] },
                    { label: 'Time Zone', options: ['Eastern (ET)','Central (CT)','Mountain (MT)','Pacific (PT)'] },
                    { label: 'Date Format', options: ['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD'] },
                  ].map(({ label, options }) => (
                    <div key={label}>
                      <label className={labelCls}>{label}</label>
                      <select className={selectCls}>
                        {options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
