import { Module }         from "@nestjs/common";
import { JiraService }    from "./jira.service";
import { JiraController } from "./jira.controller";
import { DatabaseModule } from "../../core/database/database.module";

@Module({
    imports:     [DatabaseModule],
    providers:   [JiraService],
    controllers: [JiraController],
})
export class JiraModule {}
