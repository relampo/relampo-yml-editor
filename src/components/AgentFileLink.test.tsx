import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { resetStudioSessionForTests } from '../utils/studioAuth';
import { AgentFileLink } from './AgentFileLink';

afterEach(() => {
  resetStudioSessionForTests();
  window.history.replaceState({}, '', '/');
});

it('renders a plain link to the backend file and keeps the anchor attributes', () => {
  window.history.replaceState({}, '', '/?token=secret');
  resetStudioSessionForTests();

  render(
    <AgentFileLink
      path="/api/grpc/bundles/b1"
      className="button"
      download
    >
      Download project bundle
    </AgentFileLink>,
  );

  const link = screen.getByRole('link', { name: 'Download project bundle' });
  expect(link).toHaveAttribute('href', '/api/grpc/bundles/b1?token=secret');
  expect(link).toHaveAttribute('download');
  expect(link).toHaveClass('button');
});
