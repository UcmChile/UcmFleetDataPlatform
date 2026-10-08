-- Combustible
IF OBJECT_ID('dbo.fuel_cards', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fuel_cards (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    card_number NVARCHAR(50) NOT NULL,
    valid_from DATE NULL,
    valid_to DATE NULL,
    CONSTRAINT FK_fuel_cards_vehicle FOREIGN KEY (vehicle_id) REFERENCES dbo.vehicles(id)
  );
END
GO

IF OBJECT_ID('dbo.fuel_stations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fuel_stations (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    comuna NVARCHAR(80) NULL,
    direccion NVARCHAR(255) NULL,
    region NVARCHAR(80) NULL
  );
END
GO

IF OBJECT_ID('dbo.fuel_transactions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fuel_transactions (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    card_id BIGINT NULL,
    station_id BIGINT NULL,
    driver_person_id BIGINT NULL,
    transaction_ts DATETIMEOFFSET NOT NULL,
    comprobante NVARCHAR(80) NULL,
    product NVARCHAR(80) NULL,
    volume_liters DECIMAL(12, 3) NULL,
    total_amount DECIMAL(14, 2) NULL,
    odometer_raw INT NULL,
    odometer_clean INT NULL,
    discarded BIT NOT NULL CONSTRAINT DF_fuel_transactions_discarded DEFAULT 0,
    CONSTRAINT UQ_fuel_transactions_comprobante UNIQUE (comprobante),
    CONSTRAINT FK_fuel_transactions_vehicle FOREIGN KEY (vehicle_id) REFERENCES dbo.vehicles(id),
    CONSTRAINT FK_fuel_transactions_card FOREIGN KEY (card_id) REFERENCES dbo.fuel_cards(id),
    CONSTRAINT FK_fuel_transactions_station FOREIGN KEY (station_id) REFERENCES dbo.fuel_stations(id),
    CONSTRAINT FK_fuel_transactions_driver FOREIGN KEY (driver_person_id) REFERENCES dbo.persons(id)
  );
END
GO
