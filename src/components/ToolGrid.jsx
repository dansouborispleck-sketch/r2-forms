import { TOOLS } from '../lib/tools';
import { useLang } from '../lib/LangContext';

export default function ToolGrid({ selectedTool, onSelect }) {
  const { t } = useLang();
  return (
    <div className="tools" role="radiogroup">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          role="radio"
          aria-checked={selectedTool === tool.id}
          className={'tool' + (selectedTool === tool.id ? ' on' : '')}
          onClick={() => onSelect(tool.id)}
        >
          <span className="tool-icon" style={{ background: tool.color }}><tool.Icon /></span>
          <span className="tool-name">{tool.name}</span>
          <span className="tool-desc">{t(...tool.desc)}</span>
        </button>
      ))}
    </div>
  );
}
