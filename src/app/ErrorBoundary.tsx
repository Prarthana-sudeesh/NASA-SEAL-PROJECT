import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Catches render errors and offers a clean reset instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Rocket Builder crashed:', error, info.componentStack);
  }

  private reset = () => {
    try {
      localStorage.removeItem('rocket-builder:v2');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="panel mx-auto mt-10 max-w-lg p-6 text-center" role="alert">
        <h1 className="text-2xl font-bold">Houston, we have a problem.</h1>
        <p className="mt-2 text-muted">
          Something went wrong. Resetting the current game usually fixes it (leaderboard scores are
          kept).
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
          <button type="button" className="btn btn-primary" onClick={this.reset}>
            Reset game
          </button>
        </div>
      </div>
    );
  }
}
