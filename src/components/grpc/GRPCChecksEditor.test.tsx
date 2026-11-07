import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {GRPCChecksEditor} from './GRPCChecksEditor';
describe('visual gRPC extractors and assertions',()=>{
 it('adds an extractor without requiring JSON editing',()=>{const change=vi.fn();render(<GRPCChecksEditor extractors={[]} assertions={[]} onExtractorsChange={change} onAssertionsChange={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Add extractor'}));expect(change).toHaveBeenCalledWith([{type:'jsonpath',var:'',expression:'$'}]);});
 it('edits an extraction path while preserving its variable',()=>{const change=vi.fn();render(<GRPCChecksEditor extractors={[{type:'jsonpath',var:'token',expression:'$.token'}]} assertions={[]} onExtractorsChange={change} onAssertionsChange={()=>{}}/>);fireEvent.change(screen.getByLabelText('Extraction path 1'),{target:{value:'$.accessToken'}});expect(change).toHaveBeenCalledWith([{type:'jsonpath',var:'token',expression:'$.accessToken'}]);});
});
