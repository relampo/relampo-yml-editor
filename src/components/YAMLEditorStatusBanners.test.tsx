import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { YAMLEditorStatusBanners } from './YAMLEditorStatusBanners';

describe('YAMLEditorStatusBanners', () => {
  it('shows every preserved unknown field path', () => {
    render(
      <YAMLEditorStatusBanners
        error={null}
        validationErrors={[]}
        unknownFieldPaths={['future_root', 'scenarios[0].future_scenario']}
        language="en"
      />,
    );

    expect(screen.getByText('future_root')).toBeInTheDocument();
    expect(screen.getByText('scenarios[0].future_scenario')).toBeInTheDocument();
  });
});
