import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { YAMLDebugSession } from './YAMLDebugView';
import { parseYAMLToTree } from '../utils/yamlParser';
import { fingerprint } from '../utils/studioRunStore';
import type { EngineEvent } from '../utils/debugApi';

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
 for (const vus of [1,2]) {
  it(`requires selection and posts the full script with ${vus} VUs`, async () => {
   show();
   expect(screen.getByRole('button',{name:'Run Debug'})).toBeDisabled();
   fireEvent.change(screen.getByRole('combobox',{name:'Debug scenario'}),{target:{value:'second'}});
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
  fireEvent.change(screen.getByRole('combobox',{name:'Debug scenario'}),{target:{value:'second'}});
  fireEvent.click(screen.getByRole('button',{name:'Run Debug'}));
  await screen.findByText('Select a scenario from the current script before Debug.');
  expect(api.start).not.toHaveBeenCalled();
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
});
