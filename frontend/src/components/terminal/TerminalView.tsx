import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  onReady: () => void;
  writeRef: React.MutableRefObject<((data: string) => void) | null>;
}

export function TerminalView({ onData, onResize, onReady, writeRef }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
      theme: {
        background: '#1a1a2e',
        foreground: '#e8e8f0',
        cursor: '#7c3aed',
        selectionBackground: '#7c3aed40',
        black: '#1a1a2e',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#7c3aed',
        cyan: '#06b6d4',
        white: '#e8e8f0',
        brightBlack: '#6c6c84',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fde047',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);

    // Fit to container
    try {
      fitAddon.fit();
    } catch {
      // ignore fit errors during initialization
    }

    // Forward terminal input to parent
    terminal.onData((data) => {
      onData(data);
    });

    // Expose write function to parent
    writeRef.current = (data: string) => {
      terminal.write(data);
    };

    // Report initial size
    onResize(terminal.cols, terminal.rows);

    // Notify parent terminal is ready
    onReady();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => {
      try {
        fitAddon.fit();
        onResize(terminal.cols, terminal.rows);
      } catch {
        // ignore
      }
    };

    window.addEventListener('resize', handleResize);

    // ResizeObserver for container size changes
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      writeRef.current = null;
      terminal.dispose();
    };
  }, [onData, onResize, onReady, writeRef]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-bg-primary"
      style={{ minHeight: '200px' }}
    />
  );
}
