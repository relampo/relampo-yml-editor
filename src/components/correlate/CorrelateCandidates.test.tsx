import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CorrelateCandidates } from './CorrelateCandidates';
const source = {
  StepIndex: 0,
  RequestID: 1,
  Method: 'POST',
  URL: 'https://app.test/login',
  Location: 'response.body.json',
  Path: '$.token',
};
it('shows selectable candidates without confidence or explanation and keeps manual rows disabled', () => {
  const selected = vi.fn(),
    locate = vi.fn();
  render(
    <CorrelateCandidates
      rows={[
        {
          id: '1',
          variable: 'token',
          type: 'auth_token',
          kind: 'auto',
          applicable: true,
          source,
          targets: [{ ...source, StepIndex: 1, RequestID: 2, Location: 'request.headers', Path: 'Authorization' }],
        },
        { id: '2', variable: 'signature', type: 'signature', kind: 'manual', applicable: false, source, targets: null },
      ]}
      selected={[]}
      onSelected={selected}
      onLocate={locate}
      disabled={false}
      language="en"
    />,
  );
  expect(screen.queryByRole('columnheader', { name: /confidence|explanation/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Select candidate 2')).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Select candidate 1'));
  expect(selected).toHaveBeenCalledWith(['1']);
  fireEvent.click(screen.getAllByRole('button', { name: /POST.*login/ })[0]);
  expect(locate).toHaveBeenCalled();
});
it('shows the captured Value instead of Type and constrains later uses to five visible entries',()=>{
 const targets=Array.from({length:8},(_,i)=>({...source,StepIndex:i+1,RequestID:i+2,URL:'https://app.test/step/'+i}));
 render(<CorrelateCandidates rows={[{id:'1',variable:'token',value:'actual-token-123',type:'auth_token',kind:'auto',applicable:true,source,targets}]} selected={[]} onSelected={vi.fn()} onLocate={vi.fn()} disabled={false} language="en"/>);
 expect(screen.getByRole('columnheader',{name:'Value',exact:true})).toBeInTheDocument();
 expect(screen.queryByRole('columnheader',{name:'Type',exact:true})).not.toBeInTheDocument();
 expect(screen.getByText('actual-token-123')).toBeInTheDocument();
 const uses=screen.getByRole('region',{name:'Used in candidate 1'});
 expect(uses).toHaveClass('max-h-[200px]','overflow-y-auto');
 expect(uses.children).toHaveLength(8);
});
