import { BaseQuery } from "./base";

export interface CommentQueryPayload extends BaseQuery {
    issueIdOrKey: string;
}

export interface CommentPayload {
    issueIdOrKey: string;
    filePaths?: string[];
    commentBody?: string;
}