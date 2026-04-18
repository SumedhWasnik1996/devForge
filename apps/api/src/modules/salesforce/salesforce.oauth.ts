/* eslint-disable prettier/prettier */
import * as crypto from "crypto";

export interface PkceChallenge {
    verifier: string;
    challenge: string;
}

/** Generate a cryptographically random PKCE verifier + SHA-256 challenge */
export function generatePkce(): PkceChallenge {
    const verifier = crypto.randomBytes(64).toString("base64url");
    const challenge = crypto
        .createHash("sha256")
        .update(verifier)
        .digest("base64url");
    return { verifier, challenge };
}

export const salesforceAuthUrl = (
    clientId: string,
    redirectUri: string,
    challenge: string,
    sandbox = false,
) => {
    const base = sandbox
        ? "https://test.salesforce.com"
        : "https://login.salesforce.com";

    return (
        `${base}/services/oauth2/authorize` +
        `?response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent("api refresh_token offline_access")}` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256` +
        `&prompt=consent`
    );
};