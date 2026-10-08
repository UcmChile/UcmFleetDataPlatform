-- Organización Traumasoft: divisiones, distritos, grupos, centros de costo, estaciones
IF OBJECT_ID('dbo.divisions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.divisions (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    external_id INT NOT NULL,
    name NVARCHAR(150) NOT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_divisions_active DEFAULT 1,
    synced_at DATETIME2 NULL,
    CONSTRAINT UQ_divisions_external_id UNIQUE (external_id)
  );
END
GO

IF OBJECT_ID('dbo.districts', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.districts (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    external_id INT NOT NULL,
    name NVARCHAR(150) NOT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_districts_active DEFAULT 1,
    synced_at DATETIME2 NULL,
    CONSTRAINT UQ_districts_external_id UNIQUE (external_id)
  );
END
GO

IF OBJECT_ID('dbo.org_groups', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.org_groups (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    external_id INT NOT NULL,
    name NVARCHAR(150) NOT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_org_groups_active DEFAULT 1,
    synced_at DATETIME2 NULL,
    CONSTRAINT UQ_org_groups_external_id UNIQUE (external_id)
  );
END
GO

IF OBJECT_ID('dbo.cost_centers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.cost_centers (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    external_id INT NOT NULL,
    name NVARCHAR(150) NOT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_cost_centers_active DEFAULT 1,
    synced_at DATETIME2 NULL,
    CONSTRAINT UQ_cost_centers_external_id UNIQUE (external_id)
  );
END
GO

IF OBJECT_ID('dbo.stations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.stations (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    external_id INT NOT NULL,
    name NVARCHAR(150) NOT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_stations_active DEFAULT 1,
    synced_at DATETIME2 NULL,
    CONSTRAINT UQ_stations_external_id UNIQUE (external_id)
  );
END
GO

IF COL_LENGTH('dbo.vehicles', 'division_id') IS NULL
  ALTER TABLE dbo.vehicles ADD division_id INT NULL;
GO

IF COL_LENGTH('dbo.vehicles', 'district_id') IS NULL
  ALTER TABLE dbo.vehicles ADD district_id INT NULL;
GO

IF COL_LENGTH('dbo.vehicles', 'group_id') IS NULL
  ALTER TABLE dbo.vehicles ADD group_id INT NULL;
GO

IF COL_LENGTH('dbo.vehicles', 'cost_center_id') IS NULL
  ALTER TABLE dbo.vehicles ADD cost_center_id INT NULL;
GO

IF COL_LENGTH('dbo.vehicles', 'station_id') IS NULL
  ALTER TABLE dbo.vehicles ADD station_id INT NULL;
GO

IF COL_LENGTH('dbo.vehicles', 'traumasoft_vehicle_id') IS NULL
  ALTER TABLE dbo.vehicles ADD traumasoft_vehicle_id INT NULL;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = 'uq_vehicles_traumasoft' AND object_id = OBJECT_ID('dbo.vehicles')
)
BEGIN
  CREATE UNIQUE INDEX uq_vehicles_traumasoft
    ON dbo.vehicles(traumasoft_vehicle_id)
    WHERE traumasoft_vehicle_id IS NOT NULL;
END
GO
