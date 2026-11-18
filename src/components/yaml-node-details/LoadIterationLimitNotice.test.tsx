import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { LoadIterationLimitNotice } from './LoadIterationLimitNotice';

describe('load iteration limits', () => {
  it.each([
    { duration: '1m', iterations: 0 },
    { duration: '', iterations: 1 },
    { duration: '1m', iterations: 1, run_until_stopped: true },
  ])('does not warn when duration is not capped by iterations: %o', data => {
    render(
      <LanguageProvider>
        <LoadIterationLimitNotice data={data} />
      </LanguageProvider>,
    );
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
