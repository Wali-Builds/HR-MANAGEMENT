-- Position codes are unique within a department, allowing reuse elsewhere.
-- edited by wali: Allow position code reuse in different departments.
ALTER TABLE positions
  DROP INDEX uq_position_code,
  ADD UNIQUE KEY uq_position_code
    (company_id, department_id, position_code);
