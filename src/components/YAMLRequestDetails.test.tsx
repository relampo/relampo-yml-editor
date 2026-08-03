import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { YAMLRequestDetails } from './YAMLRequestDetails';

describe('YAMLRequestDetails', () => {
  function ControlledRequest({ node }: { node: YAMLNode }) {
    const [currentNode, setCurrentNode] = useState(node);
    return (
      <YAMLRequestDetails
        node={currentNode}
        onNodeUpdate={(nodeId, data) => setCurrentNode(previous => ({ ...previous, id: nodeId, data }))}
      />
    );
  }

  it('shows the HTTP method from short-form node type when method data is absent', () => {
    const node: YAMLNode = {
      id: 'post-1',
      type: 'post',
      name: 'POST: /login',
      data: { url: '/login' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} />);

    expect(screen.getByLabelText('Method')).toHaveTextContent('POST');
  });

  it('shows the path example as a placeholder for a new blank request', () => {
    const node: YAMLNode = {
      id: 'get-1',
      type: 'get',
      name: 'GET: /',
      data: { url: '' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} />);

    expect(screen.getByLabelText('Path')).toHaveValue('');
    expect(screen.getByPlaceholderText('/api/endpoint')).toBeInTheDocument();
  });

  it('shows the inherited base host as the editable Base URL value for relative requests', () => {
    const node: YAMLNode = {
      id: 'get-base',
      type: 'get',
      name: 'GET: /assets/intro.mp4',
      data: { url: '/assets/intro.mp4' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} baseUrl="https://video-cdn.example.net" />);

    // Uniform with secondary (absolute) hosts: the field surfaces the inherited
    // host as a value rather than leaving it blank. See RLP-414.
    expect(screen.getByLabelText('Base URL')).toHaveValue('video-cdn.example.net');
  });

  it('rewrites to a relative URL when the Base URL is set back to the inherited host', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-base-keep',
      type: 'get',
      name: 'GET: https://api.other.com/login',
      data: { url: 'https://api.other.com/login?x=1' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} baseUrl="https://relax.beaire.com" onNodeUpdate={onNodeUpdate} />);

    // Pointing a secondary-host request back at the inherited host drops the
    // absolute URL so it inherits from http_defaults again.
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'relax.beaire.com' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith('get-base-keep', expect.objectContaining({ url: '/login?x=1' }));
  });

  it('writes an absolute URL when the Base URL is changed to a different host', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-base-change',
      type: 'get',
      name: 'GET: /login',
      data: { url: '/login?x=1' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} baseUrl="https://relax.beaire.com" onNodeUpdate={onNodeUpdate} />);

    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'api.other.com' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith(
      'get-base-change',
      expect.objectContaining({ url: 'https://api.other.com/login?x=1' }),
    );
  });

  it('falls back to the generic Base URL placeholder when no base_url is configured', () => {
    const node: YAMLNode = {
      id: 'get-nobase',
      type: 'get',
      name: 'GET: /',
      data: { url: '' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} />);

    expect(screen.getByPlaceholderText('api.example.com')).toBeInTheDocument();
  });

  it('uses application/json Content-Type to display simple object bodies as JSON', async () => {
    const node: YAMLNode = {
      id: 'post-json',
      type: 'post',
      name: '[2] POST /api/auth',
      data: {
        method: 'POST',
        url: '/api/auth',
        headers: { 'Content-Type': 'application/json' },
        body: {
          password: 'Pass001!',
          username: 'user001',
        },
      },
      children: [],
    };

    render(<YAMLRequestDetails node={node} />);

    expect(await screen.findByText('JSON Body')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"username": "user001"/)).toBeInTheDocument();
    expect(screen.queryByText('Form Data (application/x-www-form-urlencoded)')).not.toBeInTheDocument();
  });

  it('uses form-urlencoded Content-Type to display array bodies as form data', async () => {
    const node: YAMLNode = {
      id: 'post-form',
      type: 'post',
      name: '[12] POST /pay/start',
      data: {
        method: 'POST',
        url: '/pay/start',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: [{ reservation_id: '{{reservationid}}' }, { relampo_token: '4b525459' }],
      },
      children: [],
    };

    render(<YAMLRequestDetails node={node} />);

    expect(await screen.findByText('Form Data (application/x-www-form-urlencoded)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('reservation_id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('{{reservationid}}')).toBeInTheDocument();
    expect(screen.queryByText('JSON Body')).not.toBeInTheDocument();
  });

  it('uses body_raw as the form representation when form-urlencoded body data is raw', async () => {
    const node: YAMLNode = {
      id: 'post-form-raw',
      type: 'post',
      name: '[12] POST /pay/start',
      data: {
        method: 'POST',
        url: '/pay/start',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body_raw: 'reservation_id=RES-d7ffa616f697&relampo_token=4b525459',
      },
      children: [],
    };

    render(<YAMLRequestDetails node={node} />);

    expect(await screen.findByText('Form Data (application/x-www-form-urlencoded)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('reservation_id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('RES-d7ffa616f697')).toBeInTheDocument();
    expect(screen.getByDisplayValue('relampo_token')).toBeInTheDocument();
  });

  it('keeps focus while the parent syncs Form Data edits back into the node', async () => {
    const node: YAMLNode = {
      id: 'post-form-focus',
      type: 'post',
      name: '[13] POST /pay/start',
      data: {
        method: 'POST',
        url: '/pay/start',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: { reservation_id: 'initial' },
      },
      children: [],
    };

    render(<ControlledRequest node={node} />);

    let fieldInput = (await screen.findByDisplayValue('reservation_id')) as HTMLInputElement;
    fieldInput.focus();
    for (const value of ['reservation', 'reservation_id_updated']) {
      fireEvent.change(fieldInput, { target: { value } });
      fieldInput = screen.getByDisplayValue(value) as HTMLInputElement;
      expect(document.activeElement).toBe(fieldInput);
    }

    let valueInput = (await screen.findByDisplayValue('initial')) as HTMLInputElement;
    valueInput.focus();
    for (const value of ['draft', 'draft-value']) {
      fireEvent.change(valueInput, { target: { value } });
      valueInput = screen.getByDisplayValue(value) as HTMLInputElement;
      expect(document.activeElement).toBe(valueInput);
    }
  });

  it('re-derives the panel from a newly selected node instead of preserving stale Form Data', async () => {
    // The preserve branch is one-shot: it must release as soon as the echo it
    // was waiting for arrives. If the clear ever moves inside the branch, a
    // stale pending body makes a genuinely external change look like our own
    // echo — here node B has the same body but is JSON, so the panel would
    // wrongly keep showing node A's Form Data rows.
    const formNode: YAMLNode = {
      id: 'post-form-a',
      type: 'post',
      name: '[15] POST /a',
      data: {
        method: 'POST',
        url: '/a',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: { token: 'x' },
      },
      children: [],
    };
    const jsonNode: YAMLNode = {
      id: 'post-json-b',
      type: 'post',
      name: '[16] POST /b',
      data: {
        method: 'POST',
        url: '/b',
        headers: { 'Content-Type': 'application/json' },
        body: { token: '1' },
      },
      children: [],
    };

    function SwitchableRequest() {
      const [current, setCurrent] = useState(formNode);
      return (
        <>
          <button type="button" onClick={() => setCurrent(jsonNode)}>
            select other node
          </button>
          <YAMLRequestDetails
            node={current}
            onNodeUpdate={(nodeId, data) => setCurrent(previous => ({ ...previous, id: nodeId, data }))}
          />
        </>
      );
    }

    render(<SwitchableRequest />);

    const valueInput = (await screen.findByDisplayValue('x')) as HTMLInputElement;
    valueInput.focus();
    fireEvent.change(valueInput, { target: { value: '1' } });
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'select other node' }));

    expect(await screen.findByText('JSON Body')).toBeInTheDocument();
    // The Form Data *rows* are gone (the type toggle button keeps its label).
    expect(screen.queryByPlaceholderText('field_name')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('token')).not.toBeInTheDocument();
  });

  it('keeps a draft value and Form Data type when its field name is still blank', async () => {
    const node: YAMLNode = {
      id: 'post-form-draft',
      type: 'post',
      name: '[14] POST /pay/start',
      data: {
        method: 'POST',
        url: '/pay/start',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: {},
      },
      children: [],
    };

    render(<ControlledRequest node={node} />);

    fireEvent.click(screen.getByRole('button', { name: 'Form Data' }));
    const valueInput = screen.getAllByPlaceholderText('value').at(-1) as HTMLInputElement;
    valueInput.focus();
    fireEvent.change(valueInput, { target: { value: 'draft-value' } });

    const updatedValueInput = screen.getByDisplayValue('draft-value');
    expect(document.activeElement).toBe(updatedValueInput);
    expect(screen.getByPlaceholderText('field_name')).toBeInTheDocument();
  });

  it('replaces stale body_raw when editing form data placeholders from Spark variables', async () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'post-form-raw-edit',
      type: 'post',
      name: '[12] POST /pay/start',
      data: {
        method: 'POST',
        url: '/pay/start/{{relampo_token1}}',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body_raw: 'reservation_id=RES-d7ffa616f697&relampo_token=4b525459',
      },
      children: [
        {
          id: 'spark-before',
          type: 'spark_before',
          name: 'Spark Before',
          data: { script: 'vars.set("relampo_token1", "signed")' },
        },
      ],
    };

    render(<YAMLRequestDetails node={node} onNodeUpdate={onNodeUpdate} />);

    fireEvent.change(await screen.findByDisplayValue('4b525459'), { target: { value: '{{relampo_token1}}' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith(
      'post-form-raw-edit',
      expect.objectContaining({
        body: {
          reservation_id: 'RES-d7ffa616f697',
          relampo_token: '{{relampo_token1}}',
        },
      }),
    );
    expect(onNodeUpdate.mock.lastCall?.[1]).not.toHaveProperty('body_raw');
  });

  it('keeps blank path edits empty in editor state so export can normalize to slash', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-2',
      type: 'get',
      name: 'GET: /login',
      data: { url: '/login' },
      children: [],
    };

    render(
      <YAMLRequestDetails
        node={node}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith('get-2', expect.objectContaining({ url: '' }));
  });

  it('preserves protocol, host, and query when the path is cleared on an absolute URL', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-3',
      type: 'get',
      name: 'GET: https://api.example.com/login',
      data: { url: 'https://api.example.com/login?x=1' },
      children: [],
    };

    render(
      <YAMLRequestDetails
        node={node}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith(
      'get-3',
      expect.objectContaining({ url: 'https://api.example.com/?x=1' }),
    );
  });

  it('preserves the query string when the path is cleared on a relative URL', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-4',
      type: 'get',
      name: 'GET: /login',
      data: { url: '/login?x=1' },
      children: [],
    };

    render(
      <YAMLRequestDetails
        node={node}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith('get-4', expect.objectContaining({ url: '/?x=1' }));
  });
});
