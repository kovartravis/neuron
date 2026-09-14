import { parseFlags, drawBox } from './utils.js';

export const GITHUB_ISSUES_URL = 'https://github.com/kovartravis/neuron/issues/new';

/**
 * `.github/ISSUE_TEMPLATE/*.yml` issue forms for the two structured types.
 * GitHub pre-fills a form field from a query parameter named after the
 * field's `id`, so the message lands in the form's first textarea
 * (`what-happened` in both forms) instead of being dropped — a bare `body=`
 * is ignored once a `template=` is selected. General feedback keeps the
 * free-form blank issue, which does honour `body=`.
 */
const ISSUE_FORMS: Record<string, { template: string; messageField: string }> = {
  bug: { template: 'bug_report.yml', messageField: 'what-happened' },
  enhancement: { template: 'feature_request.yml', messageField: 'what-happened' },
};

function labelFor(type: string | undefined): string {
  if (type === 'bug') return 'bug';
  if (type === 'feature' || type === 'enhancement') return 'enhancement';
  return 'feedback';
}

export function buildGitHubIssueUrl(options: {
  title?: string;
  body?: string;
  type?: string;
}): string {
  const params = new URLSearchParams();
  const label = options.type ? labelFor(options.type) : undefined;
  const form = label ? ISSUE_FORMS[label] : undefined;

  if (form) {
    params.set('template', form.template);
  }
  if (options.title) {
    params.set('title', options.title);
  }
  if (options.body) {
    params.set(form ? form.messageField : 'body', options.body);
  }
  if (label) {
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
