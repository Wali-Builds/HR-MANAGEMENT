-- edited by wali: Add company-scoped roles while preserving global system roles.
-- One-time migration for databases using the original roles table from hr_management.sql.
-- Back up the database first. Do not run on a database where these changes are already applied.
-- Existing roles remain global because the new company_id column defaults to NULL.

ALTER TABLE `roles`
  ADD COLUMN `company_id` bigint(20) unsigned DEFAULT NULL AFTER `role_id`;

ALTER TABLE `roles`
  ADD INDEX `ix_roles_company_id` (`company_id`);

ALTER TABLE `roles`
  ADD COLUMN `role_scope_id` bigint(20) unsigned
    GENERATED ALWAYS AS (IFNULL(`company_id`, 0)) STORED AFTER `company_id`;

ALTER TABLE `roles`
  DROP INDEX `uq_role_code`,
  ADD UNIQUE KEY `uq_role_scope_code` (`role_scope_id`, `role_code`);

-- Restrictive actions are required because role_scope_id is generated from company_id.
ALTER TABLE `roles`
  ADD CONSTRAINT `fk_roles_company`
    FOREIGN KEY (`company_id`)
    REFERENCES `companies` (`company_id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT;