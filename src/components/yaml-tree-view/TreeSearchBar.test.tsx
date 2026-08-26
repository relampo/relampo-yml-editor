import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TreeSearchBar } from './TreeSearchBar';

describe('TreeSearchBar replace controls', () => {
  it('navigates matches and supports selected or all replacement', () => {
    const onReplace = vi.fn(() => 1);

    render(
      <TreeSearchBar
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
        onReplace={onReplace}
        countMatches={search => (search === 'needle' ? 3 : 0)}
        searchMatchCount={0}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    fireEvent.change(screen.getByLabelText('Find text to replace'), { target: { value: 'needle' } });
    fireEvent.change(screen.getByLabelText('Replacement text'), { target: { value: 'replacement' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next replace match' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace selected' }));

    expect(onReplace).toHaveBeenLastCalledWith('needle', 'replacement', 1);
    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('2/3');

    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }));
    expect(onReplace).toHaveBeenLastCalledWith('needle', 'replacement', undefined);
  });

  it('applies the tree search only after Search or Enter', () => {
    const onChange = vi.fn();

    render(
      <TreeSearchBar
        value=""
        onChange={onChange}
        onClear={vi.fn()}
        onReplace={vi.fn()}
        countMatches={() => 0}
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
  });

  it('does not replace text when the replacement is empty', () => {
    const onReplace = vi.fn(() => 1);

    render(
      <TreeSearchBar
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
        onReplace={onReplace}
        countMatches={() => 1}
        searchMatchCount={0}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    fireEvent.change(screen.getByLabelText('Find text to replace'), { target: { value: 'needle' } });

    expect(screen.getByRole('button', { name: 'Replace selected' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Replace all' })).toBeDisabled();
    expect(onReplace).not.toHaveBeenCalled();
  });
});
