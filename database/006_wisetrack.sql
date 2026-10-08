-- Extensiones Wisetrack (ingesta GPS)
IF OBJECT_ID('dbo.wisetrack_ingestion_log', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.wisetrack_ingestion_log (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    batch_id NVARCHAR(64) NOT NULL,
    started_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_wisetrack_log_started DEFAULT SYSDATETIMEOFFSET(),
    completed_at DATETIMEOFFSET NULL,
    period_from DATETIMEOFFSET NOT NULL,
    period_to DATETIMEOFFSET NOT NULL,
    n_vehicles_expected INT NULL,
    n_vehicles_reporting INT NULL,
    n_pings_received BIGINT NULL,
    n_pings_inserted BIGINT NULL,
    n_pings_duplicated BIGINT NULL,
    n_pings_rejected BIGINT NULL,
    status NVARCHAR(20) NOT NULL,
    error_details NVARCHAR(MAX) NULL,
    CONSTRAINT CK_wisetrack_log_status CHECK (status IN ('running', 'success', 'partial', 'failed'))
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = 'idx_wisetrack_log_period' AND object_id = OBJECT_ID('dbo.wisetrack_ingestion_log')
)
BEGIN
  CREATE INDEX idx_wisetrack_log_period
    ON dbo.wisetrack_ingestion_log(period_from, period_to);
END
GO

IF OBJECT_ID('dbo.wisetrack_rejected_pings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.wisetrack_rejected_pings (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    batch_id NVARCHAR(64) NULL,
    wisetrack_vehicle_id NVARCHAR(50) NULL,
    plate NVARCHAR(20) NULL,
    ping_ts DATETIMEOFFSET NULL,
    reason NVARCHAR(255) NOT NULL,
    raw_payload NVARCHAR(MAX) NULL,
    ingested_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_wisetrack_rejected_at DEFAULT SYSDATETIMEOFFSET()
  );
END
GO
