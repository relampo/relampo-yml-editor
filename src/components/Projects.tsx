import { Plus, FolderKanban } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function Projects() {
  const { t } = useLanguage();
  
  const projects = [
    { 
      name: 'E-Commerce Load Test', 
      description: 'Performance testing for checkout flow',
      tests: 12,
      lastRun: '2 hours ago',
    },
    { 
      name: 'API Gateway Performance', 
      description: 'Stress testing API endpoints',
      tests: 8,
      lastRun: '5 hours ago',
    },
    { 
      name: 'Mobile Backend Stress Test', 
      description: 'Backend capacity validation',
      tests: 15,
      lastRun: '1 day ago',
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-zinc-100">{t('projects.title')}</h1>
            <p className="text-zinc-400 mt-1">{t('projects.subtitle')}</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition-all shadow-lg shadow-yellow-400/30 hover:shadow-yellow-400/50">
            <Plus className="w-4 h-4" />
            {t('projects.createNew')}
          </button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-3 gap-4">
          {projects.map((project, index) => (
            <div 
              key={index} 
              className="bg-[#111111] border border-white/5 rounded-lg p-6 hover:border-yellow-400/30 hover:shadow-2xl hover:shadow-yellow-400/10 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <FolderKanban className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <h3 className="text-zinc-100 mb-1">{project.name}</h3>
              <p className="text-sm text-zinc-400 mb-4">{project.description}</p>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{project.tests} tests</span>
                <span>Last run {project.lastRun}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}