/* eslint-disable prettier/prettier */
import { Module }           from "@nestjs/common";
import { GithubService }    from "./github.service";
import { GithubController } from "./github.controller";
import { DatabaseModule }   from "../../core/database/database.module";

@Module({
    imports    : [DatabaseModule],
    providers  : [GithubService],
    controllers: [GithubController],
    exports    : [GithubService],
})
export class GithubModule { }