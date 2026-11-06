-- added by wali: Persist an employee-month close independently from its daily attendance rows.
CREATE TABLE attendance_month_finalizations (
    month_finalization_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    attendance_month CHAR(7) NOT NULL,
    records_finalized_count INT UNSIGNED NOT NULL DEFAULT 0,
    finalized_by_user_id BIGINT UNSIGNED NOT NULL,
    finalized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(2000) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (month_finalization_id),
    UNIQUE KEY uq_attendance_month_finalization (company_id, employee_id, attendance_month),
    KEY idx_attendance_month_finalization_month (company_id, attendance_month),
    KEY idx_attendance_month_finalization_employee (employee_id, attendance_month)
);
