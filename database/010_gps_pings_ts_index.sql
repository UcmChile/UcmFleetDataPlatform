-- Índice por timestamp para rangos/dashboard (tabla ~millones de filas).
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'ix_gps_minute_pings_ts'
    AND object_id = OBJECT_ID('dbo.gps_minute_pings')
)
BEGIN
  CREATE INDEX ix_gps_minute_pings_ts
    ON dbo.gps_minute_pings (ts)
    INCLUDE (vehicle_id);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'ix_wisetrack_log_period_status'
    AND object_id = OBJECT_ID('dbo.wisetrack_ingestion_log')
)
BEGIN
  CREATE INDEX ix_wisetrack_log_period_status
    ON dbo.wisetrack_ingestion_log (period_from, period_to, status)
    INCLUDE (n_pings_received, n_pings_inserted, n_pings_rejected, batch_id);
END
GO
