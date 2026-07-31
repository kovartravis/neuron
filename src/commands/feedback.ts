import { parseFlags, drawBox } from './utils.js';

export const GITHUB_ISSUES_URL = 'https://github.com/kovartravis/neuron/issues/new';

export function buildGitHubIssueUrl(options: {
  title?: string;
  body?: string;
  type?: string;
}): string {
  const params = new URLSearchParams();
  if (options.title) {
    params.set('title', options.title);
  }
  if (options.body) {
    params.set('body', options.body);
  }
  if (options.type) {
    let label = 'feedback';
    if (options.type === 'bug') {
      label = 'bug';
    } else if (options.type === 'feature' || options.type === 'enhancement') {
      label = 'enhancement';
    }
    params.set('labels', label);
  }
  const queryString = params.toString();
  return queryString ? `${GITHUB_ISSUES_URL}?${queryString}` : GITHUB_ISSUES_URL;
}

export function handleFeedbackCommand(args: string[]): void {
  const { positionals, options } = parseFlags(args.slice(1));
  const rawMessage = positionals.join(' ').trim();
  const feedbackType = options.type || 'general';
  const issueTitle = options.title || (rawMessage ? rawMessage.slice(0, 60) : 'User Feedback');

  const githubUrl = buildGitHubIssueUrl({
    title: issueTitle,
    body: rawMessage,
    type: feedbackType
  });

  console.error(drawBox([
    '💬 Thank you for your feedback!',
    `Open GitHub Issue: ${githubUrl}`
  ]));


  console.log(JSON.stringify({
    status: 'feedback_link_generated',
    message: rawMessage || null,
    type: feedbackType,
    title: issueTitle,
    githubIssueUrl: githubUrl
  }));
}
