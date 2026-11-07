import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {GRPCWorkbench} from './GRPCWorkbench';
import * as api from '../../utils/grpcApi';
vi.mock('../../utils/grpcApi',()=>({grpcRequest:vi.fn(),grpcBundleURL:()=>'/bundle'}));
const catalog={descriptorSet:'',messages:{Request:{name:'Request',fields:[{name:'name',type:'string'}]}},services:[{name:'demo.API',methods:[{name:'Call',path:'/demo.API/Call',kind:'unary',input:'Request',output:'Request',template:{name:''}}]}]};
describe('Studio gRPC workflow',()=>{
 beforeEach(()=>{vi.mocked(api.grpcRequest).mockReset().mockImplementation(async(path)=>{if(path==='recordings/current')return {active:false,calls:[]} as any;if(path==='schema')return {id:'schema',catalog,descriptorPath:'schema.protoset'} as any;if(path==='generate')return {id:'bundle',yaml:'generated-yaml',warnings:[]} as any;throw Error(path)})});
 it('discovers a contract, edits a method and adds generated YAML',async()=>{
 const add=vi.fn();render(<GRPCWorkbench open onOpenChange={()=>{}} onAdd={add}/>);
 fireEvent.change(screen.getByLabelText('Server address'),{target:{value:'host:443'}});fireEvent.click(screen.getByRole('button',{name:'Discover service'}));
 await screen.findByText('demo.API');fireEvent.click(screen.getByLabelText('Select Call'));
 fireEvent.change(screen.getByLabelText('name'),{target:{value:'Ada'}});fireEvent.click(screen.getByRole('button',{name:'Generate scenario'}));
 await screen.findByRole('button',{name:'Add to scenario'});fireEvent.click(screen.getByRole('button',{name:'Add to scenario'}));
 expect(add).toHaveBeenCalledWith('generated-yaml');await waitFor(()=>expect(api.grpcRequest).toHaveBeenCalledWith('generate',expect.objectContaining({methods:[expect.objectContaining({method:'/demo.API/Call',message:{name:'Ada'}})]}),expect.anything()));
 });
});
