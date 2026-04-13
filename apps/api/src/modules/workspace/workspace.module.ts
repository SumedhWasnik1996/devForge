import { Module }              from "@nestjs/common";
import { WorkspaceService }    from "./workspace.service";
import { WorkspaceController } from "./workspace.controller";
import { DatabaseModule }      from "../../core/database/database.module";

@Module({
    imports:     [DatabaseModule],
    providers:   [WorkspaceService],
    controllers: [WorkspaceController],
})
export class WorkspaceModule {}
