import type { ComponentProps } from 'react';
import { useSearchNavigation } from '../yaml-tree-view/SearchNavigationContext';
import { HighlightedInput } from './HighlightedInput';
import { BaseInput } from './input-base';

export function Input(props: ComponentProps<'input'>) {
  const { match } = useSearchNavigation();
  const query = match?.scope === 'requests' ? match.query : '';
  const value = String(props.value ?? '');
  if (!query || props.type === 'password' || !value.toLowerCase().includes(query.toLowerCase()))
    return <BaseInput {...props} />;
  const layout =
    props.className
      ?.split(/\s+/)
      .filter(token => /^(w-|min-w-|max-w-|flex-|basis-)/.test(token))
      .join(' ') || 'w-full';
  return (
    <HighlightedInput
      {...props}
      searchText={query}
      containerClass={`min-w-0 ${layout}`}
    />
  );
}
