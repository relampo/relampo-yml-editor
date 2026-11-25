import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { QueryParamsEditor } from './QueryParamsEditor';

afterEach(cleanup);

function Fixture({ initial }: { initial: string }) {
  const [url, setUrl] = useState(initial);
  return (
    <LanguageProvider>
      <QueryParamsEditor
        url={url}
        onUrlChange={setUrl}
      />
      <output data-testid="url">{url}</output>
    </LanguageProvider>
  );
}

it.each([
  '/hlogin?{{gx_evt_token}},gx-no-cache={{_timestamp()}}',
  '/alerts?1,,0',
  '/reset?encrypted-value,0,01',
  '/login?state=a;b&flag&x=1&x=2&&',
  '/search?z=a%2cb%20c&literal=a%2Bb&empty=&flag#section',
])('keeps the original query spelling after editing and restoring its first key: %s', initial => {
  render(<Fixture initial={initial} />);
  const input = screen.getAllByPlaceholderText('name')[0];
  const original = (input as HTMLInputElement).value;
  fireEvent.change(input, { target: { value: original + 'x' } });
  fireEvent.change(input, { target: { value: original } });
  expect(screen.getByTestId('url').textContent).toBe(initial);
});

it('changes one value without encoding the GeneXus key or changing other query fields', () => {
  render(<Fixture initial="/hlogin?{{token}},gx-no-cache=123&z=a%2cb%20c&flag&x=1&x=2&&#anchor" />);
  fireEvent.change(screen.getAllByPlaceholderText('value')[0], { target: { value: '{{_timestamp()}}' } });
  expect(screen.getByTestId('url').textContent).toBe(
    '/hlogin?{{token}},gx-no-cache={{_timestamp()}}&z=a%2cb%20c&flag&x=1&x=2&&#anchor',
  );
});

it('reloads an external URL even when it matches an earlier edit', () => {
  const onUrlChange = vi.fn();
  const editor = (url: string) => (
    <LanguageProvider>
      <QueryParamsEditor url={url} onUrlChange={onUrlChange} />
    </LanguageProvider>
  );
  const { rerender } = render(editor('/first?1,,0'));
  fireEvent.change(screen.getByPlaceholderText('name'), { target: { value: 'one' } });
  expect(onUrlChange).toHaveBeenLastCalledWith('/first?one');
  rerender(editor('/first?one'));
  rerender(editor('/second?flag'));
  rerender(editor('/first?one'));
  expect(screen.getByPlaceholderText<HTMLInputElement>('name').value).toBe('one');
});
