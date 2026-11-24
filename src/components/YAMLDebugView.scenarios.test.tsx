import { selectOption } from '../test/selectOption';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLDebugSession } from './YAMLDebugView';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import { fingerprint } from '../utils/studioRunStore';
import type { EngineEvent } from '../utils/debugApi';
import { collectRequests } from './debugRequests';
import { refreshTreePaths, removeNodeFromTree } from './yaml-tree-view/treeOperations';

const render = (ui: Parameters<typeof rtlRender>[0], options?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(ui, { wrapper: LanguageProvider, ...options });

const api = vi.hoisted(() => ({
  start: vi.fn(async () => 'selected-run'),
  handlers: [] as Array<{ onEvent: (event: EngineEvent) => void; onDone: (error: string | null) => void }>,
  stop: vi.fn(),
}));
vi.mock('../utils/debugApi', async original => ({
  ...await original<typeof import('../utils/debugApi')>(),
  startDebugRun: api.start,
  streamDebugRun: vi.fn((_id, handlers) => { api.handlers.push(handlers); return api.stop; }),
}));
afterEach(() => {cleanup(); sessionStorage.clear(); vi.clearAllMocks(); api.handlers.length = 0;});

const yaml = `test: {name: full, scenario_mode: parallel}
variables: {global: context}
data_source: {type: csv, file: root.csv, variable_names: user}
scenarios:
 - name: first
   steps: [{request: {name: duplicate, method: GET, url: /first}}]
 - name: second
   data_source: {type: csv, file: own.csv, variable_names: user}
   steps: [{request: {name: duplicate, method: GET, url: /second}}]
`;
function show(enabled = true, flushPendingEdits?: () => string) {
 const onSelect = vi.fn();
 render(<YAMLDebugSession tree={parseYAMLToTree(yaml)} yamlCode={yaml} documentReady validationErrors={[]}
   multiScenarioDebugEnabled={enabled} flushPendingEdits={flushPendingEdits} onSelectNode={onSelect} onEditNode={vi.fn()} />);
 return onSelect;
}

describe('selected scenario Debug', () => {
 it('keeps single-script syntax errors on the existing backend error path', async () => {
  const single = 'test: {name: single}\nscenarios: [{name: only, steps: [{get: /one}]}]\n';
  render(<YAMLDebugSession tree={parseYAMLToTree(single)} yamlCode={single} documentReady validationErrors={[]}
    flushPendingEdits={() => 'broken: ['} onSelectNode={vi.fn()} onEditNode={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', {name:'Run Debug'}));
  await waitFor(() => expect(api.start).toHaveBeenCalledWith('broken: [', {vus:1}));
 });

 for (const vus of [1,2]) {
  it(`requires selection and posts the full script with ${vus} VUs`, async () => {
   show();
   expect(screen.getByRole('button',{name:'Run Debug'})).toBeDisabled();
   await selectOption('Debug scenario', 'second');
   if(vus===2) fireEvent.click(screen.getByRole('button',{name:'2 VUs'}));
   fireEvent.click(screen.getByRole('button',{name:'Run Debug'}));
   await waitFor(()=>expect(api.start).toHaveBeenCalledWith(yaml,{vus,scenarioName:'second'}));
   expect(JSON.parse(sessionStorage.getItem('relampo.studio.debugRun')!)).toEqual({id:'selected-run',fp:fingerprint(yaml),scenarioName:'second'});
   fireEvent.click(screen.getByRole('button',{name:'Stop'}));
   expect(api.stop).toHaveBeenCalled();
   expect(api.start).toHaveBeenCalledTimes(1);
  });
 }
 it('fails closed when the backend has no selected Debug capability',()=>{
  show(false);
  expect(screen.queryByRole('combobox',{name:'Debug scenario'})).not.toBeInTheDocument();
  expect(screen.getByText('This Relampo backend does not support scenario selection for Debug.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Run Debug'}));
  expect(api.start).not.toHaveBeenCalled();
 });
 it('rejects a selection removed by flushed edits before posting',async()=>{
  show(true,()=>yaml.replace('name: second','name: renamed'));
  await selectOption('Debug scenario', 'second');
  fireEvent.click(screen.getByRole('button',{name:'Run Debug'}));
  await screen.findByText('Select a scenario from the current script before Debug.');
  expect(api.start).not.toHaveBeenCalled();
 });

 it('matches legacy redirects by Tree ID after deleting a request in the selected scenario', async () => {
   const original = parseYAMLToTree(`test: {name: RLP-866, scenario_mode: sequential}
scenarios:
  - name: first
    steps: [{get: /first}]
  - name: second
    steps:
      - get: /removed
      - request: {method: POST, url: /login, request_id: 17}
      - request: {method: GET, url: /dashboard, request_id: 18}
`)!;
   const [, removed, parent, landing] = collectRequests(original);
   const tree = removeNodeFromTree(original, removed.id);
   const onSelectNode = vi.fn();
   render(
     <YAMLDebugSession
       tree={tree}
       yamlCode={treeToYAML(tree)}
       documentReady
       validationErrors={[]}
       multiScenarioDebugEnabled
       redirectedRequestMap={{
         [landing.id]: { sourceNodeId: parent.id, sourceRequestLabel: parent.name, matchedLocation: '/dashboard' },
       }}
       onSelectNode={onSelectNode}
       onEditNode={vi.fn()}
     />,
   );
   await selectOption('Debug scenario', 'second');
   fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
   await waitFor(() => expect(api.handlers).toHaveLength(1));
   act(() => {
     api.handlers[0].onEvent({
       ts: 'now', name: 'Redirect', method: 'GET', path: '/dashboard', status: 200, latency_ms: 1,
       concurrency: 1, request_id: 17, chain_id: 'legacy:scenarios[1].steps[0]', chain_role: 'final',
       redirect_index: 1, step_path: 'scenarios[1].steps[0].redirects[1]',
     });
   });
   fireEvent.click(screen.getByRole('button', { name: /#2GET\/dashboard/ }));
   expect(onSelectNode).toHaveBeenCalledWith(expect.objectContaining({ id: landing.id }));
 });

 it('maps duplicate request names to the selected scenario after reload',async()=>{
  sessionStorage.setItem('relampo.studio.debugRun',JSON.stringify({id:'selected-run',fp:fingerprint(yaml),scenarioName:'second'}));
  const onSelect=show();
  await waitFor(()=>expect(api.handlers).toHaveLength(1));
  act(()=>{
   api.handlers[0].onEvent({ts:'now',name:'duplicate',method:'GET',path:'/second',status:200,latency_ms:1,concurrency:1,request_id:1});
   api.handlers[0].onDone(null);
  });
  fireEvent.click(screen.getByRole('button',{name:/#1GET\/second/}));
  expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({path:expect.arrayContaining(['scenarios',1])}));
 });

 const redirectParent = 'method: POST, url: /login, request_id: 17, chain_id: login, chain_role: parent';
 const redirectFinal = 'method: GET, url: /dashboard, request_id: 18, chain_id: login, chain_role: final';
 it.each([
   ['top-level requests', `      - request: {${redirectParent}}\n      - request: {${redirectFinal}}`],
   ['inline think time', `      - request: {${redirectParent}, think_time: 1ms}\n      - request: {${redirectFinal}}`],
   ['scoped condition', `      - if:
          condition: 'true'
          steps:
            - request: {${redirectParent}}
            - request: {${redirectFinal}}`],
 ])('keeps completed %s out of Skipped after deleting inherited redirect settings', async (_name, steps) => {
   const original = parseYAMLToTree(`test: {name: RLP-866, scenario_mode: sequential}
http_defaults: {follow_redirects: true}
scenarios:
  - name: first
    steps: [{get: /first}]
  - name: second
    steps:
${steps}
`)!;
   const defaults = original.children!.find(node => node.type === 'http_defaults')!;
   const tree = refreshTreePaths(removeNodeFromTree(original, defaults.id));
   const submittedYaml = treeToYAML(tree);
   expect(submittedYaml).not.toContain('follow_redirects');
   render(
     <YAMLDebugSession
       tree={tree}
       yamlCode={submittedYaml}
       documentReady
       validationErrors={[]}
       multiScenarioDebugEnabled
       onSelectNode={vi.fn()}
       onEditNode={vi.fn()}
     />,
   );
   await selectOption('Debug scenario', 'second');
   fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
   await waitFor(() => expect(api.handlers).toHaveLength(1));
   act(() => {
     const emit = (details: Partial<EngineEvent>) =>
       api.handlers[0].onEvent({ ts: 'now', name: 'Login', method: 'GET', path: '/login', status: 200,
         latency_ms: 1, concurrency: 1, ...details });
     emit({ request_id: 17, status: 302, chain_id: 'login', chain_role: 'parent' });
     emit({ request_id: 18, name: 'Dashboard', path: '/dashboard' });
     api.handlers[0].onDone(null);
   });
   expect(screen.getByRole('button', { name: /#2GET\/dashboard/ })).toBeInTheDocument();
   expect(screen.queryByText('Skipped · redirect not followed')).not.toBeInTheDocument();
 });
});
