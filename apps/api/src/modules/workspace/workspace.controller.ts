/* eslint-disable prettier/prettier */
// apps/api/src/modules/workspace/workspace.controller.ts
import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, ParseIntPipe, Query
} from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import type {
    CreateWorkspaceDto,
    UpdateWorkspaceDto
} from "./workspace.dto";


@Controller("workspace")
export class WorkspaceController {
    constructor(private ws: WorkspaceService) { }

    @Get()
    list() { return this.ws.list(); }

    @Get(":id")
    get(@Param("id", ParseIntPipe) id: number) {
        return this.ws.get(id);
    }

    @Post()
    create(@Body() dto: CreateWorkspaceDto) {
        return this.ws.create(dto);
    }

    @Patch(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() dto: UpdateWorkspaceDto,
    ) {
        return this.ws.update(id, dto);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.ws.delete(id);
    }
}