import RedaimNavSidebar from "./RedaimNavSidebar";
import RedaimAIChat from "./RedaimAIChat";
import { Sparkles } from "lucide-react";

export default function RedaimAskAIPage() {
  return (
    <div className="redaim-workspace">
      <RedaimNavSidebar />
      <div className="redaim-subpage redaim-ai-fullpage">
        <div className="redaim-ai-fullpage-header">
          <Sparkles size={24} />
          <div>
            <h1 className="redaim-subpage-title">Ask AI</h1>
            <p className="redaim-subpage-desc" style={{ marginBottom: 0 }}>Stelle Fragen an deinen KI-Assistenten</p>
          </div>
        </div>
        <div className="redaim-ai-fullpage-chat">
          <RedaimAIChat embedded />
        </div>
      </div>
    </div>
  );
}
