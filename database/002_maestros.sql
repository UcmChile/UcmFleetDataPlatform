-- Maestros: vehicles, persons
IF OBJECT_ID('dbo.vehicles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.vehicles (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vehicle_number NVARCHAR(50) NOT NULL,
    plate NVARCHAR(20) NOT NULL,
    vin NVARCHAR(50) NULL,
    make NVARCHAR(80) NULL,
    model NVARCHAR(80) NULL,
    status NVARCHAR(40) NULL,
    initial_odometer INT NULL,
    wisetrack_vehicle_id NVARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_vehicles_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    CONSTRAINT UQ_vehicles_vehicle_number UNIQUE (vehicle_number),
    CONSTRAINT UQ_vehicles_plate UNIQUE (plate)
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = 'uq_vehicles_wisetrack' AND object_id = OBJECT_ID('dbo.vehicles')
)
BEGIN
  CREATE UNIQUE INDEX uq_vehicles_wisetrack
    ON dbo.vehicles(wisetrack_vehicle_id)
    WHERE wisetrack_vehicle_id IS NOT NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = 'uq_vehicles_vin' AND object_id = OBJECT_ID('dbo.vehicles')
)
BEGIN
  CREATE UNIQUE INDEX uq_vehicles_vin
    ON dbo.vehicles(vin)
    WHERE vin IS NOT NULL;
END
GO

IF OBJECT_ID('dbo.persons', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.persons (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    rut NVARCHAR(20) NOT NULL,
    name NVARCHAR(150) NOT NULL,
    category NVARCHAR(80) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_persons_active DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_persons_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    CONSTRAINT UQ_persons_rut UNIQUE (rut)
  );
END
GO
