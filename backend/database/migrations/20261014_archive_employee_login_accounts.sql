-- edited by wali: Release login identifiers for employees archived before the archive-flow update.
-- Run once in the hr_management database. This preserves user rows for history.
START TRANSACTION;

UPDATE user_sessions s
INNER JOIN users u
    ON u.user_id = s.user_id
INNER JOIN employees e
    ON e.employee_id = u.employee_id
SET s.revoked_at = CURRENT_TIMESTAMP
WHERE e.deleted_at IS NOT NULL
  AND s.revoked_at IS NULL;

UPDATE password_reset_tokens prt
INNER JOIN users u
    ON u.user_id = prt.user_id
INNER JOIN employees e
    ON e.employee_id = u.employee_id
SET prt.revoked_at = CURRENT_TIMESTAMP
WHERE e.deleted_at IS NOT NULL
  AND prt.revoked_at IS NULL
  AND prt.used_at IS NULL;

UPDATE user_roles ur
INNER JOIN users u
    ON u.user_id = ur.user_id
INNER JOIN employees e
    ON e.employee_id = u.employee_id
SET ur.is_active = 0
WHERE e.deleted_at IS NOT NULL
  AND ur.is_active = 1;

UPDATE users u
INNER JOIN employees e
    ON e.employee_id = u.employee_id
SET
    u.is_active = 0,
    u.deleted_at = COALESCE(
        u.deleted_at,
        CURRENT_TIMESTAMP
    ),
    u.username = CONCAT(
        '__archived__',
        u.user_id,
        '__',
        UUID()
    ),
    u.email = NULL
WHERE e.deleted_at IS NOT NULL
  AND (
      u.deleted_at IS NULL
      OR u.is_active <> 0
      OR u.email IS NOT NULL
      OR LEFT(u.username, 12) <> '__archived__'
  );

COMMIT;
