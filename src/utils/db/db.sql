-- -- 菜单表
-- CREATE TABLE menus (
--     id BIGSERIAL PRIMARY KEY,
--     name VARCHAR(50) NOT NULL,
--     path VARCHAR(200) NOT NULL,       -- 前端路由
--     icon VARCHAR(50),
--     parent_id BIGINT REFERENCES menus(id) ON DELETE CASCADE,
--     sort_order INT DEFAULT 0,
--     type VARCHAR(10) DEFAULT 'MENU',  -- MENU / BUTTON
--     visible BOOLEAN DEFAULT true
-- );

-- 角色-菜单关联表（role_id 直接用 Jira Group 名）

-- CREATE TABLE role_menus (
--     role_id BIGINT NOT NULL,  -- Jira Group 名
--     menu_key VARCHAR(255),
--     PRIMARY KEY (role_id,menu_key)
-- );


-- CREATE TABLE IF NOT EXISTS roles (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL UNIQUE,
--     description TEXT,
--     created_at TIMESTAMP DEFAULT NOW()
-- );

-- 保存角色信息（同步 Jira Role）
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    jira_role_id INT NOT NULL,       -- Jira Role ID
    name TEXT NOT NULL,              -- Jira Role 名称
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 角色和菜单的关联
CREATE TABLE role_menus (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    menu_key TEXT NOT NULL,
    PRIMARY KEY(role_id, menu_key)
);

-- service_category 表
CREATE TABLE IF NOT EXISTS service_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT REFERENCES service_category(id) ON DELETE SET NULL,
    sort_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- service 表
CREATE TABLE IF NOT EXISTS service (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    service_category_id INT NOT NULL REFERENCES service_category(id) ON DELETE CASCADE,
    sort_order INT,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assignee VARCHAR(255),
    supervisor VARCHAR(255),
    is_open BOOLEAN DEFAULT FALSE
);

CREATE TABLE idc_request_permission (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID 主键
    issue_id        VARCHAR(50) NOT NULL,
    rn_event_id     VARCHAR(50) NOT NULL,
    operation_permissions TEXT NOT NULL,
    operation_steps  TEXT NOT NULL,
    request_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    permission_at   TIMESTAMP
);

CREATE TABLE sla_rule (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,  -- 自增整数主键
    name VARCHAR(255) ,
    update_by VARCHAR(255) ,
    level_id VARCHAR(50) ,                    -- 对应 levelId
    responce_time INT ,                       -- 对应 responce_time
    responce_time_unit VARCHAR(20) ,         -- 对应 responce_time_unit
    resolve_time INT ,                        -- 对应 resolve_time
    resolve_time_unit VARCHAR(20) ,          -- 对应 resolve_time_unit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_open BOOLEAN DEFAULT FALSE
);

CREATE TABLE service_fault_type (
    id SERIAL PRIMARY KEY,               -- int 自增主键 (SERIAL = int4 + sequence)
    name VARCHAR(255),
    parent_id INT REFERENCES service_fault_type(id) ON DELETE SET NULL,
    code VARCHAR(100),
    service_category_id INT,
    service_category_name VARCHAR(100)
);

-- 计费 scenario_type
CREATE TYPE scenario_type AS ENUM ('special', 'non_special', 'fill_order', 'withdraw');

CREATE TABLE issue_time_record (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  issue_id varchar(255) NOT NULL,
  scenario_type scenario_type,
  order_response_time timestamp(6),
  authorization_pass_time timestamp(6),
  collect_log_time timestamp(6),
  pbd_finish_time timestamp(6),
  rn_confirm_resolved_time timestamp(6),
  fault_start_time timestamp(6),
  fault_end_time timestamp(6),
  is_gpu_dropped varchar(255),
  server_sn varchar(255),
  is_logs_needed varchar(255),
  authorization_upload_image text,
  collect_log_upload_image text,
  rn_confirm_resolved_upload_image text,
  fault_start_time_upload_image text,
  fault_end_time_upload_image text,
  created_at timestamp(6) NOT NULL DEFAULT now(),
  updated_at timestamp(6) NOT NULL DEFAULT now()
)

CREATE TABLE down_time_record (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  issue_time_record_id uuid NOT NULL,
  server_sn varchar(255),
  event_id varchar(255),
  ticket_id varchar(255),
  order_response_time timestamp(6),
  authorization_pass_time timestamp(6),
  collect_log_time timestamp(6),
  pbd_finish_time timestamp(6),
  rn_confirm_resolved_time timestamp(6),
  fault_start_time timestamp(6),
  fault_end_time timestamp(6),
  commence_time_point timestamp(6),
  end_time_point timestamp(6),
  authorization_upload_image text,
  collect_log_upload_image text,
  rn_confirm_resolved_upload_image text,
  fault_start_time_upload_image text,
  fault_end_time_upload_image text,
  created_at timestamp(6) NOT NULL DEFAULT now(),
  updated_at timestamp(6) NOT NULL DEFAULT now()
)

CREATE TABLE sla_day (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    downtime DOUBLE PRECISION NOT NULL DEFAULT 0,
    dropped_num int,
    created_at timestamp(6) NOT NULL DEFAULT now(),
    updated_at timestamp(6) NOT NULL DEFAULT now()
);


CREATE TABLE service_fault_type_final (
    id SERIAL PRIMARY KEY,               -- int 自增主键 (SERIAL = int4 + sequence)
    name VARCHAR(255),
    parent_id INT REFERENCES service_fault_type_final(id) ON DELETE SET NULL,
    code VARCHAR(100),
    service_category_id INT,
    service_category_name VARCHAR(100)
);

CREATE TABLE issue_time_out_push_record (
    id                UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    issue_id          VARCHAR(50) NOT NULL,
    threshold_percent INT NOT NULL,               -- 70 或 100
    created_at timestamp(6) NOT NULL DEFAULT now(),
    updated_at timestamp(6) NOT NULL DEFAULT now()
);

ALTER TABLE down_time_record ADD COLUMN event_create_time timestamp(6);

ALTER TABLE down_time_record ADD COLUMN response_timestamp timestamp(6);

CREATE TABLE transceiver_cleanup_log (
    id                  UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    service_type        VARCHAR(32) NOT NULL,
    server_sn           VARCHAR(255) NOT NULL,
    operator            VARCHAR(255) NOT NULL,
    cleanup_start_at    BIGINT NOT NULL,
    result              VARCHAR(32) NOT NULL,
    note                TEXT,
    idc_ticket_id       varchar(255),
    attachment_url      TEXT,
    p2p                 jsonb,
    created_at timestamp(6) NOT NULL DEFAULT now(),
    updated_at timestamp(6) NOT NULL DEFAULT now()
);

ALTER TABLE issue_time_out_push_record ADD CONSTRAINT uk_issue_threshold UNIQUE (issue_id, threshold_percent);
