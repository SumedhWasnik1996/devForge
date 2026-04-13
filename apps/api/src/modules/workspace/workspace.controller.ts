import { Controller, Post, Get, Param } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";

@Controller("workspace")
export class WorkspaceController {
    constructor(private ws: WorkspaceService) {}

    @Post(":key")
    create(@Param("key") key: string) {
        return this.ws.create(key);
    }

    @Get()
    list() {
        return this.ws.list();
    }
}
