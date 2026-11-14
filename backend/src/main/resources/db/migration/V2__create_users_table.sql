CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_email_canonical CHECK (
        email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254
    ),
    CONSTRAINT ck_users_display_name CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80),
    CONSTRAINT ck_users_role CHECK (role IN ('ROLE_USER', 'ROLE_ADMIN'))
);
