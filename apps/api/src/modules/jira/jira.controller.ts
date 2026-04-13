import { Controller, Get, Query, Res, Param } from "@nestjs/common";
import { JiraService } from "./jira.service";
import { authUrl }     from "./jira.oauth";

@Controller("jira")
export class JiraController {
    constructor(private jira: JiraService) {}

    @Get("oauth/start")
    start(@Res({ passthrough: true }) res) {
        res.redirect(authUrl(
            process.env.ATLASSIAN_CLIENT_ID!,
            process.env.ATLASSIAN_REDIRECT_URI!,
        ));
    }

    @Get("oauth/callback")
    async cb(@Query("code") code: string, @Res({ passthrough: true }) res) {
        await this.jira.exchange(code);
        res.send("Connected. Close this window.");
    }

    @Get("status")
    status() {
        return this.jira.status();
    }

    @Get("stories")
    stories() {
        return this.jira.stories();
    }

    @Get("stories/:key")
    story(@Param("key") key: string) {
        return this.jira.story(key);
    }
}
