import { Component, type ReactNode } from "react";
import { HelpDialog, LeftPanel, RightPanel, StatusBar, TopBar } from "./components/Chrome";
import { Viewport } from "./components/Viewport";
import { EditorProvider, useEditor } from "./state";

class Boundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="sheet" style={{ margin: 24 }}>
          <h2>The studio hit an error</h2>
          <p>{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function Shell() {
  const { ui } = useEditor();
  return (
    <div className="app">
      <TopBar />
      <div className="workspace">
        {ui.leftOpen && <LeftPanel />}
        <Viewport />
        {ui.rightOpen && <RightPanel />}
      </div>
      <StatusBar />
      <HelpDialog />
    </div>
  );
}

export function App() {
  return (
    <Boundary>
      <EditorProvider>
        <Shell />
      </EditorProvider>
    </Boundary>
  );
}
