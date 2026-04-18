/* eslint-disable prettier/prettier */
import { Module } from "@nestjs/common";
import { SalesforceService } from "./salesforce.service";
import { SalesforceController } from "./salesforce.controller";
import { DatabaseModule } from "../../core/database/database.module";

@Module({
    imports: [DatabaseModule],
    providers: [SalesforceService],
    controllers: [SalesforceController],
    exports: [SalesforceService],
})
export class SalesforceModule { }