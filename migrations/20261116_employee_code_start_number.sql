ALTER TABLE companies
  ADD COLUMN employee_code_start_number BIGINT UNSIGNED NOT NULL DEFAULT 1
  AFTER employee_code_prefix;
