import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { buildGitHubIssueUrl, handleFeedbackCommand } from './feedback.js';

describe('CLI Command: feedback', () => {
  const cliPath = path.join(process.cwd(), 'dist/cli.js');

  it('builds GitHub issue URLs with title, body, and labels', () => {
    const url = buildGitHubIssueUrl({
      title: 'Bug Report',
      body: 'Something broke when running sync',
      type: 'bug'
    });
    expect(url).toContain('https://github.com/kovartravis/neuron/issues/new');
    expect(url).toContain('title=Bug+Report');
    expect(url).toContain('body=Something+broke+when+running+sync');
    expect(url).toContain('labels=bug');
  });

  it('builds GitHub issue URL with default fallback when empty', () => {
    const url = buildGitHubIssueUrl({});
    expect(url).toBe('https://github.com/kovartravis/neuron/issues/new');
  });

  it('executes neuron feedback via CLI and outputs JSON payload with URL', () => {
    const stdout = execSync(`node ${cliPath} feedback "Love the offline memory store" --type feature --title "Awesome feature"`).toString();
    const result = JSON.parse(stdout);

    expect(result.status).toBe('feedback_link_generated');
    expect(result.message).toBe('Love the offline memory store');
    expect(result.type).toBe('feature');
    expect(result.title).toBe('Awesome feature');
    expect(result.githubIssueUrl).toContain('https://github.com/kovartravis/neuron/issues/new');
    expect(result.githubIssueUrl).toContain('labels=enhancement');
  });

  it('handles feedback without positional message cleanly', () => {
    const stdout = execSync(`node ${cliPath} feedback`).toString();
    const result = JSON.parse(stdout);

    expect(result.status).toBe('feedback_link_generated');
    expect(result.message).toBeNull();
    expect(result.title).toBe('User Feedback');
    expect(result.githubIssueUrl).toContain('https://github.com/kovartravis/neuron/issues/new');
  });
});
