-- Primer/último odómetro del día + consistencia km_raw vs (último − primer).
IF COL_LENGTH('dbo.gps_daily_km', 'first_odometer_km') IS NULL
BEGIN
  ALTER TABLE dbo.gps_daily_km ADD first_odometer_km DECIMAL(12, 3) NULL;
END
GO

IF COL_LENGTH('dbo.gps_daily_km', 'last_odometer_km') IS NULL
BEGIN
  ALTER TABLE dbo.gps_daily_km ADD last_odometer_km DECIMAL(12, 3) NULL;
END
GO

IF COL_LENGTH('dbo.gps_daily_km', 'is_consistent') IS NULL
BEGIN
  ALTER TABLE dbo.gps_daily_km ADD is_consistent BIT NOT NULL
    CONSTRAINT DF_gps_daily_km_is_consistent DEFAULT 0;
END
GO
