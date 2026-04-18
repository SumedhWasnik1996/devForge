/* eslint-disable prettier/prettier */
export const githubAuthUrl = (clientId: string, redirectUri: string) =>
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=repo%20user%20read:org`;