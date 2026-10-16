-- Link an employee's effective-dated assignment to an optional company project.
ALTER TABLE employee_assignments
    ADD COLUMN project_id BIGINT UNSIGNED NULL AFTER department_id,
    ADD INDEX idx_employee_assignments_project (project_id),
    ADD CONSTRAINT fk_employee_assignments_project
        FOREIGN KEY (project_id)
        REFERENCES projects (project_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
