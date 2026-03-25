export interface JiraConfig {
  baseUrl: string;
  username?: string;      // 用户名（用于生成 Token）
  password?: string;      // 密码（用于生成 Token）
  apiToken?: string;      // 可选的 API Token（如果没有，则动态生成）
  timeout?: number;
}

export interface JiraUser {
  self?: string;           // 可选
  accountId: string;
  displayName: string;
  name?: string;           // 添加name属性
  emailAddress?: string;   // 可选
  active?: boolean;        // 可选
  timeZone?: string;       // 可选
  locale?: string;         // 可选
  avatarUrls?: {
    '16x16'?: string;
    '24x24'?: string;
    '32x32'?: string;
    '48x48'?: string;
  };
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    project: JiraProject;
    issuetype: {
      name: string;
      description?: string;
    };
    status: {
      name: string;
      description?: string;
    };
    priority?: {
      name: string;
    };
    assignee?: JiraUser;
    reporter?: JiraUser;
    created: string;
    updated: string;
    [key: string]: any;
  };
}

export interface JiraSearchResult {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraProject {
  self: string;
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  lead: JiraUser;
  avatarUrls?: {
    '16x16'?: string;
    '24x24'?: string;
    '32x32'?: string;
    '48x48'?: string;
  };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
  };
}

export interface JiraComment {
  self: string;
  id: string;
  author: JiraUser;
  body: string;
  created: string;
  updated: string;
}

export interface JiraCreateIssuePayload {
  fields: {
    project: {
      key: string;
    };
    summary: string;
    description?: string;
    issuetype: {
      name: string;
    };
    [key: string]: any;
  };
}

export interface JiraUpdateIssuePayload {
  fields?: {
    [key: string]: any;
  };
  update?: {
    [key: string]: any[];
  };
}

export interface JiraApiToken {
  id: string;
  name: string;
  token: string;
  created: string;
  expirationDate?: string;
  lastAccess?: string;
}

export interface JiraHeaders {
  Accept: string;
  'Content-Type': string;
  Authorization?: string;
  [key: string]: string | undefined;
}

export interface JiraGroup {
  name: string;
  self?: string;
  users?: {
    size: number;
    items: JiraUser[];
  };
  expand?: string;
}



export interface GroupMembership {
  name: string;
  self: string;
}

export interface AddUserToGroupResult {
  name: string;
  added: boolean;
  user: Partial<JiraUser>;  // 使用Partial使所有属性可选
}

export interface RemoveUserFromGroupResult {
  name: string;
  removed: boolean;
  user?: Partial<JiraUser>; // 可选
}

export enum JiraIssueType {
  Bug = 'Bug',
  Task = 'Task',
  Story = 'Story',
  Epic = 'Epic',
  Subtask = 'Sub-task',
  Custom = 'Custom' 
}