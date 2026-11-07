import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GRPCMessageForm } from './GRPCMessageForm';
import type { GRPCCatalog } from '../../utils/grpcApi';
const catalog: GRPCCatalog = {services:[],descriptorSet:'',messages:{Request:{name:'Request',fields:[{name:'username',type:'string'},{name:'enabled',type:'bool'},{name:'zone',type:'enum',enumValues:['NORMAL','VIP']},{name:'seats',type:'int32',repeated:true},{name:'email',type:'string',oneof:'contact'},{name:'phone',type:'string',oneof:'contact'}]}}};
describe('descriptor-backed gRPC message forms',()=>{
 it('edits scalar fields without losing other values',()=>{const update=vi.fn();render(<GRPCMessageForm catalog={catalog} messageType="Request" value={{username:'Ada',enabled:true,zone:'VIP',seats:[]}} onChange={update}/>);fireEvent.change(screen.getByLabelText('username'),{target:{value:'Grace'}});expect(update).toHaveBeenCalledWith({username:'Grace',enabled:true,zone:'VIP',seats:[]});expect(screen.getByLabelText('zone')).toHaveValue('VIP');});
 it('adds repeated entries and chooses oneof alternatives',()=>{const update=vi.fn();render(<GRPCMessageForm catalog={catalog} messageType="Request" value={{seats:[],email:'a@example.test'}} onChange={update}/>);fireEvent.click(screen.getByRole('button',{name:'Add seats'}));expect(update).toHaveBeenCalledWith({seats:[0],email:'a@example.test'});fireEvent.change(screen.getByLabelText('contact'),{target:{value:'phone'}});expect(update).toHaveBeenCalledWith({seats:[],phone:''});});
});
