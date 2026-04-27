/* eslint-disable prettier/prettier */
import { Controller, Get, Query, Res, Param, Delete, ParseIntPipe } from "@nestjs/common";
import { JiraService } from "./jira.service";
import { authUrl } from "./jira.oauth";

@Controller("jira")
export class JiraController {
    constructor(private jira: JiraService) { }

    @Get("oauth/start")
    start(@Res({ passthrough: true }) res) {
        res.redirect(authUrl(
            process.env.ATLASSIAN_CLIENT_ID!,
            process.env.ATLASSIAN_REDIRECT_URI!,
        ));
    }

    @Get("oauth/callback")
    async cb(@Query("code") code: string, @Res() res) {
        await this.jira.exchange(code);
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>DevForge - Connected</title></head>
            <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;">
                <div style="text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
                    <div style="font-size:48px;margin-bottom:1rem;">✓</div>
                    <h2 style="margin:0 0 0.5rem;color:#1a1a1a;">Jira Account Connected</h2>
                    <p style="color:#666;margin:0 0 1.5rem;">You can close this window and return to DevForge.</p>
                    <button onclick="window.close()" style="padding:10px 24px;background:#1976d2;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">
                        Close Window
                    </button>
                </div>
                <script>setTimeout(() => window.close(), 3000);</script>
            </body>
            </html>
        `);
    }

    @Get("status")
    status() { return this.jira.status(); }

    @Get("accounts")
    accounts() { return this.jira.getAccounts(); }

    @Delete("accounts/:id")
    disconnect(@Param("id", ParseIntPipe) id: number) {
        return this.jira.disconnectAccount(id);
    }

    /**
     * GET /jira/stories
     *   ?accountId=1
     *   &board=HAC2
     *   &startAt=0
     *   &maxResults=20
     *   &status=In+Progress      (optional — exact Jira status name)
     *   &priority=High           (optional — exact Jira priority name)
     */
    @Get("stories")
    stories(
        @Query("accountId") accountId?: string,
        @Query("startAt") startAt?: string,
        @Query("maxResults") maxResults?: string,
        @Query("board") board?: string,
        @Query("status") status?: string,
        @Query("priority") priority?: string,
    ) {
        return this.jira.stories(
            accountId ? parseInt(accountId, 10) : undefined,
            startAt ? parseInt(startAt, 10) : 0,
            maxResults ? parseInt(maxResults, 10) : 20,
            board ?? undefined,
            status ?? undefined,
            priority ?? undefined,
        );
    }

    @Get("stories/:key")
    story(
        @Param("key") key: string,
        @Query("accountId") accountId?: string,
    ) {
        return this.jira.story(key, accountId ? parseInt(accountId, 10) : undefined);
    }

    /**
     * GET /jira/metrics?board=HAC2&accountId=1
     */
    @Get("metrics")
    metrics(
        @Query("board") board: string,
        @Query("accountId") accountId?: string,
    ) {
        return this.jira.metrics(board, accountId ? parseInt(accountId, 10) : undefined);
    }

    @Get("boards/from-stories")
    boardsFromStories(@Query("accountId") accountId?: string) {
        return this.jira.boardsFromStories(
            accountId ? parseInt(accountId, 10) : undefined
        );
    }
}