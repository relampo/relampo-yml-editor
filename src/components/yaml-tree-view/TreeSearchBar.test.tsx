import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TreeSearchBar } from './TreeSearchBar';

describe('TreeSearchBar replace controls', () => {
  it('copies the active tree search into Replace and shows its match count', () => {
    render(
      <TreeSearchBar
        value="token"
        onChange={vi.fn()}
        onClear={vi.fn()}
        onReplace={vi.fn()}
        replaceMatchCount={17}
        currentMatchIndex={0}
        onCurrentMatchIndexChange={vi.fn()}
        searchMatchCount={1}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.getByLabelText('Find text to replace')).toHaveValue('token');
    expect(screen.getByLabelText('Find text to replace')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('1 / 17');
  });

  it('navigates matches and supports selected or all replacement', () => {
    const onReplace = vi.fn(() => 1);

    function Harness() {
      const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

      return (
        <TreeSearchBar
          value="needle"
          onChange={vi.fn()}
          onClear={vi.fn()}
          onReplace={onReplace}
          replaceMatchCount={3}
          currentMatchIndex={currentMatchIndex}
          onCurrentMatchIndexChange={setCurrentMatchIndex}
          searchMatchCount={0}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    fireEvent.change(screen.getByLabelText('Replacement text'), { target: { value: 'replacement' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next replace match' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace selected' }));

    expect(onReplace).toHaveBeenLastCalledWith('replacement', 1);
    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('2 / 3');

    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }));
    expect(onReplace).toHaveBeenLastCalledWith('replacement', undefined);
  });

  it('applies the tree search only after Search or Enter', () => {
    const onChange = vi.fn();

    render(
      <TreeSearchBar
        value=""
        onChange={onChange}
        onClear={vi.fn()}
        onReplace={vi.fn()}
        replaceMatchCount={0}
        currentMatchIndex={0}
        onCurrentMatchIndexChange={vi.fn()}
        searchMatchCount={2}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Search nodes' });
    fireEvent.change(input, { target: { value: 'needle' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    expect(onChange).toHaveBeenCalledWith('needle');

    fireEvent.change(input, { target: { value: 'next' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('next');

    fireEvent.change(input, { target: { value: '  trimmed  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    expect(onChange).toHaveBeenLastCalledWith('trimmed');
  });

  it('does not replace text when the replacement is empty', () => {
    const onReplace = vi.fn(() => 1);

    render(
      <TreeSearchBar
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
        onReplace={onReplace}
        replaceMatchCount={1}
        currentMatchIndex={0}
        onCurrentMatchIndexChange={vi.fn()}
        searchMatchCount={0}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.getByRole('button', { name: 'Replace selected' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Replace all' })).toBeDisabled();
    expect(onReplace).not.toHaveBeenCalled();
  });

  it('keeps Replace all on a separate row below the selected control', () => {
    render(
      <TreeSearchBar
        value="needle"
        onChange={vi.fn()}
        onClear={vi.fn()}
        onReplace={vi.fn()}
        replaceMatchCount={1}
        currentMatchIndex={0}
        onCurrentMatchIndexChange={vi.fn()}
        searchMatchCount={1}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    const selected = screen.getByRole('button', { name: 'Replace selected' });
    const all = screen.getByRole('button', { name: 'Replace all' });
    expect(selected.compareDocumentPosition(all) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not execute repeated searches while typing a large query', () => {
    const onChange = vi.fn();

    render(
      <TreeSearchBar
        value=""
        onChange={onChange}
        onClear={vi.fn()}
        onReplace={vi.fn()}
        replaceMatchCount={0}
        currentMatchIndex={0}
        onCurrentMatchIndexChange={vi.fn()}
        searchMatchCount={0}
      />,
    );

    const largeQuery = 'needle'.repeat(5000);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search nodes' }), { target: { value: largeQuery } });

    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('moves the active replacement index in both directions', () => {
    function Harness() {
      const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

      return (
        <TreeSearchBar
          value="needle"
          onChange={vi.fn()}
          onClear={vi.fn()}
          onReplace={vi.fn()}
          replaceMatchCount={3}
          currentMatchIndex={currentMatchIndex}
          onCurrentMatchIndexChange={setCurrentMatchIndex}
          searchMatchCount={0}
        />
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next replace match' }));
    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('2 / 3');
    fireEvent.click(screen.getByRole('button', { name: 'Previous replace match' }));
    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('1 / 3');
  });
});
