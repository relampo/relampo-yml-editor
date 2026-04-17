import { AlertTriangle, Clock3, Cookie, Cpu, Hand, Plus, ServerCrash } from 'lucide-react';
import { Input } from '../ui/input';
import { SelectField } from './SharedFields';
import { createNodeDataUpdater } from './nodeDetailHelpers';
import type { NodeDetailProps } from './types';

export function CookiesDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateData, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const mode = String(data.mode || 'auto').toLowerCase();
  const normalizedMode = mode === 'manual' ? 'manual' : 'auto';
  const policy = String(data.policy || 'standard').toLowerCase();
  const persistAcrossIterations = data.persist_across_iterations !== false;
  const clearEachIteration = data.clear_each_iteration === true;
  const seedCookies = Array.isArray(data.cookies) ? data.cookies : [];
  const isIgnorePolicy = policy === 'ignore_cookies';
  const effectiveClearEachIteration = persistAcrossIterations ? false : clearEachIteration;
  const invalidSeedRows = seedCookies
    .map((cookie: any, index: number) => ({ cookie, index }))
    .filter(({ cookie }: { cookie: any }) => !String(cookie?.name || '').trim() || !String(cookie?.domain || '').trim())
    .map(({ index }: { index: number }) => index);
  const summaryLine =
    normalizedMode === 'auto'
      ? 'Auto + Standard + VU scope'
      : `Manual + ${isIgnorePolicy ? 'Ignore Cookies' : 'Standard'} + ${String(data.jar_scope || 'vu').toUpperCase()} scope + Persist ${persistAcrossIterations ? 'ON' : 'OFF'}`;
  const cookieSelectorStyle = {
    auto: {
      backgroundColor: 'rgba(236, 72, 153, 0.20)',
      color: '#f9a8d4',
      borderColor: 'rgba(249, 168, 212, 0.50)',
      boxShadow: '0 10px 22px rgba(236, 72, 153, 0.20)',
    },
    manual: {
      backgroundColor: 'rgba(168, 85, 247, 0.20)',
      color: '#d8b4fe',
      borderColor: 'rgba(216, 180, 254, 0.50)',
      boxShadow: '0 10px 22px rgba(168, 85, 247, 0.20)',
    },
    standard: {
      backgroundColor: 'rgba(59, 130, 246, 0.20)',
      color: '#93c5fd',
      borderColor: 'rgba(147, 197, 253, 0.50)',
      boxShadow: '0 10px 22px rgba(59, 130, 246, 0.20)',
    },
    ignore_cookies: {
      backgroundColor: 'rgba(239, 68, 68, 0.20)',
      color: '#fca5a5',
      borderColor: 'rgba(252, 165, 165, 0.50)',
      boxShadow: '0 10px 22px rgba(239, 68, 68, 0.20)',
    },
  } as const;

  const handleChange = (field: string, value: any) => {
    updateField(field, value);
  };

  const handleModeChange = (nextMode: 'auto' | 'manual') => {
    if (nextMode === 'auto') {
      updateData({
        ...data,
        mode: 'auto',
        policy: 'standard',
        jar_scope: 'vu',
      });
      return;
    }
    updateData({
      ...data,
      mode: 'manual',
      policy: policy || 'standard',
      jar_scope: data.jar_scope || 'vu',
      persist_across_iterations: data.persist_across_iterations ?? true,
      clear_each_iteration: data.clear_each_iteration ?? false,
      cookies: seedCookies,
    });
  };

  const handlePolicyChange = (nextPolicy: string) => {
    updateData({
      ...data,
      policy: nextPolicy === 'ignore_cookies' ? 'ignore_cookies' : 'standard',
    });
  };

  const updateSeedCookie = (index: number, field: string, value: string) => {
    const next = [...seedCookies];
    next[index] = { ...(next[index] || {}), [field]: value };
    handleChange('cookies', next);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Mode</label>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => handleModeChange('auto')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${normalizedMode === 'auto' ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
            style={normalizedMode === 'auto' ? cookieSelectorStyle.auto : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <Cookie className="h-3.5 w-3.5" />
              <Cpu className="h-3.5 w-3.5" />
              <span>Auto (Recommended)</span>
            </span>
          </button>
          <button
            onClick={() => handleModeChange('manual')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${normalizedMode === 'manual' ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
            style={normalizedMode === 'manual' ? cookieSelectorStyle.manual : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <Cookie className="h-3.5 w-3.5" />
              <Hand className="h-3.5 w-3.5" />
              <span>Manual</span>
            </span>
          </button>
        </div>
      </div>
      <div className="h-px bg-white/10" />

      {normalizedMode === 'auto' ? (
        <div className="rounded border border-blue-400/20 bg-blue-400/5 px-3 py-2 text-xs text-zinc-300">
          Auto applies the recommended cookie behavior automatically.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Policy</label>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => handlePolicyChange('standard')}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${!isIgnorePolicy ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
                style={!isIgnorePolicy ? cookieSelectorStyle.standard : undefined}
              >
                Standard
              </button>
              <button
                onClick={() => handlePolicyChange('ignore_cookies')}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${isIgnorePolicy ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
                style={isIgnorePolicy ? cookieSelectorStyle.ignore_cookies : undefined}
              >
                Ignore Cookies
              </button>
            </div>
          </div>

          <div className="mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Quick Presets
            </label>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() =>
                  updateData({
                    ...data,
                    mode: 'manual',
                    policy: 'standard',
                    jar_scope: 'vu',
                    persist_across_iterations: true,
                    clear_each_iteration: false,
                  })
                }
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/6 transition-all duration-200"
              >
                Default
              </button>
              <button
                onClick={() =>
                  updateData({
                    ...data,
                    mode: 'manual',
                    policy: 'ignore_cookies',
                  })
                }
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/6 transition-all duration-200"
              >
                Stateless
              </button>
              <button
                onClick={() =>
                  updateData({
                    ...data,
                    mode: 'manual',
                    policy: 'standard',
                    jar_scope: 'vu',
                    persist_across_iterations: false,
                    clear_each_iteration: true,
                  })
                }
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/6 transition-all duration-200"
              >
                Clean Iteration
              </button>
            </div>
          </div>

          {isIgnorePolicy && (
            <div className="rounded border border-blue-400/20 bg-blue-400/5 px-3 py-2 text-xs text-zinc-300">
              Ignore Cookies is active: persistence, jar scope and seed cookies are disabled.
            </div>
          )}

          <div className={`grid grid-cols-3 gap-4 ${isIgnorePolicy ? 'opacity-50' : ''}`}>
            <SelectField
              label="Persist Across Iterations"
              value={persistAcrossIterations ? 'true' : 'false'}
              field="persist_across_iterations"
              onChange={(_, value) => handleChange('persist_across_iterations', value === 'true')}
              options={[
                { label: 'true', value: 'true' },
                { label: 'false', value: 'false' },
              ]}
              disabled={isIgnorePolicy}
              noMargin
            />
            <SelectField
              label="Clear Each Iteration"
              value={effectiveClearEachIteration ? 'true' : 'false'}
              field="clear_each_iteration"
              onChange={(_, value) => handleChange('clear_each_iteration', value === 'true')}
              options={[
                { label: 'false', value: 'false' },
                { label: 'true', value: 'true' },
              ]}
              disabled={isIgnorePolicy}
              noMargin
            />
            <SelectField
              label="Jar Scope"
              value={data.jar_scope || 'vu'}
              field="jar_scope"
              onChange={handleChange}
              options={[
                { label: 'vu', value: 'vu' },
                { label: 'scenario', value: 'scenario' },
              ]}
              disabled={isIgnorePolicy}
              noMargin
            />
          </div>

          <div className={`rounded border border-white/10 bg-white/5 p-3 ${isIgnorePolicy ? 'opacity-50' : ''}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Seed Cookies</span>
              <button
                onClick={() =>
                  handleChange('cookies', [...seedCookies, { name: '', value: '', domain: '', path: '/' }])
                }
                disabled={isIgnorePolicy}
                className="flex items-center gap-1 rounded-full border border-current px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                style={
                  !isIgnorePolicy
                    ? {
                        backgroundColor: 'rgba(16, 185, 129, 0.22)',
                        color: '#6ee7b7',
                        borderColor: 'rgba(110, 231, 183, 0.55)',
                        boxShadow: '0 10px 22px rgba(16, 185, 129, 0.22)',
                      }
                    : undefined
                }
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {seedCookies.length === 0 ? (
              <div className="text-xs text-zinc-500">No seed cookies configured.</div>
            ) : (
              <div className="space-y-2">
                {seedCookies.map((cookie: any, index: number) => (
                  <div
                    key={`${index}-${cookie?.name || 'cookie'}`}
                    className="grid grid-cols-12 gap-2"
                  >
                    <Input
                      value={cookie?.name || ''}
                      disabled={isIgnorePolicy}
                      onChange={event => updateSeedCookie(index, 'name', event.target.value)}
                      placeholder="name"
                      className="col-span-3 h-8.5 bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
                    />
                    <Input
                      value={cookie?.value || ''}
                      disabled={isIgnorePolicy}
                      onChange={event => updateSeedCookie(index, 'value', event.target.value)}
                      placeholder="value"
                      className="col-span-3 h-8.5 bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
                    />
                    <Input
                      value={cookie?.domain || ''}
                      disabled={isIgnorePolicy}
                      onChange={event => updateSeedCookie(index, 'domain', event.target.value)}
                      placeholder="domain"
                      className="col-span-3 h-8.5 bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
                    />
                    <Input
                      value={cookie?.path || '/'}
                      disabled={isIgnorePolicy}
                      onChange={event => updateSeedCookie(index, 'path', event.target.value)}
                      placeholder="/"
                      className="col-span-2 h-8.5 bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
                    />
                    <button
                      onClick={() =>
                        handleChange(
                          'cookies',
                          seedCookies.filter((_: any, rowIndex: number) => rowIndex !== index),
                        )
                      }
                      disabled={isIgnorePolicy}
                      className="col-span-1 rounded border border-red-400/30 bg-red-400/10 text-xs font-medium text-red-300 transition-colors hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {invalidSeedRows.length > 0 && (
              <div className="mt-2 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-200">
                Seed cookie validation: rows {invalidSeedRows.map((index: number) => index + 1).join(', ')} require both
                name and domain.
              </div>
            )}
          </div>
        </>
      )}

      <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">{summaryLine}</div>
    </div>
  );
}

export function CacheManagerDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const enabled = data.enabled !== false;
  const clearEachIteration = data.clear_each_iteration !== false;
  const maxElements = String(data.max_elements ?? (data.max_size_mb ? parseInt(String(data.max_size_mb), 10) : 1000));

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Cache</label>
        <div className="flex flex-wrap items-center gap-1">
          <TogglePill
            active={enabled}
            label="Enabled"
            onClick={() => updateField('enabled', true)}
            activeStyle={{
              backgroundColor: 'rgba(16, 185, 129, 0.22)',
              color: '#6ee7b7',
              borderColor: 'rgba(110, 231, 183, 0.55)',
              boxShadow: '0 10px 22px rgba(16, 185, 129, 0.22)',
            }}
          />
          <TogglePill
            active={!enabled}
            label="Disabled"
            onClick={() => updateField('enabled', false)}
            activeStyle={{
              backgroundColor: 'rgba(244, 63, 94, 0.20)',
              color: '#fda4af',
              borderColor: 'rgba(253, 164, 175, 0.55)',
              boxShadow: '0 10px 22px rgba(244, 63, 94, 0.20)',
            }}
          />
        </div>
      </div>
      <div className="h-px bg-white/10" />

      <div className={!enabled ? 'opacity-60' : ''}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <SelectField
            label="Clear Each Iteration"
            value={clearEachIteration ? 'true' : 'false'}
            field="clear_each_iteration"
            options={[
              { label: 'true', value: 'true' },
              { label: 'false', value: 'false' },
            ]}
            disabled={!enabled}
            onChange={(_, value) => updateField('clear_each_iteration', value === 'true')}
            noMargin
          />
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Max Elements
            </label>
            <Input
              type="number"
              value={maxElements}
              disabled={!enabled}
              onChange={event => updateField('max_elements', Math.max(1, parseInt(event.target.value || '1', 10) || 1))}
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all"
            />
          </div>
        </div>

        <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
          {`Cache ${enabled ? 'ON' : 'OFF'} + ClearEachIteration ${clearEachIteration ? 'ON' : 'OFF'} + MaxElements ${maxElements}`}
        </div>
      </div>
    </div>
  );
}

export function ErrorPolicyDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateData } = createNodeDataUpdater(node, onNodeUpdate);
  const activeRules = Array.isArray(data.active_rules)
    ? data.active_rules.filter((rule: string) => ['on_4xx', 'on_5xx', 'on_timeout'].includes(rule))
    : [];
  const currentValueForRule = (rule: 'on_4xx' | 'on_5xx' | 'on_timeout') =>
    String(data[rule] || (rule === 'on_4xx' ? 'continue' : 'stop'));
  const tabStyle = {
    on_4xx: {
      backgroundColor: 'rgba(245, 158, 11, 0.20)',
      color: '#fcd34d',
      borderColor: 'rgba(252, 211, 77, 0.50)',
      boxShadow: '0 10px 22px rgba(245, 158, 11, 0.20)',
    },
    on_5xx: {
      backgroundColor: 'rgba(244, 63, 94, 0.20)',
      color: '#fda4af',
      borderColor: 'rgba(253, 164, 175, 0.55)',
      boxShadow: '0 10px 22px rgba(244, 63, 94, 0.20)',
    },
    on_timeout: {
      backgroundColor: 'rgba(56, 189, 248, 0.20)',
      color: '#7dd3fc',
      borderColor: 'rgba(125, 211, 252, 0.55)',
      boxShadow: '0 10px 22px rgba(56, 189, 248, 0.20)',
    },
  } as const;

  const toggleRule = (rule: 'on_4xx' | 'on_5xx' | 'on_timeout') => {
    updateData({
      ...data,
      active_rules: activeRules.includes(rule)
        ? activeRules.filter((activeRule: string) => activeRule !== rule)
        : [...activeRules, rule],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Rules</label>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => toggleRule('on_4xx')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${activeRules.includes('on_4xx') ? 'border-current text-white ring-1 ring-white/30' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
            style={activeRules.includes('on_4xx') ? tabStyle.on_4xx : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>On 4xx</span>
            </span>
          </button>
          <button
            onClick={() => toggleRule('on_5xx')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${activeRules.includes('on_5xx') ? 'border-current text-white ring-1 ring-white/30' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
            style={activeRules.includes('on_5xx') ? tabStyle.on_5xx : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <ServerCrash className="h-3.5 w-3.5" />
              <span>On 5xx</span>
            </span>
          </button>
          <button
            onClick={() => toggleRule('on_timeout')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${activeRules.includes('on_timeout') ? 'border-current text-white ring-1 ring-white/30' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
            style={activeRules.includes('on_timeout') ? tabStyle.on_timeout : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              <span>On Timeout</span>
            </span>
          </button>
        </div>
      </div>
      <div className="h-px bg-white/10" />

      <div className="grid grid-cols-3 gap-4">
        {(['on_4xx', 'on_5xx', 'on_timeout'] as const).map(rule => {
          const label = rule === 'on_4xx' ? 'On 4xx Action' : rule === 'on_5xx' ? 'On 5xx Action' : 'On Timeout Action';
          return (
            <div
              key={rule}
              className={activeRules.includes(rule) ? '' : 'opacity-50'}
            >
              <SelectField
                label={label}
                value={currentValueForRule(rule)}
                field={rule}
                onChange={(_, value) => updateData({ ...data, [rule]: value })}
                options={[
                  { label: 'continue', value: 'continue' },
                  { label: 'stop', value: 'stop' },
                ]}
                disabled={!activeRules.includes(rule)}
                noMargin
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TogglePill({
  active,
  label,
  onClick,
  activeStyle,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  activeStyle: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${active ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
      style={active ? activeStyle : undefined}
    >
      {label}
    </button>
  );
}
