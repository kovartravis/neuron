import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { buildGitHubIssueUrl, handleFeedbackCommand } from './feedback.js';

describe('CLI Command: feedback', () => {
  const cliPath = path.join(process.cwd(), 'dist/cli.js');

  it('routes a bug report to the bug issue form and pre-fills its first field', () => {
    const url = buildGitHubIssueUrl({
      title: 'Bug Report',
      body: 'Something broke when running sync',
      type: 'bug'
    });
    expect(url).toContain('https://github.com/kovartravis/neuron/issues/new');
    expect(url).toContain('template=bug_report.yml');
    expect(url).toContain('title=Bug+Report');
    expect(url).toContain('what-happened=Something+broke+when+running+sync');
    expect(url).not.toContain('body=');
    expect(url).toContain('labels=bug');
  });

  it('routes a feature request to the feature issue form', () => {
    const url = buildGitHubIssueUrl({ body: 'Shared stores across repos', type: 'feature' });
    expect(url).toContain('template=feature_request.yml');
    expect(url).toContain('what-happened=Shared+stores+across+repos');
    expect(url).toContain('labels=enhancement');
  });

  it('keeps general feedback on a free-form issue with a pre-filled body', () => {
    const url = buildGitHubIssueUrl({ title: 'Thoughts', body: 'Loving it', type: 'general' });
    expect(url).not.toContain('template=');
    expect(url).toContain('title=Thoughts');
    expect(url).toContain('body=Loving+it');
    expect(url).toContain('labels=feedback');
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
