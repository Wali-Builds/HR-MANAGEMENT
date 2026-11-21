INSERT INTO permissions (
    permission_code,
    module_name,
    action_name,
    description
)
VALUES (
    'DEPARTMENT_ADMIN',
    'Access Control',
    'Department administrator',
    'Department administrator permissions'
)
ON DUPLICATE KEY UPDATE
    module_name = VALUES(module_name),
    action_name = VALUES(action_name),
    description = VALUES(description);
