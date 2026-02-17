import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BashPrompt } from '../../../src/components/copilot/BashPrompt';

describe('BashPrompt', () => {
  it('renders full prompt with user, cwd, and git branch', () => {
    render(
      <BashPrompt
        user="alice"
        hostname="dev-box"
        cwd="/home/alice/projects/my-app"
        gitBranch="main"
      />,
    );
    const el = screen.getByTestId('bash-prompt');
    expect(el.textContent).toContain('alice@dev-box');
    expect(el.textContent).toContain('my-app');
    expect(el.textContent).toContain('main');
  });

  it('renders without git branch segment when gitBranch is empty', () => {
    render(
      <BashPrompt
        user="bob"
        hostname="laptop"
        cwd="/tmp"
        gitBranch=""
      />,
    );
    const el = screen.getByTestId('bash-prompt');
    expect(el.textContent).toContain('bob@laptop');
    expect(el.textContent).toContain('/tmp');
    expect(screen.queryByTestId('bash-prompt-git')).toBeNull();
  });

  it('renders without git branch when gitBranch is undefined', () => {
    render(
      <BashPrompt
        user="bob"
        hostname="laptop"
        cwd="/tmp"
      />,
    );
    expect(screen.queryByTestId('bash-prompt-git')).toBeNull();
  });

  it('shortens home directory paths', () => {
    render(
      <BashPrompt
        user="alice"
        hostname="dev"
        cwd="/Users/alice/Documents/GitHub/project"
        gitBranch=""
      />,
    );
    const cwdSegment = screen.getByTestId('bash-prompt-cwd');
    expect(cwdSegment.textContent).toContain('project');
  });

  it('renders SVG chevron separators instead of Nerd Font characters', () => {
    render(
      <BashPrompt
        user="alice"
        hostname="dev"
        cwd="/home/alice"
        gitBranch="main"
      />,
    );
    const el = screen.getByTestId('bash-prompt');
    // Should contain SVG elements for chevron arrows (not Nerd Font chars)
    const svgs = el.querySelectorAll('svg.powerline-arrow');
    // 3 arrows: plum→blush, blush→salmon, salmon→bg
    expect(svgs.length).toBe(3);
  });

  it('renders 2 SVG chevrons when git branch is absent', () => {
    render(
      <BashPrompt
        user="alice"
        hostname="dev"
        cwd="/tmp"
      />,
    );
    const el = screen.getByTestId('bash-prompt');
    const svgs = el.querySelectorAll('svg.powerline-arrow');
    // 2 arrows: plum→blush, blush→bg
    expect(svgs.length).toBe(2);
  });

  it('renders the $ symbol at the end', () => {
    render(
      <BashPrompt
        user="alice"
        hostname="dev"
        cwd="/tmp"
        gitBranch=""
      />,
    );
    const el = screen.getByTestId('bash-prompt');
    expect(el.textContent).toContain('$');
  });

  it('uses M365Princess theme colors on segments', () => {
    render(
      <BashPrompt
        user="alice"
        hostname="dev"
        cwd="/tmp"
        gitBranch="main"
      />,
    );
    const userSegment = screen.getByTestId('bash-prompt-user');
    const cwdSegment = screen.getByTestId('bash-prompt-cwd');
    const gitSegment = screen.getByTestId('bash-prompt-git');
    // Plum, Blush, Salmon background colors
    expect(userSegment.style.backgroundColor).toBe('rgb(154, 52, 142)');
    expect(cwdSegment.style.backgroundColor).toBe('rgb(218, 98, 125)');
    expect(gitSegment.style.backgroundColor).toBe('rgb(252, 161, 125)');
  });

  it('first segment has rounded left edge', () => {
    render(
      <BashPrompt
        user="alice"
        hostname="dev"
        cwd="/tmp"
      />,
    );
    const userSegment = screen.getByTestId('bash-prompt-user');
    // Should have border-radius on left side
    expect(userSegment.style.borderRadius).toContain('4px');
  });
});
