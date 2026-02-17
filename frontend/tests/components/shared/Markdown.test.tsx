import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown } from '../../../src/components/shared/Markdown';

describe('Markdown', () => {
  describe('headings', () => {
    it('renders h1 with text-2xl font-bold', () => {
      const { container } = render(<Markdown content="# Heading 1" />);
      const h1 = container.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1!.className).toContain('text-2xl');
      expect(h1!.className).toContain('font-bold');
    });

    it('renders h2 with text-xl font-semibold', () => {
      const { container } = render(<Markdown content="## Heading 2" />);
      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
      expect(h2!.className).toContain('text-xl');
      expect(h2!.className).toContain('font-semibold');
    });

    it('renders h3 with text-lg font-semibold', () => {
      const { container } = render(<Markdown content="### Heading 3" />);
      const h3 = container.querySelector('h3');
      expect(h3).toBeTruthy();
      expect(h3!.className).toContain('text-lg');
      expect(h3!.className).toContain('font-semibold');
    });

    it('renders h4 with text-base font-semibold', () => {
      const { container } = render(<Markdown content="#### Heading 4" />);
      const h4 = container.querySelector('h4');
      expect(h4).toBeTruthy();
      expect(h4!.className).toContain('text-base');
      expect(h4!.className).toContain('font-semibold');
    });
  });

  describe('block elements', () => {
    it('renders table with proper styling', () => {
      const md = `| Col A | Col B |\n| --- | --- |\n| A1 | B1 |`;
      const { container } = render(<Markdown content={md} />);
      const table = container.querySelector('table');
      expect(table).toBeTruthy();
      expect(table!.className).toContain('border-collapse');
    });

    it('renders th with border and padding', () => {
      const md = `| Col A | Col B |\n| --- | --- |\n| A1 | B1 |`;
      const { container } = render(<Markdown content={md} />);
      const th = container.querySelector('th');
      expect(th).toBeTruthy();
      expect(th!.className).toContain('border');
      expect(th!.className).toContain('px-3');
    });

    it('renders td with border and padding', () => {
      const md = `| Col A | Col B |\n| --- | --- |\n| A1 | B1 |`;
      const { container } = render(<Markdown content={md} />);
      const td = container.querySelector('td');
      expect(td).toBeTruthy();
      expect(td!.className).toContain('border');
      expect(td!.className).toContain('px-3');
    });

    it('renders blockquote with left border and italic', () => {
      const { container } = render(<Markdown content="> A quote" />);
      const bq = container.querySelector('blockquote');
      expect(bq).toBeTruthy();
      expect(bq!.className).toContain('border-l-4');
      expect(bq!.className).toContain('italic');
    });

    it('renders unordered list with disc markers', () => {
      const { container } = render(<Markdown content="- Item 1\n- Item 2" />);
      const ul = container.querySelector('ul');
      expect(ul).toBeTruthy();
      expect(ul!.className).toContain('list-disc');
    });

    it('renders ordered list with decimal markers', () => {
      const { container } = render(<Markdown content="1. First\n2. Second" />);
      const ol = container.querySelector('ol');
      expect(ol).toBeTruthy();
      expect(ol!.className).toContain('list-decimal');
    });

    it('renders horizontal rule', () => {
      const { container } = render(<Markdown content="---" />);
      const hr = container.querySelector('hr');
      expect(hr).toBeTruthy();
      expect(hr!.className).toContain('border-border');
    });

    it('renders links with accent color and underline', () => {
      const { container } = render(<Markdown content="[Click here](https://example.com)" />);
      const link = container.querySelector('a');
      expect(link).toBeTruthy();
      expect(link!.className).toContain('text-accent');
      expect(link!.className).toContain('underline');
      expect(link!.getAttribute('target')).toBe('_blank');
      expect(link!.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });
});
