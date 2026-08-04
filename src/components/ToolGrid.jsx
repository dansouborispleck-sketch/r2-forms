import { TOOLS } from '../lib/tools';
import { useLang } from '../lib/LangContext';

export default function ToolGrid({ selectedTool, onSelect }) {
  const { t } = useLang();
  return (
    <div className="tool-grid">
      {TOOLS.map((tool) => (
        <div
          key={tool.id}
          className={'tool-card' + (selectedTool === tool.id ? ' selected' : '')}
          onClick={() => onSelect(tool.id)}
        >
          <div className="tool-icon" style={{ background: tool.color }}>
            <tool.Icon />
          </div>
          <div className="tool-name">{tool.name}</div>
          <div className="tool-desc">{t(...tool.desc)}</div>
        </div>
      ))}
    </div>
  );
}
