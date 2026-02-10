// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Suppress console.error from ErrorBoundary's componentDidCatch
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function ThrowingComponent({ message }: { message: string }): JSX.Element {
  throw new Error(message);
}

function WorkingComponent() {
  return <div>Working content</div>;
}

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Working content')).toBeDefined();
  });

  it('should render default error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test error" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Test error')).toBeDefined();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error page</div>}>
        <ThrowingComponent message="Test error" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error page')).toBeDefined();
  });

  it('should show a reload button in default error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test error" />
      </ErrorBoundary>
    );
    const button = screen.getByText('Reload Page');
    expect(button).toBeDefined();
    expect(button.tagName).toBe('BUTTON');
  });

  it('should call window.location.reload when reload button is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test error" />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reload Page'));
    expect(reloadMock).toHaveBeenCalled();
  });
});
