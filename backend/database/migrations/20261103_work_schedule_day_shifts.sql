-- added by wali: Store references to reusable shifts on each weekday in a work schedule.
ALTER TABLE work_schedule_days
    ADD COLUMN shift_id BIGINT UNSIGNED NULL AFTER is_working_day,
    ADD INDEX idx_work_schedule_days_shift_id (shift_id);

-- added by wali: Let employee assignments point to a schedule without requiring a redundant standalone shift.
ALTER TABLE employee_shift_assignments
    MODIFY COLUMN shift_id BIGINT UNSIGNED NULL;
