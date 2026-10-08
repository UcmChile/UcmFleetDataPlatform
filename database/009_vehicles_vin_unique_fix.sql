-- SQL Server UNIQUE trata NULL como valor: solo un VIN nulo era posible.
-- Sustituir por índice único filtrado (mismo patrón que wisetrack_vehicle_id).
IF EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE name = 'UQ_vehicles_vin'
    AND parent_object_id = OBJECT_ID('dbo.vehicles')
)
BEGIN
  ALTER TABLE dbo.vehicles DROP CONSTRAINT UQ_vehicles_vin;
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
