import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Action } from "../enums/action.enum";
import { ActionModule } from "../enums/action-module.enum";

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({
  collection: "audit_logs",
  timestamps: true,
})
export class AuditLog {
  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true })
  action: Action;

  @Prop({ required: true })
  module: ActionModule;

  @Prop({ type: Object, default: {} })
  payload: Record<string, unknown>;

  @Prop({ default: "" })
  description: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
