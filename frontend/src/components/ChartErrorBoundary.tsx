import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 text-center text-gray-500">
          Graphique non disponible sur cette version
        </div>
      );
    }
    return this.props.children;
  }
}
