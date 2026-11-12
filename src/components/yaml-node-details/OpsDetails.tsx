import { AlertTriangle, Clock3, Cookie, Cpu, Hand, Plus, ServerCrash, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../ui/input';
import { SelectField } from './SharedFields';
import { createNodeDataUpdater } from './nodeDetailHelpers';
import type { NodeDetailProps } from './types';

function SeedCookiesEditor({
  cookies,
  disabled,
  nodeId,
  onChange,
}: {
  cookies: any[];
  disabled: boolean;
  nodeId: string;
  onChange: (cookies: any[]) => void;
}) {
  const { t } = useLanguage();
  // Seed cookies have no id in the YAML, so we hold stable synthetic React keys
  // in state, kept in lockstep with add/remove below. Reset when the node changes;
  // fall back to length-syncing (append/trim) if the array changes some other way.
  const [rowKeys, setRowKeys] = useState<string[]>(() => cookies.map(() => crypto.randomUUID()));
  const [rowKeysNodeId, setRowKeysNodeId] = useState(() => nodeId);
  if (rowKeysNodeId !== nodeId) {
    setRowKeysNodeId(nodeId);
    setRowKeys(cookies.map(() => crypto.randomUUID()));
  } else if (rowKeys.length !== cookies.length) {
    setRowKeys(prev =>
      prev.length < cookies.length
        ? [...prev, ...Array.from({ length: cookies.length - prev.length }, () => crypto.randomUUID())]
        : prev.slice(0, cookies.length),
    );
  }

  const invalidSeedRows = cookies.reduce((invalidIndexes: number[], cookie: any, index: number) => {
    if (!String(cookie?.name || '').trim() || !String(cookie?.domain || '').trim()) {
      invalidIndexes.push(index);
    }
    return invalidIndexes;
  }, [] as number[]);

  const updateSeedCookie = (index: number, field: string, value: string) => {
    const next = [...cookies];
    next[index] = { ...(next[index] || {}), [field]: value };
    onChange(next);
  };

  return (
    <div className={`rounded border border-white/10 bg-white/5 p-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {t('yamlEditor.nodeDetails.ops.seedCookies')}
        </span>
        <button
          type="button"
          onClick={() => {
            setRowKeys(keys => [...keys, crypto.randomUUID()]);
            onChange([...cookies, { name: '', value: '', domain: '', path: '/' }]);
          }}
          disabled={disabled}
          className="flex items-center gap-1 px-2 py-1 text-xs text-amber-500 hover:text-amber-400 border border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 hover:border-yellow-400/35 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
          {t('yamlEditor.common.add')}
        </button>
      </div>

      {cookies.length === 0 ? (
        <div className="text-xs text-zinc-500">{t('yamlEditor.nodeDetails.ops.noSeedCookies')}</div>
      ) : (
        <div className="space-y-2">
          {cookies.map((cookie: any, index: number) => (
            <div
              key={rowKeys[index]}
              className="grid grid-cols-12 gap-2"
            >
              <Input
                value={cookie?.name || ''}
                disabled={disabled}
                onChange={event => updateSeedCookie(index, 'name', event.target.value)}
                placeholder={t('yamlEditor.nodeDetails.ops.phName')}
                className="col-span-3 h-8.5 bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
              />
              <Input
                value={cookie?.value || ''}
                disabled={disabled}
                onChange={event => updateSeedCookie(index, 'value', event.target.value)}
                placeholder={t('yamlEditor.nodeDetails.ph.value')}
                className="col-span-3 h-8.5 bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
              />
              <Input
                value={cookie?.domain || ''}
                disabled={disabled}
                onChange={event => updateSeedCookie(index, 'domain', event.target.value)}
                placeholder={t('yamlEditor.nodeDetails.ops.phDomain')}
                className="col-span-3 h-8.5 bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
              />
              <Input
                value={cookie?.path || '/'}
                disabled={disabled}
                onChange={event => updateSeedCookie(index, 'path', event.target.value)}
                placeholder="/"
                className="col-span-2 h-8.5 bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  setRowKeys(keys => keys.filter((_, rowIndex) => rowIndex !== index));
                  onChange(cookies.filter((_: any, rowIndex: number) => rowIndex !== index));
                }}
                disabled={disabled}
                className="col-span-1 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                title={t('yamlEditor.nodeDetails.ops.removeCookie')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {invalidSeedRows.length > 0 && (
        <div className="mt-2 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-200">
          {t('yamlEditor.nodeDetails.ops.seedValidation').replace(
            '{rows}',
            invalidSeedRows.map((index: number) => index + 1).join(', '),
          )}
        </div>
      )}
    </div>
  );
}

export function CookiesDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { t } = useLanguage();
  const { data, updateData, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const mode = String(data.mode || 'auto').toLowerCase();
  const normalizedMode = mode === 'manual' ? 'manual' : 'auto';
  const policy = String(data.policy || 'standard').toLowerCase();
  const clearEachIteration =
    typeof data.clear_each_iteration === 'boolean'
      ? data.clear_each_iteration
      : data.persist_across_iterations === false;
  const persistAcrossIterations = !clearEachIteration;
  const seedCookies = Array.isArray(data.cookies) ? data.cookies : [];
  const isIgnorePolicy = policy === 'ignore_cookies';
  const effectiveClearEachIteration = clearEachIteration;
  const summaryLine =
    normalizedMode === 'auto'
      ? t('yamlEditor.nodeDetails.ops.summaryAuto')
      : t('yamlEditor.nodeDetails.ops.summaryManual')
          .replace(
            '{policy}',
            isIgnorePolicy ? t('yamlEditor.nodeDetails.ops.ignoreCookies') : t('yamlEditor.nodeDetails.ops.standard'),
          )
          .replace('{scope}', String(data.jar_scope || 'vu').toUpperCase())
          .replace(
            '{persist}',
            persistAcrossIterations ? t('yamlEditor.nodeDetails.ops.on') : t('yamlEditor.nodeDetails.ops.off'),
          );
  const activePillClass =
    'rounded-full border border-yellow-400/20 bg-yellow-400/5 text-yellow-400 shadow-sm transition-all duration-200 hover:bg-yellow-400/10 hover:border-yellow-400/35';
  const inactivePillClass =
    'rounded-full border border-transparent text-zinc-400 transition-all duration-200 hover:text-zinc-100 hover:bg-white/6';

  const handleChange = (field: string, value: any) => {
    if (field === 'persist_across_iterations' || field === 'clear_each_iteration') {
      const clear = field === 'clear_each_iteration' ? value : !value;
      updateData({ ...data, clear_each_iteration: clear, persist_across_iterations: !clear });
      return;
    }
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

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          {t('yamlEditor.nodeDetails.ops.mode')}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => handleModeChange('auto')}
            className={`px-3 py-1.5 text-sm font-medium ${normalizedMode === 'auto' ? activePillClass : inactivePillClass}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Cookie className="h-3.5 w-3.5" />
              <Cpu className="h-3.5 w-3.5" />
              <span>{t('yamlEditor.nodeDetails.ops.autoRecommended')}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('manual')}
            className={`px-3 py-1.5 text-sm font-medium ${normalizedMode === 'manual' ? activePillClass : inactivePillClass}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Cookie className="h-3.5 w-3.5" />
              <Hand className="h-3.5 w-3.5" />
              <span>{t('yamlEditor.nodeDetails.ops.manual')}</span>
            </span>
          </button>
        </div>
      </div>
      <div className="h-px bg-white/10" />

      {normalizedMode === 'auto' ? (
        <div className="rounded border border-yellow-400/20 bg-yellow-400/5 px-3 py-2 text-xs text-zinc-300">
          {t('yamlEditor.nodeDetails.ops.autoHelp')}
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              {t('yamlEditor.nodeDetails.ops.policy')}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => handlePolicyChange('standard')}
                className={`px-3 py-1.5 text-sm font-medium ${!isIgnorePolicy ? activePillClass : inactivePillClass}`}
              >
                {t('yamlEditor.nodeDetails.ops.standard')}
              </button>
              <button
                type="button"
                onClick={() => handlePolicyChange('ignore_cookies')}
                className={`px-3 py-1.5 text-sm font-medium ${isIgnorePolicy ? activePillClass : inactivePillClass}`}
              >
                {t('yamlEditor.nodeDetails.ops.ignoreCookies')}
              </button>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              {t('yamlEditor.nodeDetails.ops.quickPresets')}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
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
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/6 transition-colors duration-200"
              >
                {t('yamlEditor.nodeDetails.ops.presetDefault')}
              </button>
              <button
                type="button"
                onClick={() =>
                  updateData({
                    ...data,
                    mode: 'manual',
                    policy: 'ignore_cookies',
                  })
                }
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/6 transition-colors duration-200"
              >
                {t('yamlEditor.nodeDetails.ops.presetStateless')}
              </button>
              <button
                type="button"
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
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/6 transition-colors duration-200"
              >
                {t('yamlEditor.nodeDetails.ops.presetCleanIteration')}
              </button>
            </div>
          </div>

          {isIgnorePolicy && (
            <div className="rounded border border-yellow-400/20 bg-yellow-400/5 px-3 py-2 text-xs text-zinc-300">
              {t('yamlEditor.nodeDetails.ops.ignoreActive')}
            </div>
          )}

          <div className={`grid grid-cols-3 gap-4 ${isIgnorePolicy ? 'opacity-50' : ''}`}>
            <SelectField
              label={t('yamlEditor.nodeDetails.ops.persistAcross')}
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
              label={t('yamlEditor.nodeDetails.ops.clearEach')}
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
              label={t('yamlEditor.nodeDetails.ops.jarScope')}
              value={data.jar_scope || 'vu'}
              field="jar_scope"
              onChange={handleChange}
              options={[
                { label: 'vu', value: 'vu' },
                ...(data.jar_scope && data.jar_scope !== 'vu'
                  ? [{ label: String(data.jar_scope), value: String(data.jar_scope) }]
                  : []),
              ]}
              disabled={isIgnorePolicy}
              noMargin
            />
          </div>

          <SeedCookiesEditor
            cookies={seedCookies}
            disabled={isIgnorePolicy}
            nodeId={node.id}
            onChange={next => handleChange('cookies', next)}
          />
        </>
      )}

      <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">{summaryLine}</div>
    </div>
  );
}

export function CacheManagerDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { t } = useLanguage();
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const enabled = data.enabled !== false;
  const clearEachIteration = data.clear_each_iteration !== false;
  const maxElements = String(data.max_elements ?? (data.max_size_mb ? parseInt(String(data.max_size_mb), 10) : 1000));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          {t('yamlEditor.nodeDetails.ops.cache')}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <TogglePill
            active={enabled}
            label={t('yamlEditor.common.enabled')}
            onClick={() => updateField('enabled', true)}
            activeStyle={{
              backgroundColor: 'rgba(250, 204, 21, 0.10)',
              color: 'var(--studio-tone-yellow, #facc15)',
              borderColor: 'rgba(250, 204, 21, 0.35)',
              boxShadow: '0 10px 22px rgba(250, 204, 21, 0.15)',
            }}
          />
          <TogglePill
            active={!enabled}
            label={t('yamlEditor.common.disabled')}
            onClick={() => updateField('enabled', false)}
            activeStyle={{
              backgroundColor: 'rgba(250, 204, 21, 0.10)',
              color: 'var(--studio-tone-yellow, #facc15)',
              borderColor: 'rgba(250, 204, 21, 0.35)',
              boxShadow: '0 10px 22px rgba(250, 204, 21, 0.15)',
            }}
          />
        </div>
      </div>
      <div className="h-px bg-white/10" />

      <div className={!enabled ? 'opacity-60' : ''}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <SelectField
            label={t('yamlEditor.nodeDetails.ops.clearEach')}
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
            <label
              htmlFor="ops-max-elements"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              {t('yamlEditor.nodeDetails.ops.maxElements')}
            </label>
            <Input
              id="ops-max-elements"
              type="number"
              value={maxElements}
              disabled={!enabled}
              onChange={event => updateField('max_elements', Math.max(1, parseInt(event.target.value || '1', 10) || 1))}
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
          {t('yamlEditor.nodeDetails.ops.cacheSummary')
            .replace('{cache}', enabled ? t('yamlEditor.nodeDetails.ops.on') : t('yamlEditor.nodeDetails.ops.off'))
            .replace(
              '{clear}',
              clearEachIteration ? t('yamlEditor.nodeDetails.ops.on') : t('yamlEditor.nodeDetails.ops.off'),
            )
            .replace('{max}', maxElements)}
        </div>
      </div>
    </div>
  );
}

const errorPolicyRules = [
  { key: 'on_4xx', labelKey: 'rule_on_4xx', icon: AlertTriangle },
  { key: 'on_5xx', labelKey: 'rule_on_5xx', icon: ServerCrash },
  { key: 'on_timeout', labelKey: 'rule_on_timeout', icon: Clock3 },
  { key: 'on_connection_error', labelKey: 'rule_on_connection_error', icon: AlertTriangle },
  { key: 'on_error', labelKey: 'rule_on_error', icon: AlertTriangle },
] as const;

export function ErrorPolicyDetails({
  node,
  onNodeUpdate,
  nativeContext = false,
}: NodeDetailProps & { nativeContext?: boolean }) {
  const { t } = useLanguage();
  const { data, updateData } = createNodeDataUpdater(node, onNodeUpdate);
  const ruleLabel = (key: (typeof errorPolicyRules)[number]['key']) => t(`yamlEditor.nodeDetails.ops.rule_${key}`);
  const rules = nativeContext
    ? errorPolicyRules.filter(rule => ['on_error', 'on_timeout'].includes(rule.key))
    : errorPolicyRules;
  const activeRules = errorPolicyRules.filter(({ key }) => String(data[key] || '').trim()).map(({ key }) => key);
  const currentValueForRule = (rule: (typeof errorPolicyRules)[number]['key']) => {
    const value = String(data[rule] || 'continue');
    return !nativeContext && value === 'stop' ? 'stop_user' : value;
  };

  const toggleRule = (rule: (typeof errorPolicyRules)[number]['key']) => {
    const nextData = { ...data };
    delete nextData.active_rules;
    if (activeRules.includes(rule)) delete nextData[rule];
    else nextData[rule] = 'continue';
    updateData(nextData);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          {t('yamlEditor.nodeDetails.ops.rules')}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {rules.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={activeRules.includes(key)}
              onClick={() => toggleRule(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${activeRules.includes(key) ? 'border-yellow-400/50 text-yellow-300 bg-yellow-400/10' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span>{ruleLabel(key)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="h-px bg-white/10" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map(({ key }) => (
          <div
            key={key}
            className={activeRules.includes(key) ? '' : 'opacity-50'}
          >
            <SelectField
              label={t('yamlEditor.nodeDetails.ops.ruleAction').replace('{rule}', ruleLabel(key))}
              value={currentValueForRule(key)}
              field={key}
              onChange={(_, value) => updateData({ ...data, [key]: value })}
              options={
                nativeContext
                  ? [
                      { label: t('yamlEditor.nodeDetails.ops.actionContinue'), value: 'continue' },
                      { label: t('yamlEditor.nodeDetails.ops.actionNativeStop'), value: 'stop' },
                    ]
                  : [
                      { label: t('yamlEditor.nodeDetails.ops.actionContinue'), value: 'continue' },
                      { label: t('yamlEditor.nodeDetails.ops.actionNextIteration'), value: 'next_iteration' },
                      { label: t('yamlEditor.nodeDetails.ops.actionStopUser'), value: 'stop_user' },
                    ]
              }
              disabled={!activeRules.includes(key)}
              noMargin
            />
          </div>
        ))}
      </div>
      <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300 space-y-2">
        {nativeContext ? (
          <p>{t('yamlEditor.nodeDetails.ops.nativePolicyHelp')}</p>
        ) : (
          <>
            <p>{t('yamlEditor.nodeDetails.ops.policyHelp1')}</p>
            <p>{t('yamlEditor.nodeDetails.ops.policyHelp2')}</p>
          </>
        )}
        {data.enabled === false && <p>{t('yamlEditor.nodeDetails.ops.policyDisabled')}</p>}
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
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${active ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/6'}`}
      style={active ? activeStyle : undefined}
    >
      {label}
    </button>
  );
}
