/* eslint-disable prettier/prettier */
import { Controller, Get, Delete, Query, Res, Param, ParseIntPipe } from "@nestjs/common";
import { GithubService } from "./github.service";
import { githubAuthUrl } from "./github.oauth";

@Controller("github")
export class GithubController {
    constructor(private github: GithubService) { }

    @Get("oauth/start")
    start(@Res({ passthrough: true }) res) {
        res.redirect(githubAuthUrl(
            process.env.GITHUB_CLIENT_ID!,
            process.env.GITHUB_REDIRECT_URI!,
        ));
    }

    @Get("oauth/callback")
    async cb(@Query("code") code: string, @Res() res) {
        await this.github.exchange(code);
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>DevForge - GitHub Connected</title></head>
            <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;">
                <div style="text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
                    <div style="font-size:48px;margin-bottom:1rem;">✓</div>
                    <h2 style="margin:0 0 0.5rem;color:#1a1a1a;">GitHub Account Connected</h2>
                    <p style="color:#666;margin:0 0 1.5rem;">You can close this window and return to DevForge.</p>
                    <button onclick="window.close()" style="padding:10px 24px;background:#24292f;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">
                        Close Window
                    </button>
                </div>
                <script>setTimeout(() => window.close(), 3000);</script>
            </body>
            </html>
        `);
    }

    @Get("status")
    status() {
        return this.github.status();
    }

    @Get("accounts")
    accounts() {
        return this.github.getAccounts();
    }

    @Delete("accounts/:id")
    disconnect(@Param("id", ParseIntPipe) id: number) {
        return this.github.disconnectAccount(id);
    }

    @Get("repos")
    repos(
        @Query("accountId") accountId?: string,
        @Query("page") page?: string,
        @Query("perPage") perPage?: string,
    ) {
        return this.github.repos(
            accountId ? parseInt(accountId, 10) : undefined,
            page ? parseInt(page, 10) : 1,
            perPage ? parseInt(perPage, 10) : 30,
        );
    }
}