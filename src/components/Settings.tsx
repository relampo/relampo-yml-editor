import { User, Bell, Shield, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function Settings() {
  const { t } = useLanguage();
  
  const settingsSections = [
    {
      title: 'Profile',
      icon: User,
      items: [
        { label: 'Name', value: 'Sarah Chen' },
        { label: 'Email', value: 'sarah@company.com' },
        { label: 'Role', value: 'Senior Performance Engineer' },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        { label: 'Test completion alerts', value: 'Enabled' },
        { label: 'Performance degradation warnings', value: 'Enabled' },
        { label: 'Weekly summary reports', value: 'Disabled' },
      ],
    },
    {
      title: 'Security',
      icon: Shield,
      items: [
        { label: 'Two-factor authentication', value: 'Enabled' },
        { label: 'API access tokens', value: '3 active' },
        { label: 'Session timeout', value: '30 minutes' },
      ],
    },
    {
      title: 'Performance',
      icon: Zap,
      items: [
        { label: 'Default test duration', value: '10 minutes' },
        { label: 'Max concurrent users', value: '1000' },
        { label: 'Default ramp-up time', value: '5 minutes' },
      ],
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-zinc-100">{t('settings.title')}</h1>
          <p className="text-zinc-400 mt-1">{t('settings.subtitle')}</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="bg-[#111111] border border-white/5 rounded-lg overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-zinc-100">{section.title}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {section.items.map((item, index) => (
                    <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <span className="text-sm text-zinc-300">{item.label}</span>
                      <span className="text-sm text-zinc-100">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}