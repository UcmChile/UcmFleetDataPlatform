-- Alinear path de auth con colección Postman WT-UCM
UPDATE dbo.wisetrack_api_config
SET auth_path = N'/ucm/v1/auth/getToken',
    updated_at = SYSUTCDATETIME()
WHERE auth_path IN (N'/login', N'login', N'/auth/login', N'/api/auth/login');
GO
