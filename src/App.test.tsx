import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import { analyzeRegex } from './utils/regex';

class TestWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(message: unknown) {
    queueMicrotask(() => {
      try {
        const request = message as { pattern: string; flags: string; input: string; replacement: string };
        const result = analyzeRegex(request.pattern, request.flags, request.input, request.replacement);
        this.onmessage?.({ data: { type: 'result', result } } as MessageEvent);
      } catch (error) {
        this.onmessage?.({
          data: { type: 'error', error: error instanceof Error ? error.message : 'Worker test error' },
        } as MessageEvent);
      }
    });
  }

  terminate() {}
}

describe('Regex Playground interface', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('Worker', TestWorker);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the live tester, updates text, and saves a named pattern locally', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Regex Playground/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Regular expression' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Match results' })).toBeInTheDocument();
    expect(await screen.findByText('Valid JavaScript regular expression')).toBeInTheDocument();

    const textEditor = screen.getByRole('textbox', { name: 'Text to test against the regular expression' });
    fireEvent.change(textEditor, { target: { value: 'regex' } });
    await waitFor(() => expect(screen.getByText('1 match')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Save pattern' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Test matcher' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save pattern' }));
    expect(await screen.findByText('“Test matcher” saved in this browser.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Saved/ }));
    expect(screen.getByText('Test matcher')).toBeInTheDocument();
    expect(window.localStorage.getItem('regex-playground:saved-patterns:v1')).toContain('Test matcher');
  });

  it('opens a library example with its sample text and expected matches', async () => {
    render(<App />);
    const emailExample = screen.getByRole('button', { name: /Email address/ });
    fireEvent.click(emailExample);
    expect(screen.getByText(/not a complete RFC mailbox validator/)).toBeInTheDocument();
    expect(screen.getByText('EXPECTED MATCHES')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use this example' }));
    expect(screen.getByRole('textbox', { name: 'Text to test against the regular expression' })).toHaveValue(
      'Write to hello@example.com or first.last+dev@sub.example.org.',
    );
    expect(await screen.findByText('Valid JavaScript regular expression')).toBeInTheDocument();
  });
});
