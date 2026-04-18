/* eslint-disable prettier/prettier */
import { Controller, Get, Delete, Query, Res, Param, ParseIntPipe } from "@nestjs/common";
import { SalesforceService } from "./salesforce.service";

@Controller("salesforce")
export class SalesforceController {
    constructor(private sf: SalesforceService) { }

    /**
     * GET /salesforce/oauth/start?sandbox=true
     * Generates PKCE verifier+challenge, stores verifier, redirects to SF
     */
    @Get("oauth/start")
    start(@Query("sandbox") sandbox: string, @Res() res) {
        const { url, state } = this.sf.startAuth(sandbox === "true");
        // Append state to redirect URL so callback can look up the verifier
        const redirectUrl = url + `&state=${encodeURIComponent(state)}`;
        res.redirect(redirectUrl);
    }

    /**
     * GET /salesforce/oauth/callback?code=...&state=...
     * Salesforce returns the same state we sent — use it to retrieve the verifier
     */
    @Get("oauth/callback")
    async cb(
        @Query("code") code: string,
        @Query("state") state: string,
        @Res() res,
    ) {
        try {
            await this.sf.exchange(code, state);
        } catch (err: any) {
            return res.send(`
                <!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;">
                <div style="text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1);">
                    <div style="font-size:48px;margin-bottom:1rem;">✗</div>
                    <h2 style="margin:0 0 .5rem;color:#dc2626;">Connection Failed</h2>
                    <p style="color:#666;margin:0 0 1.5rem;">${err.message}</p>
                    <button onclick="window.close()" style="padding:10px 24px;background:#dc2626;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Close Window</button>
                </div></body></html>
            `);
        }

        res.send(`
            <!DOCTYPE html><html>
            <head><title>DevForge - Salesforce Connected</title></head>
            <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;">
                <div style="text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
                    <div style="font-size:48px;margin-bottom:1rem;">✓</div>
                    <h2 style="margin:0 0 0.5rem;color:#1a1a1a;">Salesforce Connected</h2>
                    <p style="color:#666;margin:0 0 1.5rem;">You can close this window and return to DevForge.</p>
                    <button onclick="window.close()" style="padding:10px 24px;background:#00a1e0;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Close Window</button>
                </div>
                <script>setTimeout(() => window.close(), 3000);</script>
            </body></html>
        `);
    }

    @Get("status")
    status() { return this.sf.status(); }

    @Get("accounts")
    accounts() { return this.sf.getAccounts(); }

    @Delete("accounts/:id")
    disconnect(@Param("id", ParseIntPipe) id: number) {
        return this.sf.disconnectAccount(id);
    }

    @Get("sobjects")
    sobjects(@Query("accountId") accountId?: string) {
        return this.sf.sobjects(accountId ? parseInt(accountId, 10) : undefined);
    }

    @Get("query")
    query(@Query("soql") soql: string, @Query("accountId") accountId?: string) {
        return this.sf.query(soql, accountId ? parseInt(accountId, 10) : undefined);
    }

    @Get("tooling/query")
    toolingQuery(@Query("soql") soql: string, @Query("accountId") accountId?: string) {
        return this.sf.toolingQuery(soql, accountId ? parseInt(accountId, 10) : undefined);
    }

    @Get("apex-classes")
    apexClasses(@Query("accountId") accountId?: string) {
        return this.sf.apexClasses(accountId ? parseInt(accountId, 10) : undefined);
    }

    @Get("custom-objects")
    customObjects(@Query("accountId") accountId?: string) {
        return this.sf.customObjects(accountId ? parseInt(accountId, 10) : undefined);
    }

    @Get("flows")
    flows(@Query("accountId") accountId?: string) {
        return this.sf.flows(accountId ? parseInt(accountId, 10) : undefined);
    }
}