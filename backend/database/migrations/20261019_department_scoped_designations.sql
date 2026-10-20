-- edited by wali: Add department ownership and scope designation codes to their department.
ALTER TABLE designations
  ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER company_id,
  ADD KEY ix_designation_department (department_id),
  ADD CONSTRAINT fk_designation_department
    FOREIGN KEY (department_id)
    REFERENCES departments (department_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE designations
  DROP INDEX uq_company_designation_code,
  ADD UNIQUE KEY uq_department_designation_code
    (company_id, department_id, designation_code);

-- edited by wali: Preserve existing scope only when all linked records agree.
-- Unassigned and ambiguous designations remain NULL for manual assignment.
-- Backfill only when all linked positions and active employee assignments agree.
-- Ambiguous designations remain unassigned for manual cleanup.
UPDATE designations d
JOIN (
  SELECT designation_id, MIN(department_id) AS department_id
  FROM (
    SELECT designation_id, department_id
    FROM positions
    WHERE designation_id IS NOT NULL
      AND department_id IS NOT NULL

    UNION ALL

    SELECT ea.designation_id, ea.department_id
    FROM employee_assignments ea
    INNER JOIN employees e
      ON e.employee_id = ea.employee_id
    WHERE ea.designation_id IS NOT NULL
      AND ea.department_id IS NOT NULL
      AND ea.is_current = 1
      AND e.is_active = 1
      AND e.deleted_at IS NULL
  ) assignments
  GROUP BY designation_id
  HAVING COUNT(DISTINCT department_id) = 1
) p ON p.designation_id = d.designation_id
SET d.department_id = p.department_id
WHERE d.department_id IS NULL;
