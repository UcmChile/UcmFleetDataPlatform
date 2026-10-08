-- Auth mínima UCM Fleet
IF OBJECT_ID('dbo.fleet_schema_migrations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fleet_schema_migrations (
    id_migration BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    checksum CHAR(64) NULL,
    applied_at DATETIME2 NOT NULL CONSTRAINT DF_fleet_schema_migrations_applied DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_fleet_schema_migrations_filename UNIQUE (filename)
  );
END
GO

IF OBJECT_ID('dbo.fleet_users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fleet_users (
    id_usuario BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    username NVARCHAR(80) NOT NULL,
    nombre NVARCHAR(150) NOT NULL,
    email NVARCHAR(150) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    is_owner BIT NOT NULL CONSTRAINT DF_fleet_users_owner DEFAULT 0,
    activo BIT NOT NULL CONSTRAINT DF_fleet_users_activo DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_fleet_users_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    CONSTRAINT UQ_fleet_users_username UNIQUE (username),
    CONSTRAINT UQ_fleet_users_email UNIQUE (email)
  );
END
GO

IF OBJECT_ID('dbo.fleet_roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fleet_roles (
    id_rol BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre NVARCHAR(80) NOT NULL,
    descripcion NVARCHAR(255) NULL,
    CONSTRAINT UQ_fleet_roles_nombre UNIQUE (nombre)
  );
END
GO

IF OBJECT_ID('dbo.fleet_user_roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fleet_user_roles (
    id_usuario BIGINT NOT NULL,
    id_rol BIGINT NOT NULL,
    CONSTRAINT PK_fleet_user_roles PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT FK_fleet_user_roles_user FOREIGN KEY (id_usuario) REFERENCES dbo.fleet_users(id_usuario),
    CONSTRAINT FK_fleet_user_roles_rol FOREIGN KEY (id_rol) REFERENCES dbo.fleet_roles(id_rol)
  );
END
GO
