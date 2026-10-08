-- Kilometraje / GPS / reconciliacion
IF OBJECT_ID('dbo.gps_minute_pings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.gps_minute_pings (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    ts DATETIMEOFFSET NOT NULL,
    odometer_km DECIMAL(12, 3) NULL,
    latitude DECIMAL(9, 6) NULL,
    longitude DECIMAL(9, 6) NULL,
    speed_kmh SMALLINT NULL,
    ignition_on BIT NULL,
    CONSTRAINT UQ_gps_minute_pings_vehicle_ts UNIQUE (vehicle_id, ts),
    CONSTRAINT FK_gps_minute_pings_vehicle FOREIGN KEY (vehicle_id) REFERENCES dbo.vehicles(id)
  );
END
GO

IF OBJECT_ID('dbo.gps_daily_km', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.gps_daily_km (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    reading_date DATE NOT NULL,
    km_raw DECIMAL(12, 3) NULL,
    first_odometer_km DECIMAL(12, 3) NULL,
    last_odometer_km DECIMAL(12, 3) NULL,
    ping_count INT NULL,
    has_anomaly BIT NOT NULL CONSTRAINT DF_gps_daily_km_anomaly DEFAULT 0,
    is_consistent BIT NOT NULL CONSTRAINT DF_gps_daily_km_is_consistent DEFAULT 0,
    CONSTRAINT UQ_gps_daily_km_vehicle_date UNIQUE (vehicle_id, reading_date),
    CONSTRAINT FK_gps_daily_km_vehicle FOREIGN KEY (vehicle_id) REFERENCES dbo.vehicles(id)
  );
END
GO

IF OBJECT_ID('dbo.physical_readings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.physical_readings (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    recorded_by_person_id BIGINT NULL,
    reading_date DATE NOT NULL,
    odometer_km INT NOT NULL,
    status NVARCHAR(40) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_physical_readings_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_physical_readings_vehicle FOREIGN KEY (vehicle_id) REFERENCES dbo.vehicles(id),
    CONSTRAINT FK_physical_readings_person FOREIGN KEY (recorded_by_person_id) REFERENCES dbo.persons(id)
  );
END
GO

IF OBJECT_ID('dbo.reconciliation_periods', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.reconciliation_periods (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    start_reading_id BIGINT NULL,
    end_reading_id BIGINT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    gps_total_km DECIMAL(12, 3) NULL,
    correction_factor DECIMAL(12, 6) NULL,
    status NVARCHAR(40) NULL,
    CONSTRAINT FK_reconciliation_periods_vehicle FOREIGN KEY (vehicle_id) REFERENCES dbo.vehicles(id),
    CONSTRAINT FK_reconciliation_periods_start FOREIGN KEY (start_reading_id) REFERENCES dbo.physical_readings(id),
    CONSTRAINT FK_reconciliation_periods_end FOREIGN KEY (end_reading_id) REFERENCES dbo.physical_readings(id)
  );
END
GO

IF OBJECT_ID('dbo.odometer_daily', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.odometer_daily (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    reading_date DATE NOT NULL,
    km_adjusted DECIMAL(12, 3) NULL,
    odometer_eod DECIMAL(12, 3) NULL,
    period_id BIGINT NULL,
    is_final BIT NOT NULL CONSTRAINT DF_odometer_daily_final DEFAULT 0,
    CONSTRAINT FK_odometer_daily_vehicle FOREIGN KEY (vehicle_id) REFERENCES dbo.vehicles(id),
    CONSTRAINT FK_odometer_daily_period FOREIGN KEY (period_id) REFERENCES dbo.reconciliation_periods(id)
  );
END
GO
