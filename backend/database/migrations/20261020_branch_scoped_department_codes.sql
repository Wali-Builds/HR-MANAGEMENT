-- Department codes may repeat in separate branches of the same company.
-- edited by wali: Allow department code reuse in different branches of one company.
ALTER TABLE departments
  DROP INDEX uq_company_department_code,
  ADD UNIQUE KEY uq_company_branch_department_code
    (company_id, branch_id, department_code);
