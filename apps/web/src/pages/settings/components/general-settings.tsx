import { useState, useEffect, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';
import { getZenBridge } from '../../../lib/zen-bridge';

const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Alt', 'Shift']);

function normalizeAccelerator(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (!MODIFIER_KEYS.has(e.key)) {
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
  }
  return parts.join('+');
}

function displayAccelerator(accelerator: string): string {
  if (!accelerator) return '';
  const isMac = navigator.platform.includes('Mac');
  return accelerator
    .replace('CommandOrControl', isMac ? '⌘' : 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', isMac ? '⌥' : 'Alt')
    .replace(/\+/g, ' + ');
}

export default function GeneralSettings() {
  const bridge = getZenBridge();

  const [shortcut, setShortcut] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const recordedKeysRef = useRef('');

  useEffect(() => {
    bridge.getGlobalShortcut?.().then((v) => setShortcut(v || ''));
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    recordedKeysRef.current = '';

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') {
        setIsRecording(false);
        setRecordedKeys('');
        recordedKeysRef.current = '';
        return;
      }
      const acc = normalizeAccelerator(e);
      if (acc) {
        setRecordedKeys(acc);
        recordedKeysRef.current = acc;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      const acc = recordedKeysRef.current;
      if (!acc) return;
      // 检查 acc 里是否包含非修饰键（即有主键部分）
      const hasNonModifier = acc.split('+').some((p) => !['CommandOrControl', 'Ctrl', 'Alt', 'Shift'].includes(p));
      if (hasNonModifier) {
        setIsRecording(false);
        setRecordedKeys('');
        recordedKeysRef.current = '';
        commitShortcut(acc);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isRecording]);

  const commitShortcut = async (acc: string) => {
    setError('');
    setSaving(true);
    try {
      const result = await bridge.setGlobalShortcut?.(acc);
      if (result?.success) {
        setShortcut(acc);
      } else {
        setError(result?.error || '注册失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setError('');
    await bridge.clearGlobalShortcut?.();
    setShortcut('');
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6">
      <div className="space-y-1 mb-6">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">通用设置</h3>
        <p className="text-sm text-[var(--text-muted)]">适用于桌面客户端的通用配置</p>
      </div>

      {/* Global Shortcut */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Keyboard size={16} className="text-[var(--text-secondary)]" />
          <label className="text-sm font-medium text-[var(--text-secondary)]">全局唤起快捷键</label>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          设置后，在任意位置按下快捷键即可唤起 Zen Send 窗口
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setError('');
              setIsRecording(true);
              setRecordedKeys('');
            }}
            disabled={saving}
            className={`
              flex-1 h-10 px-4 rounded-lg border text-sm font-medium transition-all
              ${
                isRecording
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] animate-pulse'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]'
              }
            `}
          >
            {isRecording
              ? recordedKeys
                ? displayAccelerator(recordedKeys)
                : '按下快捷键组合...'
              : shortcut
                ? displayAccelerator(shortcut)
                : '点击录制快捷键'}
          </button>

          {shortcut && !isRecording && (
            <button
              onClick={handleClear}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-[var(--border-subtle)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
              title="清除快捷键"
            >
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          )}

          {isRecording && (
            <button
              onClick={() => {
                setIsRecording(false);
                setRecordedKeys('');
              }}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors"
              title="取消"
            >
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {shortcut && !isRecording && (
          <p className="text-xs text-[var(--text-muted)]">
            当前快捷键：
            <span className="font-medium text-[var(--accent)]">{displayAccelerator(shortcut)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
