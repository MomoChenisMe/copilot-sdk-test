import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ToolRecordErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ToolRecord render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-2 rounded-xl border border-border overflow-hidden px-4 py-2.5 text-xs text-text-muted">
          Tool record failed to render
        </div>
      );
    }
    return this.props.children;
  }
}
