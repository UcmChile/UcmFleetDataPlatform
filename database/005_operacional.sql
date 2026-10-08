-- Operacional: facilities, placeholders, shifts, runs
IF OBJECT_ID('dbo.ordering_facilities', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ordering_facilities (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    external_id INT NULL,
    name NVARCHAR(150) NOT NULL,
    type NVARCHAR(80) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_ordering_facilities_active DEFAULT 1,
    CONSTRAINT UQ_ordering_facilities_external_id UNIQUE (external_id)
  );
END
GO

IF OBJECT_ID('dbo.placeholder_patients', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.placeholder_patients (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    rut NVARCHAR(20) NULL,
    los NVARCHAR(80) NULL,
    placeholder_name NVARCHAR(150) NULL,
    is_patient_attention BIT NULL,
    is_productive_use BIT NULL,
    nature NVARCHAR(80) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_placeholder_patients_active DEFAULT 1
  );
END
GO

IF OBJECT_ID('dbo.placeholder_vehicles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.placeholder_vehicles (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    movil_number INT NOT NULL,
    purpose NVARCHAR(150) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_placeholder_vehicles_active DEFAULT 1,
    CONSTRAINT UQ_placeholder_vehicles_movil UNIQUE (movil_number)
  );
END
GO

IF OBJECT_ID('dbo.shifts', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.shifts (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    shift_id BIGINT NOT NULL,
    unit_name NVARCHAR(120) NULL,
    puesto_trabajo NVARCHAR(120) NULL,
    vehicle_category NVARCHAR(80) NULL,
    name_template NVARCHAR(150) NULL,
    CONSTRAINT UQ_shifts_shift_id UNIQUE (shift_id)
  );
END
GO

IF OBJECT_ID('dbo.shift_persons', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.shift_persons (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    shift_fk BIGINT NOT NULL,
    person_id BIGINT NOT NULL,
    date_line DATE NULL,
    start_time DATETIMEOFFSET NULL,
    end_time DATETIMEOFFSET NULL,
    start_actual DATETIMEOFFSET NULL,
    end_actual DATETIMEOFFSET NULL,
    CONSTRAINT FK_shift_persons_shift FOREIGN KEY (shift_fk) REFERENCES dbo.shifts(id),
    CONSTRAINT FK_shift_persons_person FOREIGN KEY (person_id) REFERENCES dbo.persons(id)
  );
END
GO

IF OBJECT_ID('dbo.runs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.runs (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    run_number BIGINT NOT NULL,
    ordering_facility_id BIGINT NULL,
    placeholder_patient_id BIGINT NULL,
    turno_code NVARCHAR(40) NULL,
    tipo_atencion NVARCHAR(80) NULL,
    los NVARCHAR(80) NULL,
    zona NVARCHAR(80) NULL,
    vehiculo_category NVARCHAR(80) NULL,
    business_unit NVARCHAR(80) NULL,
    is_patient_attention BIT NULL,
    is_productive_use BIT NULL,
    CONSTRAINT UQ_runs_run_number UNIQUE (run_number),
    CONSTRAINT FK_runs_facility FOREIGN KEY (ordering_facility_id) REFERENCES dbo.ordering_facilities(id),
    CONSTRAINT FK_runs_patient FOREIGN KEY (placeholder_patient_id) REFERENCES dbo.placeholder_patients(id)
  );
END
GO

IF OBJECT_ID('dbo.run_legs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.run_legs (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    run_id BIGINT NOT NULL,
    leg_id BIGINT NOT NULL,
    vehicle_id BIGINT NULL,
    placeholder_vehicle_id BIGINT NULL,
    movil_text NVARCHAR(80) NULL,
    is_third_party BIT NULL,
    last_status NVARCHAR(80) NULL,
    assigned_time DATETIMEOFFSET NULL,
    enroute_time DATETIMEOFFSET NULL,
    at_scene_time DATETIMEOFFSET NULL,
    transporting_time DATETIMEOFFSET NULL,
    at_destination_time DATETIMEOFFSET NULL,
    clear_time DATETIMEOFFSET NULL,
    CONSTRAINT UQ_run_legs_leg_id UNIQUE (leg_id),
    CONSTRAINT FK_run_legs_run FOREIGN KEY (run_id) REFERENCES dbo.runs(id),
    CONSTRAINT FK_run_legs_vehicle FOREIGN KEY (vehicle_id) REFERENCES dbo.vehicles(id),
    CONSTRAINT FK_run_legs_ph_vehicle FOREIGN KEY (placeholder_vehicle_id) REFERENCES dbo.placeholder_vehicles(id)
  );
END
GO
