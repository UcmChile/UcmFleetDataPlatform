-- Ejecutar contra master (script create-database.js).
IF DB_ID(N'ucm_fleet') IS NULL
BEGIN
  CREATE DATABASE ucm_fleet;
END
GO
