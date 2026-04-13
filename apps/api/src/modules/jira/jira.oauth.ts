export const authUrl = (id: string, redirect: string) =>
    `https://auth.atlassian.com/authorize` +
    `?audience=api.atlassian.com` +
    `&client_id=${id}` +
    `&scope=read:jira-work%20read:jira-user%20offline_access` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&response_type=code` +
    `&prompt=consent`;
