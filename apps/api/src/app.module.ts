/* eslint-disable prettier/prettier */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./core/database/database.module";
import { JiraModule } from "./modules/jira/jira.module";
import { WorkspaceModule } from "./modules/workspace/workspace.module";
import { GithubModule } from "./modules/github/github.module";
import { SalesforceModule } from "./modules/salesforce/salesforce.module";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        JiraModule,
        WorkspaceModule,
        GithubModule,
        SalesforceModule,
    ],
})
export class AppModule { }