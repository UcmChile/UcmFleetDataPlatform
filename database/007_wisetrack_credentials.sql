-- Credenciales API Wisetrack + historial de tokens
IF OBJECT_ID('dbo.wisetrack_api_config', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.wisetrack_api_config (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    name NVARCHAR(80) NOT NULL CONSTRAINT DF_wisetrack_api_config_name DEFAULT N'default',
    base_url NVARCHAR(255) NOT NULL,
    auth_path NVARCHAR(120) NOT NULL CONSTRAINT DF_wisetrack_api_config_auth DEFAULT N'/login',
    username NVARCHAR(150) NOT NULL,
    password_enc NVARCHAR(MAX) NOT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_wisetrack_api_config_active DEFAULT 1,
    last_auth_at DATETIMEOFFSET NULL,
    last_auth_status NVARCHAR(40) NULL,
    last_auth_error NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_wisetrack_api_config_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    CONSTRAINT UQ_wisetrack_api_config_name UNIQUE (name)
  );
END
GO

IF OBJECT_ID('dbo.wisetrack_api_tokens', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.wisetrack_api_tokens (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    config_id BIGINT NOT NULL,
    access_token NVARCHAR(MAX) NOT NULL,
    token_type NVARCHAR(40) NULL,
    expires_at DATETIMEOFFSET NULL,
    obtained_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_wisetrack_api_tokens_obtained DEFAULT SYSDATETIMEOFFSET(),
    is_active BIT NOT NULL CONSTRAINT DF_wisetrack_api_tokens_active DEFAULT 1,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_wisetrack_api_tokens_status DEFAULT N'active',
    source NVARCHAR(40) NOT NULL CONSTRAINT DF_wisetrack_api_tokens_source DEFAULT N'login',
    notes NVARCHAR(255) NULL,
    CONSTRAINT FK_wisetrack_api_tokens_config FOREIGN KEY (config_id) REFERENCES dbo.wisetrack_api_config(id),
    CONSTRAINT CK_wisetrack_api_tokens_status CHECK (status IN ('active', 'expired', 'revoked', 'replaced'))
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = 'idx_wisetrack_api_tokens_active' AND object_id = OBJECT_ID('dbo.wisetrack_api_tokens')
)
BEGIN
  CREATE INDEX idx_wisetrack_api_tokens_active
    ON dbo.wisetrack_api_tokens(config_id, is_active, obtained_at DESC);
END
GO
