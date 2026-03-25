import { BaseQuery } from "./base";

//type 是代表类型 
// | type 值 | 含义 |
// | ------------------------------- | ------------------ |
// | `0` 或`'menu'` | 普通菜单项，可点击跳转页面 |
// | `1` 或`'button'` | 操作按钮（权限控制用），不是菜单导航 |
// | `2` 或`'folder'` / `'category'` | 目录型菜单（只有子菜单，没有页面）  |



export interface Menu {
    id: number;
    name: string;
    path?: string;
    icon?: string;
    parent_id?: number | null;
    sort_order?: number;
    type?: number;
    visible?: boolean;
    children?: any[]
}

export interface MenuPayload {
    id?: number;
    name?: string;
    path?: string;
    icon?: string;
    parent_id?: number | null;
    sort_order?: number;
    type?: number;
    visible?: boolean;
}

export interface MenuQueryPayload extends BaseQuery {
    name?: string;
    path?: string;
    icon?: string;
    parent_id?: number | null;
    sort_order?: number;
    type?: number;
    visible?: boolean;
}

export interface FrontendMenuItem {
    key: string;
    label: string;
    path?: string;
    icon?: string;
}

export interface FrontendMenuGroup {
    title: string;
    menu: FrontendMenuItem[];
}
