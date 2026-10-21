-- edited by wali: Add the Branch Admin access marker to the role permission catalog.
INSERT INTO permissions (
    permission_code,
    module_name,
    action_name,
    description
)
VALUES (
    'BRANCH_ADMIN',
    'Access Control',
    'Branch administrator',
    'Branch-scoped access to manage departments, designations, positions, employees, leave requests, approvals, and balances. Cannot archive employees or change leave configuration.'
)
ON DUPLICATE KEY UPDATE
    module_name = VALUES(module_name),
    action_name = VALUES(action_name),
    description = VALUES(description);
