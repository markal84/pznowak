import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactForm from '../src/components/ContactForm';
import { vi } from 'vitest';

describe('ContactForm', () => {
  const endpoint = 'http://serwer1542079.home.pl/autoinstalator/wordpress/send-contact.php';

  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ ok: true }) })
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    (global.fetch as any).mockClear();
  });

  it('submits to the PHP endpoint', async () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Wiadomość/i), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /Wyślij wiadomość/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.any(Object));
    });
  });

  it('keeps the honeypot field hidden', () => {
    render(<ContactForm />);
    const honeypot = screen.getByLabelText(/Zostaw to pole puste/i);
    expect(honeypot).not.toBeVisible();
  });
});
