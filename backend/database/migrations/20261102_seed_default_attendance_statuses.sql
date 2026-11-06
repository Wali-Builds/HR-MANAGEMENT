-- added by wali: Seed the standard statuses required for attendance records and biometric punches.
INSERT INTO attendance_statuses (
    status_code,
    status_name,
    description,
    counts_as_present,
    counts_as_absent,
    is_payable,
    is_active
)
VALUES
    ('ABSENT', 'Absent', 'No attendance was recorded for the workday.', 0, 1, 0, 1),
    ('PRESENT', 'Present', 'Attendance requirements for the workday were met.', 1, 0, 1, 1),
    ('INCOMPLETE', 'Incomplete', 'Attendance has a missing required punch.', 1, 0, 1, 1),
    ('HALF_DAY', 'Half day', 'Attendance qualifies as a half workday.', 1, 0, 1, 1)
ON DUPLICATE KEY UPDATE
    status_name = VALUES(status_name),
    description = VALUES(description),
    counts_as_present = VALUES(counts_as_present),
    counts_as_absent = VALUES(counts_as_absent),
    is_payable = VALUES(is_payable),
    is_active = VALUES(is_active);
