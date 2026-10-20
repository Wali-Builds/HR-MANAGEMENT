-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               12.3.2-MariaDB - MariaDB Server
-- Server OS:                    Win64
-- HeidiSQL Version:             12.17.0.7270
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for hr_management
CREATE DATABASE IF NOT EXISTS `hr_management` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `hr_management`;hr_management

-- Dumping structure for table hr_management.activity_logs
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `activity_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `module_name` varchar(80) NOT NULL,
  `action_name` varchar(80) NOT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` varchar(100) DEFAULT NULL,
  `old_values` longtext DEFAULT NULL,
  `new_values` longtext DEFAULT NULL,
  `request_method` varchar(10) DEFAULT NULL,
  `request_path` varchar(500) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`activity_log_id`),
  KEY `ix_activity_company_date` (`company_id`,`created_at`),
  KEY `ix_activity_user_date` (`user_id`,`created_at`),
  KEY `ix_activity_record` (`table_name`,`record_id`),
  KEY `ix_activity_module` (`module_name`,`action_name`),
  CONSTRAINT `fk_activity_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.announcement_receipts
CREATE TABLE IF NOT EXISTS `announcement_receipts` (
  `announcement_receipt_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `announcement_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `first_viewed_at` datetime DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL,
  `receipt_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`announcement_receipt_id`),
  UNIQUE KEY `uq_announcement_receipt` (`announcement_id`,`employee_id`),
  KEY `fk_announcement_receipt_employee` (`employee_id`),
  CONSTRAINT `fk_announcement_receipt_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`announcement_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_announcement_receipt_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.announcements
CREATE TABLE IF NOT EXISTS `announcements` (
  `announcement_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `announcement_title` varchar(250) NOT NULL,
  `announcement_body` longtext NOT NULL,
  `announcement_type` varchar(40) NOT NULL DEFAULT 'GENERAL',
  `priority_level` varchar(30) NOT NULL DEFAULT 'NORMAL',
  `publish_at` datetime DEFAULT NULL,
  `expire_at` datetime DEFAULT NULL,
  `requires_acknowledgement` tinyint(1) NOT NULL DEFAULT 0,
  `attachment_storage_path` varchar(700) DEFAULT NULL,
  `announcement_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`announcement_id`),
  KEY `fk_announcement_user` (`created_by_user_id`),
  KEY `ix_announcement_publish` (`company_id`,`announcement_status`,`publish_at`),
  CONSTRAINT `fk_announcement_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_announcement_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.api_clients
CREATE TABLE IF NOT EXISTS `api_clients` (
  `api_client_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `client_name` varchar(200) NOT NULL,
  `client_key` varchar(100) NOT NULL,
  `client_secret_hash` varchar(255) NOT NULL,
  `allowed_scopes` longtext DEFAULT NULL,
  `allowed_ip_addresses` longtext DEFAULT NULL,
  `rate_limit_per_minute` int(10) unsigned NOT NULL DEFAULT 60,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`api_client_id`),
  UNIQUE KEY `uq_api_client_key` (`client_key`),
  KEY `fk_api_client_company` (`company_id`),
  KEY `fk_api_client_user` (`created_by_user_id`),
  CONSTRAINT `fk_api_client_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_api_client_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.application_stage_history
CREATE TABLE IF NOT EXISTS `application_stage_history` (
  `application_stage_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `job_application_id` bigint(20) unsigned NOT NULL,
  `from_stage_id` bigint(20) unsigned DEFAULT NULL,
  `to_stage_id` bigint(20) unsigned NOT NULL,
  `changed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `entered_at` datetime NOT NULL DEFAULT current_timestamp(),
  `exited_at` datetime DEFAULT NULL,
  `duration_minutes` int(10) unsigned DEFAULT NULL,
  `change_reason` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`application_stage_history_id`),
  KEY `fk_stage_history_from_stage` (`from_stage_id`),
  KEY `fk_stage_history_changed_by` (`changed_by_user_id`),
  KEY `ix_stage_history_application` (`job_application_id`,`entered_at`),
  KEY `ix_stage_history_to_stage` (`to_stage_id`),
  CONSTRAINT `fk_stage_history_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_applications` (`job_application_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_stage_history_changed_by` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_stage_history_from_stage` FOREIGN KEY (`from_stage_id`) REFERENCES `recruitment_stages` (`recruitment_stage_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_stage_history_to_stage` FOREIGN KEY (`to_stage_id`) REFERENCES `recruitment_stages` (`recruitment_stage_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.asset_assignments
CREATE TABLE IF NOT EXISTS `asset_assignments` (
  `asset_assignment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `asset_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `assignment_date` date NOT NULL,
  `expected_return_date` date DEFAULT NULL,
  `actual_return_date` date DEFAULT NULL,
  `condition_at_issue` varchar(30) DEFAULT NULL,
  `condition_at_return` varchar(30) DEFAULT NULL,
  `assignment_status` varchar(30) NOT NULL DEFAULT 'ASSIGNED',
  `issue_notes` text DEFAULT NULL,
  `return_notes` text DEFAULT NULL,
  `acknowledgement_storage_path` varchar(700) DEFAULT NULL,
  `assigned_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`asset_assignment_id`),
  KEY `fk_asset_assignment_company` (`company_id`),
  KEY `fk_asset_assignment_asset` (`asset_id`),
  KEY `fk_asset_assignment_user` (`assigned_by_user_id`),
  KEY `ix_asset_assignment_employee` (`employee_id`,`assignment_status`),
  KEY `ix_asset_assignment_due` (`expected_return_date`,`assignment_status`),
  CONSTRAINT `fk_asset_assignment_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_assignment_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_assignment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_assignment_user` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.asset_categories
CREATE TABLE IF NOT EXISTS `asset_categories` (
  `asset_category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `parent_category_id` bigint(20) unsigned DEFAULT NULL,
  `category_code` varchar(50) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `useful_life_months` smallint(5) unsigned DEFAULT NULL,
  `depreciation_method` varchar(40) DEFAULT NULL,
  `requires_serial_number` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`asset_category_id`),
  UNIQUE KEY `uq_asset_category_code` (`company_id`,`category_code`),
  KEY `ix_asset_category_parent` (`parent_category_id`),
  CONSTRAINT `fk_asset_category_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_category_parent` FOREIGN KEY (`parent_category_id`) REFERENCES `asset_categories` (`asset_category_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.asset_locations
CREATE TABLE IF NOT EXISTS `asset_locations` (
  `asset_location_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `location_code` varchar(50) NOT NULL,
  `location_name` varchar(150) NOT NULL,
  `address` varchar(500) DEFAULT NULL,
  `custodian_employee_id` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`asset_location_id`),
  UNIQUE KEY `uq_asset_location_code` (`company_id`,`location_code`),
  KEY `fk_asset_location_branch` (`branch_id`),
  KEY `fk_asset_location_custodian` (`custodian_employee_id`),
  CONSTRAINT `fk_asset_location_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_location_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_location_custodian` FOREIGN KEY (`custodian_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.asset_maintenance_records
CREATE TABLE IF NOT EXISTS `asset_maintenance_records` (
  `maintenance_record_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint(20) unsigned NOT NULL,
  `maintenance_type` varchar(50) NOT NULL,
  `maintenance_date` date NOT NULL,
  `vendor_name` varchar(200) DEFAULT NULL,
  `cost_amount` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `description` text NOT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `document_storage_path` varchar(700) DEFAULT NULL,
  `recorded_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`maintenance_record_id`),
  KEY `fk_asset_maintenance_user` (`recorded_by_user_id`),
  KEY `ix_asset_maintenance_date` (`asset_id`,`maintenance_date`),
  KEY `ix_asset_next_maintenance` (`next_maintenance_date`),
  CONSTRAINT `fk_asset_maintenance_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_maintenance_user` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.assets
CREATE TABLE IF NOT EXISTS `assets` (
  `asset_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `asset_category_id` bigint(20) unsigned NOT NULL,
  `asset_location_id` bigint(20) unsigned DEFAULT NULL,
  `asset_code` varchar(60) NOT NULL,
  `asset_name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(150) DEFAULT NULL,
  `model_number` varchar(150) DEFAULT NULL,
  `serial_number` varchar(200) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_cost` decimal(18,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `warranty_expiry_date` date DEFAULT NULL,
  `condition_status` varchar(30) NOT NULL DEFAULT 'GOOD',
  `asset_status` varchar(30) NOT NULL DEFAULT 'AVAILABLE',
  `qr_code_value` varchar(255) DEFAULT NULL,
  `barcode_value` varchar(255) DEFAULT NULL,
  `invoice_storage_path` varchar(700) DEFAULT NULL,
  `photo_storage_path` varchar(700) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`asset_id`),
  UNIQUE KEY `uq_asset_code` (`company_id`,`asset_code`),
  UNIQUE KEY `uq_asset_serial` (`company_id`,`serial_number`),
  KEY `fk_asset_category` (`asset_category_id`),
  KEY `fk_asset_location` (`asset_location_id`),
  KEY `ix_asset_status` (`company_id`,`asset_status`),
  CONSTRAINT `fk_asset_category` FOREIGN KEY (`asset_category_id`) REFERENCES `asset_categories` (`asset_category_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_location` FOREIGN KEY (`asset_location_id`) REFERENCES `asset_locations` (`asset_location_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.attendance_adjustment_approvals
CREATE TABLE IF NOT EXISTS `attendance_adjustment_approvals` (
  `approval_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `adjustment_request_id` bigint(20) unsigned NOT NULL,
  `approval_level` smallint(5) unsigned NOT NULL DEFAULT 1,
  `approver_user_id` bigint(20) unsigned NOT NULL,
  `decision` varchar(30) NOT NULL DEFAULT 'PENDING',
  `comments` text DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`approval_id`),
  UNIQUE KEY `uq_adjustment_approval_level` (`adjustment_request_id`,`approval_level`,`approver_user_id`),
  KEY `ix_adjustment_approval_request` (`adjustment_request_id`),
  KEY `ix_adjustment_approval_user` (`approver_user_id`,`decision`),
  CONSTRAINT `fk_adjustment_approval_request` FOREIGN KEY (`adjustment_request_id`) REFERENCES `attendance_adjustment_requests` (`adjustment_request_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_adjustment_approval_user` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.attendance_adjustment_requests
CREATE TABLE IF NOT EXISTS `attendance_adjustment_requests` (
  `adjustment_request_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `attendance_id` bigint(20) unsigned DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `adjustment_type` varchar(50) NOT NULL,
  `current_check_in_at` datetime DEFAULT NULL,
  `current_check_out_at` datetime DEFAULT NULL,
  `current_status_code` varchar(30) DEFAULT NULL,
  `requested_check_in_at` datetime DEFAULT NULL,
  `requested_check_out_at` datetime DEFAULT NULL,
  `requested_status_code` varchar(30) DEFAULT NULL,
  `reason` text NOT NULL,
  `attachment_path` varchar(700) DEFAULT NULL,
  `request_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `final_decision_by` bigint(20) unsigned DEFAULT NULL,
  `final_decision_at` datetime DEFAULT NULL,
  `final_remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`adjustment_request_id`),
  KEY `fk_adjustment_current_status` (`current_status_code`),
  KEY `fk_adjustment_requested_status` (`requested_status_code`),
  KEY `fk_adjustment_requested_by` (`requested_by_user_id`),
  KEY `fk_adjustment_final_decision` (`final_decision_by`),
  KEY `ix_adjustment_company_status` (`company_id`,`request_status`),
  KEY `ix_adjustment_employee_date` (`employee_id`,`attendance_date`),
  KEY `ix_adjustment_attendance` (`attendance_id`),
  CONSTRAINT `fk_adjustment_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `attendance_records` (`attendance_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_adjustment_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_adjustment_current_status` FOREIGN KEY (`current_status_code`) REFERENCES `attendance_statuses` (`status_code`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_adjustment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_adjustment_final_decision` FOREIGN KEY (`final_decision_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_adjustment_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_adjustment_requested_status` FOREIGN KEY (`requested_status_code`) REFERENCES `attendance_statuses` (`status_code`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.attendance_breaks
CREATE TABLE IF NOT EXISTS `attendance_breaks` (
  `break_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `attendance_id` bigint(20) unsigned NOT NULL,
  `break_type` varchar(50) NOT NULL DEFAULT 'GENERAL',
  `break_start_at` datetime NOT NULL,
  `break_end_at` datetime DEFAULT NULL,
  `duration_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `is_paid` tinyint(1) NOT NULL DEFAULT 0,
  `source_type` varchar(30) NOT NULL DEFAULT 'SYSTEM',
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`break_id`),
  KEY `ix_attendance_break_record` (`attendance_id`),
  KEY `ix_attendance_break_start` (`break_start_at`),
  CONSTRAINT `fk_attendance_break_record` FOREIGN KEY (`attendance_id`) REFERENCES `attendance_records` (`attendance_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.attendance_devices
CREATE TABLE IF NOT EXISTS `attendance_devices` (
  `device_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `device_code` varchar(80) NOT NULL,
  `device_name` varchar(150) NOT NULL,
  `device_type` varchar(50) NOT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `model_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(150) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `port_number` int(10) unsigned DEFAULT NULL,
  `physical_location` varchar(255) DEFAULT NULL,
  `last_sync_at` datetime DEFAULT NULL,
  `sync_status` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `uq_company_device_code` (`company_id`,`device_code`),
  KEY `ix_attendance_device_company` (`company_id`),
  KEY `ix_attendance_device_branch` (`branch_id`),
  CONSTRAINT `fk_attendance_device_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_device_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.attendance_policies
CREATE TABLE IF NOT EXISTS `attendance_policies` (
  `policy_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `policy_code` varchar(50) NOT NULL,
  `policy_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `late_grace_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `early_departure_grace_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `minimum_full_day_minutes` smallint(5) unsigned NOT NULL DEFAULT 480,
  `minimum_half_day_minutes` smallint(5) unsigned NOT NULL DEFAULT 240,
  `automatic_absence` tinyint(1) NOT NULL DEFAULT 1,
  `allow_manual_attendance` tinyint(1) NOT NULL DEFAULT 1,
  `allow_remote_attendance` tinyint(1) NOT NULL DEFAULT 0,
  `overtime_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `overtime_after_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `minimum_overtime_minutes` smallint(5) unsigned NOT NULL DEFAULT 30,
  `maximum_overtime_minutes_day` smallint(5) unsigned DEFAULT NULL,
  `overtime_requires_approval` tinyint(1) NOT NULL DEFAULT 1,
  `deduct_break_time` tinyint(1) NOT NULL DEFAULT 1,
  `require_checkout` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`policy_id`),
  UNIQUE KEY `uq_company_attendance_policy` (`company_id`,`policy_code`),
  KEY `ix_attendance_policy_company` (`company_id`),
  KEY `ix_attendance_policy_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_attendance_policy_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.attendance_records
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `attendance_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `attendance_date` date NOT NULL,
  `shift_id` bigint(20) unsigned DEFAULT NULL,
  `schedule_id` bigint(20) unsigned DEFAULT NULL,
  `policy_id` bigint(20) unsigned DEFAULT NULL,
  `scheduled_start_at` datetime DEFAULT NULL,
  `scheduled_end_at` datetime DEFAULT NULL,
  `check_in_at` datetime DEFAULT NULL,
  `check_out_at` datetime DEFAULT NULL,
  `total_presence_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `total_break_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `total_work_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `payable_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `late_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `early_departure_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `overtime_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `status_code` varchar(30) NOT NULL DEFAULT 'ABSENT',
  `attendance_source` varchar(30) NOT NULL DEFAULT 'SYSTEM',
  `check_in_location` varchar(255) DEFAULT NULL,
  `check_out_location` varchar(255) DEFAULT NULL,
  `check_in_latitude` decimal(10,7) DEFAULT NULL,
  `check_in_longitude` decimal(10,7) DEFAULT NULL,
  `check_out_latitude` decimal(10,7) DEFAULT NULL,
  `check_out_longitude` decimal(10,7) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_manually_modified` tinyint(1) NOT NULL DEFAULT 0,
  `is_finalized` tinyint(1) NOT NULL DEFAULT 0,
  `finalized_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `finalized_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `uq_employee_attendance_date` (`company_id`,`employee_id`,`attendance_date`),
  KEY `fk_attendance_record_shift` (`shift_id`),
  KEY `fk_attendance_record_schedule` (`schedule_id`),
  KEY `fk_attendance_record_policy` (`policy_id`),
  KEY `fk_attendance_record_status` (`status_code`),
  KEY `fk_attendance_record_finalized_by` (`finalized_by_user_id`),
  KEY `ix_attendance_company_date` (`company_id`,`attendance_date`),
  KEY `ix_attendance_employee_date` (`employee_id`,`attendance_date`),
  KEY `ix_attendance_status_date` (`company_id`,`status_code`,`attendance_date`),
  KEY `ix_attendance_finalized` (`company_id`,`is_finalized`,`attendance_date`),
  CONSTRAINT `fk_attendance_record_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_record_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_record_finalized_by` FOREIGN KEY (`finalized_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_record_policy` FOREIGN KEY (`policy_id`) REFERENCES `attendance_policies` (`policy_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_record_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `work_schedules` (`schedule_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_record_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_record_status` FOREIGN KEY (`status_code`) REFERENCES `attendance_statuses` (`status_code`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.attendance_statuses
CREATE TABLE IF NOT EXISTS `attendance_statuses` (
  `status_code` varchar(30) NOT NULL,
  `status_name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `counts_as_present` tinyint(1) NOT NULL DEFAULT 0,
  `counts_as_absent` tinyint(1) NOT NULL DEFAULT 0,
  `is_payable` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.background_checks
CREATE TABLE IF NOT EXISTS `background_checks` (
  `background_check_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `candidate_id` bigint(20) unsigned NOT NULL,
  `job_application_id` bigint(20) unsigned DEFAULT NULL,
  `check_type` varchar(60) NOT NULL,
  `provider_name` varchar(200) DEFAULT NULL,
  `provider_reference` varchar(150) DEFAULT NULL,
  `check_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `check_result` varchar(30) DEFAULT NULL,
  `initiated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `initiated_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `findings_summary` text DEFAULT NULL,
  `detailed_findings` longtext DEFAULT NULL,
  `report_storage_path` varchar(700) DEFAULT NULL,
  `report_checksum_sha256` char(64) DEFAULT NULL,
  `reviewed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_comments` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`background_check_id`),
  KEY `fk_background_check_application` (`job_application_id`),
  KEY `fk_background_check_initiated_by` (`initiated_by_user_id`),
  KEY `fk_background_check_reviewed_by` (`reviewed_by_user_id`),
  KEY `ix_background_check_candidate` (`candidate_id`),
  KEY `ix_background_check_status` (`company_id`,`check_status`),
  CONSTRAINT `fk_background_check_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_applications` (`job_application_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_background_check_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_background_check_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_background_check_initiated_by` FOREIGN KEY (`initiated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_background_check_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.background_jobs
CREATE TABLE IF NOT EXISTS `background_jobs` (
  `background_job_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `job_type` varchar(100) NOT NULL,
  `job_reference` varchar(150) DEFAULT NULL,
  `payload` longtext DEFAULT NULL,
  `job_status` varchar(30) NOT NULL DEFAULT 'QUEUED',
  `priority_level` smallint(5) unsigned NOT NULL DEFAULT 100,
  `scheduled_at` datetime NOT NULL DEFAULT current_timestamp(),
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `retry_count` smallint(5) unsigned NOT NULL DEFAULT 0,
  `maximum_retries` smallint(5) unsigned NOT NULL DEFAULT 3,
  `last_error` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`background_job_id`),
  KEY `fk_background_job_company` (`company_id`),
  KEY `ix_background_job_status` (`job_status`,`scheduled_at`,`priority_level`),
  CONSTRAINT `fk_background_job_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.bank_payment_batch_items
CREATE TABLE IF NOT EXISTS `bank_payment_batch_items` (
  `payment_batch_item_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payment_batch_id` bigint(20) unsigned NOT NULL,
  `payroll_run_employee_id` bigint(20) unsigned NOT NULL,
  `bank_account_id` bigint(20) unsigned DEFAULT NULL,
  `employee_name_snapshot` varchar(250) NOT NULL,
  `employee_code_snapshot` varchar(50) NOT NULL,
  `account_title_snapshot` varchar(150) DEFAULT NULL,
  `account_number_last4` char(4) DEFAULT NULL,
  `bank_name_snapshot` varchar(150) DEFAULT NULL,
  `payment_amount` decimal(15,2) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `payment_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `bank_transaction_reference` varchar(150) DEFAULT NULL,
  `failure_reason` varchar(500) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payment_batch_item_id`),
  UNIQUE KEY `uq_batch_run_employee` (`payment_batch_id`,`payroll_run_employee_id`),
  KEY `fk_payment_batch_item_run_employee` (`payroll_run_employee_id`),
  KEY `fk_payment_batch_item_bank` (`bank_account_id`),
  KEY `ix_payment_batch_item_status` (`payment_batch_id`,`payment_status`),
  CONSTRAINT `fk_payment_batch_item_bank` FOREIGN KEY (`bank_account_id`) REFERENCES `employee_bank_accounts` (`bank_account_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_batch_item_batch` FOREIGN KEY (`payment_batch_id`) REFERENCES `bank_payment_batches` (`payment_batch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_batch_item_run_employee` FOREIGN KEY (`payroll_run_employee_id`) REFERENCES `payroll_run_employees` (`payroll_run_employee_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.bank_payment_batches
CREATE TABLE IF NOT EXISTS `bank_payment_batches` (
  `payment_batch_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `payroll_run_id` bigint(20) unsigned NOT NULL,
  `batch_number` varchar(60) NOT NULL,
  `batch_name` varchar(150) DEFAULT NULL,
  `bank_name` varchar(150) DEFAULT NULL,
  `payment_date` date NOT NULL,
  `employee_count` int(10) unsigned NOT NULL DEFAULT 0,
  `total_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `batch_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `export_file_path` varchar(700) DEFAULT NULL,
  `bank_reference_number` varchar(150) DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payment_batch_id`),
  UNIQUE KEY `uq_company_payment_batch` (`company_id`,`batch_number`),
  KEY `fk_payment_batch_created_by` (`created_by_user_id`),
  KEY `fk_payment_batch_approved_by` (`approved_by_user_id`),
  KEY `ix_payment_batch_run` (`payroll_run_id`),
  KEY `ix_payment_batch_status` (`company_id`,`batch_status`),
  CONSTRAINT `fk_payment_batch_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_batch_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_batch_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_batch_run` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`payroll_run_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.benefit_claims
CREATE TABLE IF NOT EXISTS `benefit_claims` (
  `benefit_claim_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `benefit_enrollment_id` bigint(20) unsigned NOT NULL,
  `claim_number` varchar(60) NOT NULL,
  `claim_date` date NOT NULL,
  `claim_type` varchar(50) NOT NULL,
  `requested_amount` decimal(15,2) NOT NULL,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `claim_description` text NOT NULL,
  `claim_status` varchar(30) NOT NULL DEFAULT 'SUBMITTED',
  `attachment_storage_path` varchar(700) DEFAULT NULL,
  `reviewed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`benefit_claim_id`),
  UNIQUE KEY `uq_benefit_claim_number` (`company_id`,`claim_number`),
  KEY `fk_benefit_claim_employee` (`employee_id`),
  KEY `fk_benefit_claim_enrollment` (`benefit_enrollment_id`),
  KEY `fk_benefit_claim_reviewer` (`reviewed_by_user_id`),
  KEY `ix_benefit_claim_status` (`company_id`,`claim_status`),
  CONSTRAINT `fk_benefit_claim_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_benefit_claim_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_benefit_claim_enrollment` FOREIGN KEY (`benefit_enrollment_id`) REFERENCES `employee_benefit_enrollments` (`benefit_enrollment_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_benefit_claim_reviewer` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.benefit_plans
CREATE TABLE IF NOT EXISTS `benefit_plans` (
  `benefit_plan_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `plan_code` varchar(50) NOT NULL,
  `plan_name` varchar(150) NOT NULL,
  `benefit_type` varchar(50) NOT NULL,
  `provider_name` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `employer_contribution_type` varchar(30) NOT NULL DEFAULT 'FIXED',
  `employer_contribution_value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `employee_contribution_type` varchar(30) NOT NULL DEFAULT 'FIXED',
  `employee_contribution_value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`benefit_plan_id`),
  UNIQUE KEY `uq_benefit_plan_code` (`company_id`,`plan_code`),
  KEY `ix_benefit_plan_type` (`company_id`,`benefit_type`),
  CONSTRAINT `fk_benefit_plan_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.biometric_logs
CREATE TABLE IF NOT EXISTS `biometric_logs` (
  `biometric_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `device_id` bigint(20) unsigned DEFAULT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `external_employee_code` varchar(100) DEFAULT NULL,
  `punch_time` datetime NOT NULL,
  `punch_type` varchar(30) DEFAULT NULL,
  `verification_method` varchar(50) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `source_type` varchar(30) NOT NULL DEFAULT 'BIOMETRIC',
  `raw_payload` longtext DEFAULT NULL,
  `is_processed` tinyint(1) NOT NULL DEFAULT 0,
  `processing_error` varchar(500) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`biometric_log_id`),
  KEY `ix_biometric_company_time` (`company_id`,`punch_time`),
  KEY `ix_biometric_employee_time` (`employee_id`,`punch_time`),
  KEY `ix_biometric_device_time` (`device_id`,`punch_time`),
  KEY `ix_biometric_processing` (`is_processed`,`punch_time`),
  CONSTRAINT `fk_biometric_log_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_biometric_log_device` FOREIGN KEY (`device_id`) REFERENCES `attendance_devices` (`device_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_biometric_log_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.branches
CREATE TABLE IF NOT EXISTS `branches` (
  `branch_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_code` varchar(50) NOT NULL,
  `branch_name` varchar(150) NOT NULL,
  `branch_type` varchar(50) DEFAULT NULL,
  `official_email` varchar(150) DEFAULT NULL,
  `official_phone` varchar(50) DEFAULT NULL,
  `address_line_1` varchar(255) DEFAULT NULL,
  `address_line_2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `country_code` char(2) NOT NULL DEFAULT 'PK',
  `timezone` varchar(60) NOT NULL DEFAULT 'Asia/Karachi',
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `is_head_office` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`branch_id`),
  UNIQUE KEY `uq_company_branch_code` (`company_id`,`branch_code`),
  KEY `ix_branch_company` (`company_id`),
  KEY `ix_branch_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_branch_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.candidate_addresses
CREATE TABLE IF NOT EXISTS `candidate_addresses` (
  `candidate_address_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint(20) unsigned NOT NULL,
  `address_type` varchar(30) NOT NULL DEFAULT 'CURRENT',
  `address_line_1` varchar(255) NOT NULL,
  `address_line_2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`candidate_address_id`),
  KEY `ix_candidate_address_candidate` (`candidate_id`),
  CONSTRAINT `fk_candidate_address_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.candidate_documents
CREATE TABLE IF NOT EXISTS `candidate_documents` (
  `candidate_document_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint(20) unsigned NOT NULL,
  `document_type` varchar(60) NOT NULL,
  `document_title` varchar(200) DEFAULT NULL,
  `original_filename` varchar(255) NOT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `storage_path` varchar(700) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size_bytes` bigint(20) unsigned DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `is_primary_document` tinyint(1) NOT NULL DEFAULT 0,
  `is_confidential` tinyint(1) NOT NULL DEFAULT 1,
  `uploaded_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`candidate_document_id`),
  KEY `fk_candidate_document_uploaded_by` (`uploaded_by_user_id`),
  KEY `ix_candidate_document_candidate` (`candidate_id`),
  KEY `ix_candidate_document_type` (`candidate_id`,`document_type`),
  CONSTRAINT `fk_candidate_document_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_candidate_document_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.candidate_education
CREATE TABLE IF NOT EXISTS `candidate_education` (
  `candidate_education_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint(20) unsigned NOT NULL,
  `institution_name` varchar(200) NOT NULL,
  `qualification_level` varchar(100) DEFAULT NULL,
  `degree_title` varchar(200) NOT NULL,
  `field_of_study` varchar(200) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `grade_or_cgpa` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`candidate_education_id`),
  KEY `ix_candidate_education_candidate` (`candidate_id`),
  CONSTRAINT `fk_candidate_education_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.candidate_experience
CREATE TABLE IF NOT EXISTS `candidate_experience` (
  `candidate_experience_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint(20) unsigned NOT NULL,
  `employer_name` varchar(200) NOT NULL,
  `job_title` varchar(200) NOT NULL,
  `employment_type` varchar(50) DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `responsibilities` longtext DEFAULT NULL,
  `achievements` longtext DEFAULT NULL,
  `reason_for_leaving` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`candidate_experience_id`),
  KEY `ix_candidate_experience_candidate` (`candidate_id`),
  KEY `ix_candidate_experience_dates` (`start_date`,`end_date`),
  CONSTRAINT `fk_candidate_experience_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.candidate_skills
CREATE TABLE IF NOT EXISTS `candidate_skills` (
  `candidate_skill_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint(20) unsigned NOT NULL,
  `skill_name` varchar(150) NOT NULL,
  `proficiency_level` varchar(30) DEFAULT NULL,
  `years_of_experience` decimal(5,2) DEFAULT NULL,
  `is_primary_skill` tinyint(1) NOT NULL DEFAULT 0,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`candidate_skill_id`),
  UNIQUE KEY `uq_candidate_skill` (`candidate_id`,`skill_name`),
  KEY `ix_candidate_skill_name` (`skill_name`),
  CONSTRAINT `fk_candidate_skill_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.candidate_sources
CREATE TABLE IF NOT EXISTS `candidate_sources` (
  `candidate_source_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `source_code` varchar(50) NOT NULL,
  `source_name` varchar(150) NOT NULL,
  `source_type` varchar(50) NOT NULL DEFAULT 'OTHER',
  `website_url` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `cost_per_post` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`candidate_source_id`),
  UNIQUE KEY `uq_company_candidate_source` (`company_id`,`source_code`),
  KEY `ix_candidate_source_company` (`company_id`,`is_active`),
  CONSTRAINT `fk_candidate_source_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.candidates
CREATE TABLE IF NOT EXISTS `candidates` (
  `candidate_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `candidate_code` varchar(60) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `mobile_number` varchar(50) DEFAULT NULL,
  `alternate_number` varchar(50) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `nationality` varchar(80) DEFAULT NULL,
  `cnic_number` varchar(20) DEFAULT NULL,
  `passport_number` varchar(50) DEFAULT NULL,
  `current_city` varchar(100) DEFAULT NULL,
  `current_country_code` char(2) DEFAULT NULL,
  `linkedin_url` varchar(500) DEFAULT NULL,
  `portfolio_url` varchar(500) DEFAULT NULL,
  `personal_website_url` varchar(500) DEFAULT NULL,
  `current_job_title` varchar(150) DEFAULT NULL,
  `current_employer` varchar(200) DEFAULT NULL,
  `total_experience_years` decimal(5,2) DEFAULT NULL,
  `current_salary` decimal(15,2) DEFAULT NULL,
  `expected_salary` decimal(15,2) DEFAULT NULL,
  `salary_currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `notice_period_days` smallint(5) unsigned DEFAULT NULL,
  `earliest_available_date` date DEFAULT NULL,
  `profile_summary` longtext DEFAULT NULL,
  `consent_given` tinyint(1) NOT NULL DEFAULT 0,
  `consent_given_at` datetime DEFAULT NULL,
  `consent_ip_address` varchar(45) DEFAULT NULL,
  `do_not_contact` tinyint(1) NOT NULL DEFAULT 0,
  `data_retention_until` date DEFAULT NULL,
  `candidate_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`candidate_id`),
  UNIQUE KEY `uq_company_candidate_code` (`company_id`,`candidate_code`),
  UNIQUE KEY `uq_company_candidate_email` (`company_id`,`email`),
  KEY `fk_candidate_created_by` (`created_by_user_id`),
  KEY `ix_candidate_company_status` (`company_id`,`candidate_status`),
  KEY `ix_candidate_name` (`company_id`,`first_name`,`last_name`),
  KEY `ix_candidate_mobile` (`mobile_number`),
  CONSTRAINT `fk_candidate_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_candidate_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.certifications
CREATE TABLE IF NOT EXISTS `certifications` (
  `certification_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `certification_code` varchar(60) NOT NULL,
  `certification_name` varchar(250) NOT NULL,
  `issuing_organization` varchar(250) DEFAULT NULL,
  `certification_category` varchar(100) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `default_validity_months` smallint(5) unsigned DEFAULT NULL,
  `renewal_required` tinyint(1) NOT NULL DEFAULT 0,
  `related_skill_id` bigint(20) unsigned DEFAULT NULL,
  `related_course_id` bigint(20) unsigned DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`certification_id`),
  UNIQUE KEY `uq_company_certification` (`company_id`,`certification_code`),
  KEY `fk_certification_skill` (`related_skill_id`),
  KEY `fk_certification_course` (`related_course_id`),
  KEY `ix_certification_expiry_rule` (`renewal_required`,`default_validity_months`),
  CONSTRAINT `fk_certification_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_certification_course` FOREIGN KEY (`related_course_id`) REFERENCES `training_courses` (`training_course_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_certification_skill` FOREIGN KEY (`related_skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.clearance_departments
CREATE TABLE IF NOT EXISTS `clearance_departments` (
  `clearance_department_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `clearance_code` varchar(50) NOT NULL,
  `clearance_name` varchar(150) NOT NULL,
  `approver_role_id` bigint(20) unsigned DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`clearance_department_id`),
  UNIQUE KEY `uq_clearance_department_code` (`company_id`,`clearance_code`),
  KEY `fk_clearance_department_department` (`department_id`),
  KEY `fk_clearance_department_role` (`approver_role_id`),
  CONSTRAINT `fk_clearance_department_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_clearance_department_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_clearance_department_role` FOREIGN KEY (`approver_role_id`) REFERENCES `roles` (`role_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.companies
CREATE TABLE IF NOT EXISTS `companies` (
  `company_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_code` varchar(50) NOT NULL,
  `legal_name` varchar(200) NOT NULL,
  `display_name` varchar(200) NOT NULL,
  `registration_number` varchar(100) DEFAULT NULL,
  `tax_number` varchar(100) DEFAULT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `official_email` varchar(150) DEFAULT NULL,
  `official_phone` varchar(50) DEFAULT NULL,
  `website_url` varchar(255) DEFAULT NULL,
  `address_line_1` varchar(255) DEFAULT NULL,
  `address_line_2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `country_code` char(2) NOT NULL DEFAULT 'PK',
  `timezone` varchar(60) NOT NULL DEFAULT 'Asia/Karachi',
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `date_format` varchar(30) NOT NULL DEFAULT 'DD-MM-YYYY',
  `logo_path` varchar(500) DEFAULT NULL,
  `employee_code_prefix` varchar(20) DEFAULT NULL,
  `employee_code_length` tinyint(3) unsigned NOT NULL DEFAULT 5,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`company_id`),
  UNIQUE KEY `uq_company_code` (`company_code`),
  KEY `ix_company_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for view hr_management.company_current_subscription_details
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `company_current_subscription_details` (
	`subscription_id` BIGINT(20) UNSIGNED NOT NULL,
	`company_id` BIGINT(20) UNSIGNED NOT NULL,
	`plan_id` BIGINT(20) UNSIGNED NOT NULL,
	`plan_code` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`plan_name` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`subscription_status` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`billing_cycle` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`trial_start_date` DATE NULL,
	`trial_end_date` DATE NULL,
	`subscription_start_date` DATE NOT NULL,
	`subscription_end_date` DATE NULL,
	`next_billing_date` DATE NULL,
	`agreed_price` DECIMAL(15,2) NOT NULL,
	`currency_code` CHAR(3) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`auto_renew` TINYINT(1) NOT NULL,
	`is_current` TINYINT(1) NULL,
	`employee_limit_override` INT(10) UNSIGNED NULL,
	`branch_limit_override` INT(10) UNSIGNED NULL,
	`user_limit_override` INT(10) UNSIGNED NULL,
	`storage_limit_mb_override` INT(10) UNSIGNED NULL,
	`effective_employee_limit` INT(10) UNSIGNED NULL,
	`effective_branch_limit` INT(10) UNSIGNED NULL,
	`effective_user_limit` INT(10) UNSIGNED NULL,
	`effective_storage_limit_mb` INT(10) UNSIGNED NULL,
	`monthly_price` DECIMAL(15,2) NOT NULL,
	`annual_price` DECIMAL(15,2) NOT NULL,
	`trial_days` SMALLINT(5) UNSIGNED NOT NULL,
	`plan_is_active` TINYINT(1) NOT NULL,
	`created_at` DATETIME NOT NULL,
	`updated_at` DATETIME NOT NULL
);

-- Dumping structure for table hr_management.company_feature_flags
CREATE TABLE IF NOT EXISTS `company_feature_flags` (
  `company_feature_flag_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `feature_flag_id` bigint(20) unsigned NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `enabled_from` datetime DEFAULT NULL,
  `enabled_until` datetime DEFAULT NULL,
  `configuration_payload` longtext DEFAULT NULL,
  `updated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`company_feature_flag_id`),
  UNIQUE KEY `uq_company_feature_flag` (`company_id`,`feature_flag_id`),
  KEY `fk_company_feature_flag_feature` (`feature_flag_id`),
  KEY `fk_company_feature_flag_user` (`updated_by_user_id`),
  CONSTRAINT `fk_company_feature_flag_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_company_feature_flag_feature` FOREIGN KEY (`feature_flag_id`) REFERENCES `feature_flags` (`feature_flag_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_company_feature_flag_user` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.company_policies
CREATE TABLE IF NOT EXISTS `company_policies` (
  `company_policy_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `policy_code` varchar(60) NOT NULL,
  `policy_name` varchar(250) NOT NULL,
  `policy_category` varchar(100) DEFAULT NULL,
  `owner_department_id` bigint(20) unsigned DEFAULT NULL,
  `review_frequency_months` smallint(5) unsigned DEFAULT NULL,
  `confidentiality_level` varchar(30) NOT NULL DEFAULT 'INTERNAL',
  `acknowledgement_required` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`company_policy_id`),
  UNIQUE KEY `uq_company_policy_code` (`company_id`,`policy_code`),
  KEY `fk_company_policy_department` (`owner_department_id`),
  KEY `fk_company_policy_user` (`created_by_user_id`),
  CONSTRAINT `fk_company_policy_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_company_policy_department` FOREIGN KEY (`owner_department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_company_policy_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.company_settings
CREATE TABLE IF NOT EXISTS `company_settings` (
  `setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `setting_key` varchar(150) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `setting_type` varchar(30) NOT NULL DEFAULT 'TEXT',
  `description` varchar(500) DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `uq_company_setting` (`company_id`,`setting_key`),
  KEY `ix_setting_company` (`company_id`),
  CONSTRAINT `fk_setting_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.company_subscriptions
CREATE TABLE IF NOT EXISTS `company_subscriptions` (
  `subscription_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `plan_id` bigint(20) unsigned NOT NULL,
  `employee_limit_override` int(10) unsigned DEFAULT NULL,
  `branch_limit_override` int(10) unsigned DEFAULT NULL,
  `user_limit_override` int(10) unsigned DEFAULT NULL,
  `storage_limit_mb_override` int(10) unsigned DEFAULT NULL,
  `subscription_status` varchar(30) NOT NULL DEFAULT 'TRIAL',
  `billing_cycle` varchar(20) NOT NULL DEFAULT 'MONTHLY',
  `trial_start_date` date DEFAULT NULL,
  `trial_end_date` date DEFAULT NULL,
  `subscription_start_date` date NOT NULL,
  `subscription_end_date` date DEFAULT NULL,
  `next_billing_date` date DEFAULT NULL,
  `agreed_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `auto_renew` tinyint(1) NOT NULL DEFAULT 0,
  `is_current` tinyint(1) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`subscription_id`),
  UNIQUE KEY `uq_company_current_subscription` (`company_id`,`is_current`),
  KEY `ix_subscription_company` (`company_id`),
  KEY `ix_subscription_plan` (`plan_id`),
  KEY `ix_subscription_status` (`subscription_status`),
  KEY `ix_subscription_end_date` (`subscription_end_date`),
  KEY `ix_company_subscription_current_status` (`company_id`,`is_current`,`subscription_status`),
  KEY `ix_company_subscription_billing` (`next_billing_date`,`subscription_status`),
  CONSTRAINT `fk_subscription_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_subscription_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`plan_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_company_subscription_current` CHECK (`is_current` is null or `is_current` = 1)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.compliance_records
CREATE TABLE IF NOT EXISTS `compliance_records` (
  `compliance_record_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `compliance_requirement_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `record_date` date NOT NULL,
  `compliance_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `due_date` date DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `evidence_storage_path` varchar(700) DEFAULT NULL,
  `findings` longtext DEFAULT NULL,
  `corrective_action_required` tinyint(1) NOT NULL DEFAULT 0,
  `owner_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`compliance_record_id`),
  KEY `fk_compliance_record_requirement` (`compliance_requirement_id`),
  KEY `fk_compliance_record_employee` (`employee_id`),
  KEY `fk_compliance_record_branch` (`branch_id`),
  KEY `fk_compliance_record_user` (`owner_user_id`),
  KEY `ix_compliance_record_status` (`company_id`,`compliance_status`,`due_date`),
  CONSTRAINT `fk_compliance_record_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_compliance_record_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_compliance_record_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_compliance_record_requirement` FOREIGN KEY (`compliance_requirement_id`) REFERENCES `compliance_requirements` (`compliance_requirement_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_compliance_record_user` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.compliance_requirements
CREATE TABLE IF NOT EXISTS `compliance_requirements` (
  `compliance_requirement_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `requirement_code` varchar(60) NOT NULL,
  `requirement_name` varchar(250) NOT NULL,
  `compliance_category` varchar(100) NOT NULL,
  `legal_reference` varchar(500) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `responsible_department_id` bigint(20) unsigned DEFAULT NULL,
  `review_frequency_months` smallint(5) unsigned DEFAULT NULL,
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`compliance_requirement_id`),
  UNIQUE KEY `uq_compliance_requirement_code` (`company_id`,`requirement_code`),
  KEY `fk_compliance_requirement_department` (`responsible_department_id`),
  CONSTRAINT `fk_compliance_requirement_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_compliance_requirement_department` FOREIGN KEY (`responsible_department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.course_lessons
CREATE TABLE IF NOT EXISTS `course_lessons` (
  `course_lesson_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_module_id` bigint(20) unsigned NOT NULL,
  `lesson_code` varchar(60) NOT NULL,
  `lesson_name` varchar(250) NOT NULL,
  `lesson_description` longtext DEFAULT NULL,
  `lesson_type` varchar(40) NOT NULL DEFAULT 'CONTENT',
  `content_text` longtext DEFAULT NULL,
  `content_url` varchar(1000) DEFAULT NULL,
  `content_storage_path` varchar(700) DEFAULT NULL,
  `duration_minutes` int(10) unsigned DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `minimum_completion_percentage` decimal(6,2) NOT NULL DEFAULT 100.00,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `allow_download` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`course_lesson_id`),
  UNIQUE KEY `uq_module_lesson_code` (`course_module_id`,`lesson_code`),
  UNIQUE KEY `uq_module_lesson_sequence` (`course_module_id`,`sequence_number`),
  CONSTRAINT `fk_course_lesson_module` FOREIGN KEY (`course_module_id`) REFERENCES `course_modules` (`course_module_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.course_materials
CREATE TABLE IF NOT EXISTS `course_materials` (
  `course_material_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_course_id` bigint(20) unsigned NOT NULL,
  `course_module_id` bigint(20) unsigned DEFAULT NULL,
  `course_lesson_id` bigint(20) unsigned DEFAULT NULL,
  `material_title` varchar(250) NOT NULL,
  `material_type` varchar(40) NOT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `stored_filename` varchar(255) DEFAULT NULL,
  `storage_path` varchar(700) DEFAULT NULL,
  `external_url` varchar(1000) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size_bytes` bigint(20) unsigned DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_downloadable` tinyint(1) NOT NULL DEFAULT 0,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `uploaded_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`course_material_id`),
  KEY `fk_course_material_uploaded_by` (`uploaded_by_user_id`),
  KEY `ix_course_material_course` (`training_course_id`),
  KEY `ix_course_material_module` (`course_module_id`),
  KEY `ix_course_material_lesson` (`course_lesson_id`),
  CONSTRAINT `fk_course_material_course` FOREIGN KEY (`training_course_id`) REFERENCES `training_courses` (`training_course_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_course_material_lesson` FOREIGN KEY (`course_lesson_id`) REFERENCES `course_lessons` (`course_lesson_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_course_material_module` FOREIGN KEY (`course_module_id`) REFERENCES `course_modules` (`course_module_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_course_material_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.course_modules
CREATE TABLE IF NOT EXISTS `course_modules` (
  `course_module_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_course_id` bigint(20) unsigned NOT NULL,
  `module_code` varchar(60) NOT NULL,
  `module_name` varchar(250) NOT NULL,
  `description` longtext DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `duration_minutes` int(10) unsigned DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`course_module_id`),
  UNIQUE KEY `uq_course_module_code` (`training_course_id`,`module_code`),
  UNIQUE KEY `uq_course_module_sequence` (`training_course_id`,`sequence_number`),
  CONSTRAINT `fk_course_module_course` FOREIGN KEY (`training_course_id`) REFERENCES `training_courses` (`training_course_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.course_prerequisites
CREATE TABLE IF NOT EXISTS `course_prerequisites` (
  `course_prerequisite_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_course_id` bigint(20) unsigned NOT NULL,
  `prerequisite_course_id` bigint(20) unsigned DEFAULT NULL,
  `prerequisite_skill_id` bigint(20) unsigned DEFAULT NULL,
  `minimum_proficiency_level` decimal(5,2) DEFAULT NULL,
  `prerequisite_type` varchar(40) NOT NULL DEFAULT 'REQUIRED',
  `description` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`course_prerequisite_id`),
  KEY `ix_course_prerequisite_course` (`training_course_id`),
  KEY `ix_course_prerequisite_required` (`prerequisite_course_id`),
  KEY `ix_course_prerequisite_skill` (`prerequisite_skill_id`),
  CONSTRAINT `fk_course_prerequisite_course` FOREIGN KEY (`training_course_id`) REFERENCES `training_courses` (`training_course_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_course_prerequisite_required_course` FOREIGN KEY (`prerequisite_course_id`) REFERENCES `training_courses` (`training_course_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_course_prerequisite_skill` FOREIGN KEY (`prerequisite_skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.custom_field_definitions
CREATE TABLE IF NOT EXISTS `custom_field_definitions` (
  `custom_field_definition_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `field_code` varchar(60) NOT NULL,
  `field_label` varchar(200) NOT NULL,
  `field_type` varchar(40) NOT NULL,
  `option_payload` longtext DEFAULT NULL,
  `validation_rules` longtext DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 0,
  `is_searchable` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`custom_field_definition_id`),
  UNIQUE KEY `uq_custom_field_definition` (`company_id`,`entity_type`,`field_code`),
  CONSTRAINT `fk_custom_field_definition_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.custom_field_values
CREATE TABLE IF NOT EXISTS `custom_field_values` (
  `custom_field_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `custom_field_definition_id` bigint(20) unsigned NOT NULL,
  `entity_id` bigint(20) unsigned NOT NULL,
  `value_text` longtext DEFAULT NULL,
  `value_number` decimal(20,6) DEFAULT NULL,
  `value_date` date DEFAULT NULL,
  `value_datetime` datetime DEFAULT NULL,
  `value_boolean` tinyint(1) DEFAULT NULL,
  `value_file_path` varchar(700) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`custom_field_value_id`),
  UNIQUE KEY `uq_custom_field_value` (`custom_field_definition_id`,`entity_id`),
  CONSTRAINT `fk_custom_field_value_definition` FOREIGN KEY (`custom_field_definition_id`) REFERENCES `custom_field_definitions` (`custom_field_definition_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.dashboard_definitions
CREATE TABLE IF NOT EXISTS `dashboard_definitions` (
  `dashboard_definition_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `dashboard_code` varchar(60) NOT NULL,
  `dashboard_name` varchar(200) NOT NULL,
  `module_name` varchar(80) NOT NULL,
  `description` text DEFAULT NULL,
  `layout_definition` longtext DEFAULT NULL,
  `is_system_dashboard` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`dashboard_definition_id`),
  UNIQUE KEY `uq_dashboard_definition_code` (`company_id`,`dashboard_code`),
  KEY `fk_dashboard_definition_user` (`created_by_user_id`),
  CONSTRAINT `fk_dashboard_definition_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dashboard_definition_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.dashboard_widgets
CREATE TABLE IF NOT EXISTS `dashboard_widgets` (
  `dashboard_widget_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `dashboard_definition_id` bigint(20) unsigned NOT NULL,
  `widget_code` varchar(60) NOT NULL,
  `widget_title` varchar(200) NOT NULL,
  `widget_type` varchar(40) NOT NULL,
  `data_source_definition` longtext NOT NULL,
  `visualization_config` longtext DEFAULT NULL,
  `grid_position` longtext DEFAULT NULL,
  `refresh_interval_seconds` int(10) unsigned DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`dashboard_widget_id`),
  UNIQUE KEY `uq_dashboard_widget_code` (`dashboard_definition_id`,`widget_code`),
  CONSTRAINT `fk_dashboard_widget_definition` FOREIGN KEY (`dashboard_definition_id`) REFERENCES `dashboard_definitions` (`dashboard_definition_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.data_export_jobs
CREATE TABLE IF NOT EXISTS `data_export_jobs` (
  `data_export_job_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `export_number` varchar(60) NOT NULL,
  `export_type` varchar(80) NOT NULL,
  `filter_definition` longtext DEFAULT NULL,
  `output_format` varchar(20) NOT NULL DEFAULT 'XLSX',
  `export_status` varchar(30) NOT NULL DEFAULT 'QUEUED',
  `storage_path` varchar(700) DEFAULT NULL,
  `file_size_bytes` bigint(20) unsigned DEFAULT NULL,
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`data_export_job_id`),
  UNIQUE KEY `uq_data_export_job_number` (`company_id`,`export_number`),
  KEY `fk_data_export_job_user` (`requested_by_user_id`),
  KEY `ix_data_export_job_status` (`company_id`,`export_status`),
  CONSTRAINT `fk_data_export_job_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_data_export_job_user` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.data_import_errors
CREATE TABLE IF NOT EXISTS `data_import_errors` (
  `data_import_error_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `data_import_job_id` bigint(20) unsigned NOT NULL,
  `source_row_number` bigint(20) unsigned DEFAULT NULL,
  `column_name` varchar(150) DEFAULT NULL,
  `error_code` varchar(80) DEFAULT NULL,
  `error_message` longtext NOT NULL,
  `raw_row_data` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`data_import_error_id`),
  KEY `ix_data_import_error_job` (`data_import_job_id`,`source_row_number`),
  CONSTRAINT `fk_data_import_error_job` FOREIGN KEY (`data_import_job_id`) REFERENCES `data_import_jobs` (`data_import_job_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.data_import_jobs
CREATE TABLE IF NOT EXISTS `data_import_jobs` (
  `data_import_job_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `import_number` varchar(60) NOT NULL,
  `import_type` varchar(80) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `storage_path` varchar(700) NOT NULL,
  `mapping_definition` longtext DEFAULT NULL,
  `import_status` varchar(30) NOT NULL DEFAULT 'UPLOADED',
  `total_rows` bigint(20) unsigned NOT NULL DEFAULT 0,
  `successful_rows` bigint(20) unsigned NOT NULL DEFAULT 0,
  `failed_rows` bigint(20) unsigned NOT NULL DEFAULT 0,
  `initiated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`data_import_job_id`),
  UNIQUE KEY `uq_data_import_job_number` (`company_id`,`import_number`),
  KEY `fk_data_import_job_user` (`initiated_by_user_id`),
  KEY `ix_data_import_job_status` (`company_id`,`import_status`),
  CONSTRAINT `fk_data_import_job_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_data_import_job_user` FOREIGN KEY (`initiated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.data_retention_policies
CREATE TABLE IF NOT EXISTS `data_retention_policies` (
  `data_retention_policy_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `policy_code` varchar(60) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `retention_days` int(10) unsigned NOT NULL,
  `action_after_retention` varchar(30) NOT NULL DEFAULT 'ARCHIVE',
  `legal_hold_supported` tinyint(1) NOT NULL DEFAULT 1,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`data_retention_policy_id`),
  UNIQUE KEY `uq_data_retention_policy_code` (`company_id`,`policy_code`),
  CONSTRAINT `fk_data_retention_policy_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.data_subject_requests
CREATE TABLE IF NOT EXISTS `data_subject_requests` (
  `data_subject_request_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `candidate_id` bigint(20) unsigned DEFAULT NULL,
  `request_number` varchar(60) NOT NULL,
  `request_type` varchar(50) NOT NULL,
  `request_date` date NOT NULL,
  `verification_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `request_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `due_date` date DEFAULT NULL,
  `assigned_to_user_id` bigint(20) unsigned DEFAULT NULL,
  `resolution_summary` longtext DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`data_subject_request_id`),
  UNIQUE KEY `uq_data_subject_request_number` (`company_id`,`request_number`),
  KEY `fk_data_subject_request_employee` (`employee_id`),
  KEY `fk_data_subject_request_candidate` (`candidate_id`),
  KEY `fk_data_subject_request_user` (`assigned_to_user_id`),
  KEY `ix_data_subject_request_status` (`company_id`,`request_status`,`due_date`),
  CONSTRAINT `fk_data_subject_request_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_data_subject_request_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_data_subject_request_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_data_subject_request_user` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.departments
CREATE TABLE IF NOT EXISTS `departments` (
  `department_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `parent_department_id` bigint(20) unsigned DEFAULT NULL,
  `department_code` varchar(50) NOT NULL,
  `department_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `cost_center_code` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`department_id`),
  -- edited by wali: Department codes may repeat across branches in one company.
  UNIQUE KEY `uq_company_branch_department_code` (`company_id`,`branch_id`,`department_code`),
  KEY `ix_department_company` (`company_id`),
  KEY `ix_department_branch` (`branch_id`),
  KEY `ix_department_parent` (`parent_department_id`),
  KEY `ix_department_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_department_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_department_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_department_parent` FOREIGN KEY (`parent_department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.designations
CREATE TABLE IF NOT EXISTS `designations` (
  `designation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_code` varchar(50) NOT NULL,
  `designation_name` varchar(150) NOT NULL,
  `grade` varchar(50) DEFAULT NULL,
  `job_level` smallint(5) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `minimum_salary` decimal(15,2) DEFAULT NULL,
  `maximum_salary` decimal(15,2) DEFAULT NULL,
  `is_managerial` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`designation_id`),
  -- edited by wali: Designation codes are scoped to their department.
  UNIQUE KEY `uq_department_designation_code` (`company_id`,`department_id`,`designation_code`),
  KEY `ix_designation_company` (`company_id`),
  KEY `ix_designation_department` (`department_id`),
  KEY `ix_designation_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_designation_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_designation_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.development_plan_items
CREATE TABLE IF NOT EXISTS `development_plan_items` (
  `development_plan_item_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `development_plan_id` bigint(20) unsigned NOT NULL,
  `item_type` varchar(40) NOT NULL,
  `item_title` varchar(250) NOT NULL,
  `item_description` longtext DEFAULT NULL,
  `skill_id` bigint(20) unsigned DEFAULT NULL,
  `training_course_id` bigint(20) unsigned DEFAULT NULL,
  `certification_id` bigint(20) unsigned DEFAULT NULL,
  `training_enrollment_id` bigint(20) unsigned DEFAULT NULL,
  `current_proficiency` decimal(5,2) DEFAULT NULL,
  `target_proficiency` decimal(5,2) DEFAULT NULL,
  `target_start_date` date DEFAULT NULL,
  `target_completion_date` date DEFAULT NULL,
  `actual_completion_date` date DEFAULT NULL,
  `item_status` varchar(30) NOT NULL DEFAULT 'NOT_STARTED',
  `progress_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `employee_comments` longtext DEFAULT NULL,
  `manager_comments` longtext DEFAULT NULL,
  `evidence_storage_path` varchar(700) DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`development_plan_item_id`),
  KEY `fk_development_plan_item_skill` (`skill_id`),
  KEY `fk_development_plan_item_course` (`training_course_id`),
  KEY `fk_development_plan_item_certification` (`certification_id`),
  KEY `fk_development_plan_item_enrollment` (`training_enrollment_id`),
  KEY `ix_development_plan_item_plan` (`development_plan_id`,`item_status`),
  KEY `ix_development_plan_item_due` (`target_completion_date`,`item_status`),
  CONSTRAINT `fk_development_plan_item_certification` FOREIGN KEY (`certification_id`) REFERENCES `certifications` (`certification_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_development_plan_item_course` FOREIGN KEY (`training_course_id`) REFERENCES `training_courses` (`training_course_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_development_plan_item_enrollment` FOREIGN KEY (`training_enrollment_id`) REFERENCES `training_enrollments` (`training_enrollment_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_development_plan_item_plan` FOREIGN KEY (`development_plan_id`) REFERENCES `development_plans` (`development_plan_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_development_plan_item_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.development_plans
CREATE TABLE IF NOT EXISTS `development_plans` (
  `development_plan_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `performance_review_id` bigint(20) unsigned DEFAULT NULL,
  `plan_number` varchar(60) NOT NULL,
  `plan_title` varchar(250) NOT NULL,
  `plan_description` longtext DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `manager_employee_id` bigint(20) unsigned DEFAULT NULL,
  `owner_user_id` bigint(20) unsigned DEFAULT NULL,
  `plan_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `progress_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `employee_acknowledged_at` datetime DEFAULT NULL,
  `manager_approved_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `completion_summary` longtext DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`development_plan_id`),
  UNIQUE KEY `uq_company_development_plan` (`company_id`,`plan_number`),
  KEY `fk_development_plan_review` (`performance_review_id`),
  KEY `fk_development_plan_manager` (`manager_employee_id`),
  KEY `fk_development_plan_owner` (`owner_user_id`),
  KEY `fk_development_plan_created_by` (`created_by_user_id`),
  KEY `ix_development_plan_employee` (`employee_id`,`plan_status`),
  KEY `ix_development_plan_dates` (`start_date`,`end_date`),
  CONSTRAINT `fk_development_plan_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_development_plan_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_development_plan_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_development_plan_manager` FOREIGN KEY (`manager_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_development_plan_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_development_plan_review` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`performance_review_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.disciplinary_case_actions
CREATE TABLE IF NOT EXISTS `disciplinary_case_actions` (
  `disciplinary_action_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `disciplinary_case_id` bigint(20) unsigned NOT NULL,
  `action_type` varchar(60) NOT NULL,
  `action_date` date NOT NULL,
  `action_description` longtext NOT NULL,
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `suspension_days` smallint(5) unsigned DEFAULT NULL,
  `salary_deduction_amount` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `document_storage_path` varchar(700) DEFAULT NULL,
  `action_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`disciplinary_action_id`),
  KEY `fk_disciplinary_action_created_by` (`created_by_user_id`),
  KEY `fk_disciplinary_action_approved_by` (`approved_by_user_id`),
  KEY `ix_disciplinary_action_case` (`disciplinary_case_id`,`action_date`),
  KEY `ix_disciplinary_action_type` (`action_type`,`action_status`),
  CONSTRAINT `fk_disciplinary_action_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_disciplinary_action_case` FOREIGN KEY (`disciplinary_case_id`) REFERENCES `disciplinary_cases` (`disciplinary_case_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_disciplinary_action_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.disciplinary_cases
CREATE TABLE IF NOT EXISTS `disciplinary_cases` (
  `disciplinary_case_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `case_number` varchar(60) NOT NULL,
  `case_title` varchar(200) NOT NULL,
  `case_category` varchar(80) NOT NULL,
  `severity_level` varchar(30) NOT NULL DEFAULT 'MEDIUM',
  `incident_date` date NOT NULL,
  `reported_date` date NOT NULL,
  `incident_location` varchar(255) DEFAULT NULL,
  `incident_description` longtext NOT NULL,
  `reported_by_employee_id` bigint(20) unsigned DEFAULT NULL,
  `reported_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `investigator_user_id` bigint(20) unsigned DEFAULT NULL,
  `case_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `employee_response` longtext DEFAULT NULL,
  `employee_response_date` date DEFAULT NULL,
  `investigation_findings` longtext DEFAULT NULL,
  `investigation_completed_at` datetime DEFAULT NULL,
  `final_decision` varchar(50) DEFAULT NULL,
  `final_decision_comments` longtext DEFAULT NULL,
  `decided_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `closed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `confidentiality_level` varchar(30) NOT NULL DEFAULT 'RESTRICTED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`disciplinary_case_id`),
  UNIQUE KEY `uq_company_disciplinary_case` (`company_id`,`case_number`),
  KEY `fk_disciplinary_reported_employee` (`reported_by_employee_id`),
  KEY `fk_disciplinary_reported_user` (`reported_by_user_id`),
  KEY `fk_disciplinary_investigator` (`investigator_user_id`),
  KEY `fk_disciplinary_decided_by` (`decided_by_user_id`),
  KEY `fk_disciplinary_closed_by` (`closed_by_user_id`),
  KEY `ix_disciplinary_employee` (`employee_id`,`case_status`),
  KEY `ix_disciplinary_company_status` (`company_id`,`case_status`),
  KEY `ix_disciplinary_incident_date` (`incident_date`),
  CONSTRAINT `fk_disciplinary_case_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_disciplinary_case_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_disciplinary_closed_by` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_disciplinary_decided_by` FOREIGN KEY (`decided_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_disciplinary_investigator` FOREIGN KEY (`investigator_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_disciplinary_reported_employee` FOREIGN KEY (`reported_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_disciplinary_reported_user` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.email_templates
CREATE TABLE IF NOT EXISTS `email_templates` (
  `email_template_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `template_code` varchar(80) NOT NULL,
  `template_name` varchar(200) NOT NULL,
  `module_name` varchar(80) NOT NULL,
  `subject_template` varchar(500) NOT NULL,
  `body_html` longtext DEFAULT NULL,
  `body_text` longtext DEFAULT NULL,
  `variable_definition` longtext DEFAULT NULL,
  `is_system_template` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`email_template_id`),
  UNIQUE KEY `uq_email_template_code` (`company_id`,`template_code`),
  CONSTRAINT `fk_email_template_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_addresses
CREATE TABLE IF NOT EXISTS `employee_addresses` (
  `address_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `address_type` varchar(30) NOT NULL,
  `address_line_1` varchar(255) NOT NULL,
  `address_line_2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `country_code` char(2) NOT NULL DEFAULT 'PK',
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`address_id`),
  KEY `ix_address_employee` (`employee_id`),
  KEY `ix_address_primary` (`employee_id`,`is_primary`),
  CONSTRAINT `fk_address_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_assignments
CREATE TABLE IF NOT EXISTS `employee_assignments` (
  `assignment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `reporting_manager_id` bigint(20) unsigned DEFAULT NULL,
  `assignment_type` varchar(30) NOT NULL DEFAULT 'PRIMARY',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `work_location` varchar(255) DEFAULT NULL,
  `employment_percentage` decimal(5,2) NOT NULL DEFAULT 100.00,
  `transfer_reason` varchar(500) DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assignment_id`),
  KEY `ix_assignment_employee` (`employee_id`),
  KEY `ix_assignment_branch` (`branch_id`),
  KEY `ix_assignment_department` (`department_id`),
  KEY `ix_assignment_designation` (`designation_id`),
  KEY `ix_assignment_manager` (`reporting_manager_id`),
  KEY `ix_assignment_current` (`employee_id`,`is_current`),
  CONSTRAINT `fk_assignment_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assignment_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assignment_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assignment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_assignment_manager` FOREIGN KEY (`reporting_manager_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_attendance_policy_assignments
CREATE TABLE IF NOT EXISTS `employee_attendance_policy_assignments` (
  `assignment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `policy_id` bigint(20) unsigned NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `assigned_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `uq_employee_policy_effective` (`employee_id`,`policy_id`,`effective_from`),
  KEY `fk_employee_policy_policy` (`policy_id`),
  KEY `fk_employee_policy_assigned_by` (`assigned_by_user_id`),
  KEY `ix_employee_policy_employee` (`employee_id`),
  KEY `ix_employee_policy_current` (`employee_id`,`is_current`),
  KEY `ix_employee_policy_dates` (`effective_from`,`effective_to`),
  CONSTRAINT `fk_employee_policy_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_policy_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_policy_policy` FOREIGN KEY (`policy_id`) REFERENCES `attendance_policies` (`policy_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_bank_accounts
CREATE TABLE IF NOT EXISTS `employee_bank_accounts` (
  `bank_account_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `bank_name` varchar(150) NOT NULL,
  `bank_code` varchar(50) DEFAULT NULL,
  `branch_name` varchar(150) DEFAULT NULL,
  `branch_code` varchar(50) DEFAULT NULL,
  `account_title` varchar(150) NOT NULL,
  `account_number_encrypted` varbinary(512) NOT NULL,
  `account_number_last4` char(4) DEFAULT NULL,
  `iban_encrypted` varbinary(512) DEFAULT NULL,
  `iban_last4` char(4) DEFAULT NULL,
  `account_type` varchar(30) NOT NULL DEFAULT 'CURRENT',
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `payment_priority` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `verified_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`bank_account_id`),
  KEY `fk_bank_account_verified_by` (`verified_by_user_id`),
  KEY `ix_bank_account_employee` (`employee_id`),
  KEY `ix_bank_account_primary` (`employee_id`,`is_primary`),
  KEY `ix_bank_account_company` (`company_id`,`is_active`),
  CONSTRAINT `fk_bank_account_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bank_account_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bank_account_verified_by` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_benefit_enrollments
CREATE TABLE IF NOT EXISTS `employee_benefit_enrollments` (
  `benefit_enrollment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `benefit_plan_id` bigint(20) unsigned NOT NULL,
  `enrollment_date` date NOT NULL,
  `coverage_start_date` date NOT NULL,
  `coverage_end_date` date DEFAULT NULL,
  `employee_contribution` decimal(15,2) NOT NULL DEFAULT 0.00,
  `employer_contribution` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `enrollment_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`benefit_enrollment_id`),
  KEY `fk_benefit_enrollment_company` (`company_id`),
  KEY `fk_benefit_enrollment_plan` (`benefit_plan_id`),
  KEY `fk_benefit_enrollment_user` (`approved_by_user_id`),
  KEY `ix_benefit_enrollment_employee` (`employee_id`,`enrollment_status`),
  CONSTRAINT `fk_benefit_enrollment_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_benefit_enrollment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_benefit_enrollment_plan` FOREIGN KEY (`benefit_plan_id`) REFERENCES `benefit_plans` (`benefit_plan_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_benefit_enrollment_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_certifications
CREATE TABLE IF NOT EXISTS `employee_certifications` (
  `employee_certification_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `certification_id` bigint(20) unsigned NOT NULL,
  `training_enrollment_id` bigint(20) unsigned DEFAULT NULL,
  `certificate_number` varchar(150) DEFAULT NULL,
  `issue_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `issuing_organization` varchar(250) DEFAULT NULL,
  `verification_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `verified_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `certificate_storage_path` varchar(700) DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `renewal_status` varchar(30) DEFAULT NULL,
  `renewal_reminder_sent_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_certification_id`),
  KEY `fk_employee_certification_definition` (`certification_id`),
  KEY `fk_employee_certification_enrollment` (`training_enrollment_id`),
  KEY `fk_employee_certification_verified_by` (`verified_by_user_id`),
  KEY `ix_employee_certification_employee` (`employee_id`),
  KEY `ix_employee_certification_expiry` (`expiry_date`,`is_active`),
  KEY `ix_employee_certification_status` (`company_id`,`verification_status`),
  CONSTRAINT `fk_employee_certification_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_certification_definition` FOREIGN KEY (`certification_id`) REFERENCES `certifications` (`certification_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_certification_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_certification_enrollment` FOREIGN KEY (`training_enrollment_id`) REFERENCES `training_enrollments` (`training_enrollment_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_certification_verified_by` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_clearances
CREATE TABLE IF NOT EXISTS `employee_clearances` (
  `employee_clearance_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_offboarding_id` bigint(20) unsigned NOT NULL,
  `clearance_department_id` bigint(20) unsigned NOT NULL,
  `clearance_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `outstanding_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `clearance_notes` text DEFAULT NULL,
  `cleared_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `cleared_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_clearance_id`),
  UNIQUE KEY `uq_employee_clearance_department` (`employee_offboarding_id`,`clearance_department_id`),
  KEY `fk_employee_clearance_department` (`clearance_department_id`),
  KEY `fk_employee_clearance_user` (`cleared_by_user_id`),
  CONSTRAINT `fk_employee_clearance_department` FOREIGN KEY (`clearance_department_id`) REFERENCES `clearance_departments` (`clearance_department_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_clearance_offboarding` FOREIGN KEY (`employee_offboarding_id`) REFERENCES `employee_offboardings` (`employee_offboarding_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_clearance_user` FOREIGN KEY (`cleared_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_consents
CREATE TABLE IF NOT EXISTS `employee_consents` (
  `employee_consent_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `consent_type` varchar(80) NOT NULL,
  `consent_version` varchar(30) NOT NULL,
  `consent_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `consent_text` longtext DEFAULT NULL,
  `granted_at` datetime DEFAULT NULL,
  `withdrawn_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `evidence_storage_path` varchar(700) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_consent_id`),
  UNIQUE KEY `uq_employee_consent` (`employee_id`,`consent_type`,`consent_version`),
  KEY `fk_employee_consent_company` (`company_id`),
  CONSTRAINT `fk_employee_consent_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_consent_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_documents
CREATE TABLE IF NOT EXISTS `employee_documents` (
  `document_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `document_category` varchar(80) NOT NULL,
  `document_title` varchar(200) DEFAULT NULL,
  `original_filename` varchar(255) NOT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `storage_path` varchar(700) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size_bytes` bigint(20) unsigned DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `document_number` varchar(100) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_confidential` tinyint(1) NOT NULL DEFAULT 1,
  `uploaded_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`document_id`),
  KEY `fk_document_uploaded_by` (`uploaded_by_user_id`),
  KEY `ix_document_employee` (`employee_id`),
  KEY `ix_document_category` (`employee_id`,`document_category`),
  KEY `ix_document_expiry` (`expiry_date`),
  CONSTRAINT `fk_document_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_document_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_educations
CREATE TABLE IF NOT EXISTS `employee_educations` (
  `education_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `qualification_level` varchar(80) NOT NULL,
  `degree_title` varchar(150) NOT NULL,
  `field_of_study` varchar(150) DEFAULT NULL,
  `institution_name` varchar(200) NOT NULL,
  `board_university` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country_code` char(2) NOT NULL DEFAULT 'PK',
  `start_date` date DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  `is_currently_studying` tinyint(1) NOT NULL DEFAULT 0,
  `result_type` varchar(30) DEFAULT NULL,
  `result_value` varchar(50) DEFAULT NULL,
  `marks_percentage` decimal(5,2) DEFAULT NULL,
  `cgpa` decimal(5,2) DEFAULT NULL,
  `total_cgpa` decimal(5,2) DEFAULT NULL,
  `is_highest_qualification` tinyint(1) NOT NULL DEFAULT 0,
  `certificate_document_path` varchar(500) DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `verified_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`education_id`),
  KEY `ix_employee_education_employee` (`employee_id`),
  KEY `ix_employee_education_highest` (`employee_id`,`is_highest_qualification`,`deleted_at`),
  KEY `ix_employee_education_verification` (`employee_id`,`is_verified`),
  KEY `ix_employee_education_dates` (`employee_id`,`start_date`,`completion_date`),
  KEY `ix_employee_education_verified_by` (`verified_by_user_id`),
  CONSTRAINT `fk_employee_education_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_education_verified_by` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_employee_education_dates` CHECK (`completion_date` is null or `start_date` is null or `completion_date` >= `start_date`),
  CONSTRAINT `chk_employee_education_studying` CHECK (`is_currently_studying` = 0 or `completion_date` is null),
  CONSTRAINT `chk_employee_education_percentage` CHECK (`marks_percentage` is null or `marks_percentage` >= 0 and `marks_percentage` <= 100),
  CONSTRAINT `chk_employee_education_cgpa` CHECK (`cgpa` is null and `total_cgpa` is null or `cgpa` is not null and `total_cgpa` is not null and `cgpa` >= 0 and `total_cgpa` > 0 and `cgpa` <= `total_cgpa`),
  CONSTRAINT `chk_employee_education_verification` CHECK (`is_verified` = 0 or `verified_at` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_emergency_contacts
CREATE TABLE IF NOT EXISTS `employee_emergency_contacts` (
  `contact_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `contact_name` varchar(150) NOT NULL,
  `relationship` varchar(80) NOT NULL,
  `primary_phone` varchar(50) NOT NULL,
  `alternate_phone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`contact_id`),
  KEY `ix_emergency_employee` (`employee_id`),
  KEY `ix_emergency_primary` (`employee_id`,`is_primary`),
  CONSTRAINT `fk_emergency_contact_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_experiences
CREATE TABLE IF NOT EXISTS `employee_experiences` (
  `experience_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `employer_name` varchar(200) NOT NULL,
  `job_title` varchar(150) NOT NULL,
  `department` varchar(150) DEFAULT NULL,
  `employment_type` varchar(50) DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `country_code` char(2) NOT NULL DEFAULT 'PK',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `responsibilities` text DEFAULT NULL,
  `last_drawn_salary` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `reason_for_leaving` varchar(500) DEFAULT NULL,
  `reference_name` varchar(150) DEFAULT NULL,
  `reference_phone` varchar(50) DEFAULT NULL,
  `reference_email` varchar(150) DEFAULT NULL,
  `experience_letter_path` varchar(500) DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `verified_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`experience_id`),
  KEY `ix_employee_experience_employee` (`employee_id`),
  KEY `ix_employee_experience_current` (`employee_id`,`is_current`),
  KEY `ix_employee_experience_dates` (`employee_id`,`start_date`,`end_date`),
  KEY `ix_employee_experience_verification` (`employee_id`,`is_verified`),
  KEY `ix_employee_experience_verified_by` (`verified_by_user_id`),
  CONSTRAINT `fk_employee_experience_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_experience_verified_by` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_employee_experience_dates` CHECK (`end_date` is null or `end_date` >= `start_date`),
  CONSTRAINT `chk_employee_experience_current` CHECK (`is_current` = 0 or `end_date` is null),
  CONSTRAINT `chk_employee_experience_salary` CHECK (`last_drawn_salary` is null or `last_drawn_salary` >= 0),
  CONSTRAINT `chk_employee_experience_verification` CHECK (`is_verified` = 0 or `verified_at` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_goals
CREATE TABLE IF NOT EXISTS `employee_goals` (
  `employee_goal_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `performance_cycle_id` bigint(20) unsigned NOT NULL,
  `parent_goal_id` bigint(20) unsigned DEFAULT NULL,
  `goal_code` varchar(60) NOT NULL,
  `goal_title` varchar(250) NOT NULL,
  `goal_description` longtext DEFAULT NULL,
  `goal_category` varchar(50) DEFAULT NULL,
  `measurement_type` varchar(40) NOT NULL DEFAULT 'PERCENTAGE',
  `measurement_unit` varchar(50) DEFAULT NULL,
  `baseline_value` decimal(18,4) DEFAULT NULL,
  `target_value` decimal(18,4) DEFAULT NULL,
  `current_value` decimal(18,4) DEFAULT NULL,
  `weight_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `progress_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `start_date` date NOT NULL,
  `due_date` date NOT NULL,
  `completed_date` date DEFAULT NULL,
  `goal_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `priority_level` varchar(30) NOT NULL DEFAULT 'MEDIUM',
  `employee_comments` text DEFAULT NULL,
  `manager_comments` text DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_goal_id`),
  UNIQUE KEY `uq_company_employee_goal_code` (`company_id`,`employee_id`,`goal_code`),
  KEY `fk_employee_goal_created_by` (`created_by_user_id`),
  KEY `fk_employee_goal_approved_by` (`approved_by_user_id`),
  KEY `ix_employee_goal_cycle` (`performance_cycle_id`,`goal_status`),
  KEY `ix_employee_goal_employee` (`employee_id`,`due_date`),
  KEY `ix_employee_goal_parent` (`parent_goal_id`),
  CONSTRAINT `fk_employee_goal_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_goal_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_goal_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_goal_cycle` FOREIGN KEY (`performance_cycle_id`) REFERENCES `performance_cycles` (`performance_cycle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_goal_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_goal_parent` FOREIGN KEY (`parent_goal_id`) REFERENCES `employee_goals` (`employee_goal_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_grievances
CREATE TABLE IF NOT EXISTS `employee_grievances` (
  `employee_grievance_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `grievance_number` varchar(60) NOT NULL,
  `grievance_category` varchar(80) NOT NULL,
  `grievance_title` varchar(200) NOT NULL,
  `grievance_description` longtext NOT NULL,
  `incident_date` date DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `against_employee_id` bigint(20) unsigned DEFAULT NULL,
  `against_department_id` bigint(20) unsigned DEFAULT NULL,
  `is_anonymous` tinyint(1) NOT NULL DEFAULT 0,
  `confidentiality_level` varchar(30) NOT NULL DEFAULT 'RESTRICTED',
  `assigned_to_user_id` bigint(20) unsigned DEFAULT NULL,
  `grievance_status` varchar(30) NOT NULL DEFAULT 'SUBMITTED',
  `investigation_notes` longtext DEFAULT NULL,
  `resolution_summary` longtext DEFAULT NULL,
  `resolved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `employee_satisfaction_rating` decimal(5,2) DEFAULT NULL,
  `employee_feedback` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_grievance_id`),
  UNIQUE KEY `uq_company_grievance_number` (`company_id`,`grievance_number`),
  KEY `fk_grievance_against_employee` (`against_employee_id`),
  KEY `fk_grievance_against_department` (`against_department_id`),
  KEY `fk_grievance_resolved_by` (`resolved_by_user_id`),
  KEY `ix_grievance_employee` (`employee_id`,`grievance_status`),
  KEY `ix_grievance_company_status` (`company_id`,`grievance_status`),
  KEY `ix_grievance_assigned_user` (`assigned_to_user_id`,`grievance_status`),
  CONSTRAINT `fk_grievance_against_department` FOREIGN KEY (`against_department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_grievance_against_employee` FOREIGN KEY (`against_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_grievance_assigned_to` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_grievance_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_grievance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_grievance_resolved_by` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_kpi_assignments
CREATE TABLE IF NOT EXISTS `employee_kpi_assignments` (
  `employee_kpi_assignment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `performance_cycle_id` bigint(20) unsigned NOT NULL,
  `kpi_definition_id` bigint(20) unsigned NOT NULL,
  `target_value` decimal(18,4) DEFAULT NULL,
  `minimum_value` decimal(18,4) DEFAULT NULL,
  `maximum_value` decimal(18,4) DEFAULT NULL,
  `actual_value` decimal(18,4) DEFAULT NULL,
  `weight_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `achievement_percentage` decimal(8,2) DEFAULT NULL,
  `weighted_score` decimal(8,2) DEFAULT NULL,
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `assignment_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `assigned_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_kpi_assignment_id`),
  UNIQUE KEY `uq_employee_cycle_kpi` (`employee_id`,`performance_cycle_id`,`kpi_definition_id`),
  KEY `fk_employee_kpi_definition` (`kpi_definition_id`),
  KEY `fk_employee_kpi_assigned_by` (`assigned_by_user_id`),
  KEY `fk_employee_kpi_approved_by` (`approved_by_user_id`),
  KEY `ix_employee_kpi_cycle` (`performance_cycle_id`),
  KEY `ix_employee_kpi_status` (`company_id`,`assignment_status`),
  CONSTRAINT `fk_employee_kpi_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_kpi_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_kpi_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_kpi_cycle` FOREIGN KEY (`performance_cycle_id`) REFERENCES `performance_cycles` (`performance_cycle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_kpi_definition` FOREIGN KEY (`kpi_definition_id`) REFERENCES `kpi_definitions` (`kpi_definition_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_kpi_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_learning_path_progress
CREATE TABLE IF NOT EXISTS `employee_learning_path_progress` (
  `learning_path_progress_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_learning_path_id` bigint(20) unsigned NOT NULL,
  `learning_path_course_id` bigint(20) unsigned NOT NULL,
  `training_enrollment_id` bigint(20) unsigned DEFAULT NULL,
  `course_status` varchar(30) NOT NULL DEFAULT 'NOT_STARTED',
  `progress_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`learning_path_progress_id`),
  UNIQUE KEY `uq_employee_path_course_progress` (`employee_learning_path_id`,`learning_path_course_id`),
  KEY `fk_learning_path_progress_course` (`learning_path_course_id`),
  KEY `fk_learning_path_progress_enrollment` (`training_enrollment_id`),
  CONSTRAINT `fk_learning_path_progress_assignment` FOREIGN KEY (`employee_learning_path_id`) REFERENCES `employee_learning_paths` (`employee_learning_path_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_learning_path_progress_course` FOREIGN KEY (`learning_path_course_id`) REFERENCES `learning_path_courses` (`learning_path_course_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_learning_path_progress_enrollment` FOREIGN KEY (`training_enrollment_id`) REFERENCES `training_enrollments` (`training_enrollment_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_learning_paths
CREATE TABLE IF NOT EXISTS `employee_learning_paths` (
  `employee_learning_path_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `learning_path_id` bigint(20) unsigned NOT NULL,
  `assignment_date` date NOT NULL,
  `expected_completion_date` date DEFAULT NULL,
  `actual_completion_date` date DEFAULT NULL,
  `assignment_status` varchar(30) NOT NULL DEFAULT 'ASSIGNED',
  `progress_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `assigned_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_learning_path_id`),
  UNIQUE KEY `uq_employee_learning_path_assignment` (`employee_id`,`learning_path_id`,`assignment_date`),
  KEY `fk_employee_learning_path_path` (`learning_path_id`),
  KEY `fk_employee_learning_path_assigned_by` (`assigned_by_user_id`),
  KEY `ix_employee_learning_path_status` (`company_id`,`assignment_status`),
  CONSTRAINT `fk_employee_learning_path_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_learning_path_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_learning_path_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_learning_path_path` FOREIGN KEY (`learning_path_id`) REFERENCES `learning_paths` (`learning_path_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_leave_balances
CREATE TABLE IF NOT EXISTS `employee_leave_balances` (
  `leave_balance_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `leave_period_id` bigint(20) unsigned NOT NULL,
  `opening_balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `accrued_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `carried_forward_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `adjusted_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `used_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `pending_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `encashed_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `expired_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `available_balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `last_accrual_date` date DEFAULT NULL,
  `last_calculated_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`leave_balance_id`),
  UNIQUE KEY `uq_employee_leave_balance` (`employee_id`,`leave_type_id`,`leave_period_id`),
  KEY `fk_leave_balance_period` (`leave_period_id`),
  KEY `ix_leave_balance_company` (`company_id`),
  KEY `ix_leave_balance_employee` (`employee_id`),
  KEY `ix_leave_balance_type_period` (`leave_type_id`,`leave_period_id`),
  CONSTRAINT `fk_leave_balance_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_balance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_balance_period` FOREIGN KEY (`leave_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_balance_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_leave_policy_assignments
CREATE TABLE IF NOT EXISTS `employee_leave_policy_assignments` (
  `assignment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_policy_id` bigint(20) unsigned NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `assigned_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `uq_emp_leave_policy_effective` (`employee_id`,`leave_policy_id`,`effective_from`),
  KEY `fk_emp_leave_policy_policy` (`leave_policy_id`),
  KEY `fk_emp_leave_policy_user` (`assigned_by_user_id`),
  KEY `ix_emp_leave_policy_employee` (`employee_id`),
  KEY `ix_emp_leave_policy_current` (`employee_id`,`is_current`),
  CONSTRAINT `fk_emp_leave_policy_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_leave_policy_policy` FOREIGN KEY (`leave_policy_id`) REFERENCES `leave_policies` (`leave_policy_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_leave_policy_user` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_lesson_progress
CREATE TABLE IF NOT EXISTS `employee_lesson_progress` (
  `lesson_progress_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_enrollment_id` bigint(20) unsigned NOT NULL,
  `course_lesson_id` bigint(20) unsigned NOT NULL,
  `lesson_status` varchar(30) NOT NULL DEFAULT 'NOT_STARTED',
  `progress_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `time_spent_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `first_started_at` datetime DEFAULT NULL,
  `last_accessed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `last_position_seconds` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`lesson_progress_id`),
  UNIQUE KEY `uq_enrollment_lesson_progress` (`training_enrollment_id`,`course_lesson_id`),
  KEY `fk_lesson_progress_lesson` (`course_lesson_id`),
  KEY `ix_lesson_progress_status` (`lesson_status`),
  CONSTRAINT `fk_lesson_progress_enrollment` FOREIGN KEY (`training_enrollment_id`) REFERENCES `training_enrollments` (`training_enrollment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_lesson_progress_lesson` FOREIGN KEY (`course_lesson_id`) REFERENCES `course_lessons` (`course_lesson_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_loans
CREATE TABLE IF NOT EXISTS `employee_loans` (
  `employee_loan_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `loan_number` varchar(60) NOT NULL,
  `loan_type` varchar(50) NOT NULL,
  `application_date` date NOT NULL,
  `approval_date` date DEFAULT NULL,
  `disbursement_date` date DEFAULT NULL,
  `principal_amount` decimal(15,2) NOT NULL,
  `interest_rate` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `interest_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_repayable_amount` decimal(15,2) NOT NULL,
  `installment_count` smallint(5) unsigned NOT NULL,
  `installment_amount` decimal(15,2) NOT NULL,
  `repayment_start_date` date NOT NULL,
  `amount_repaid` decimal(15,2) NOT NULL DEFAULT 0.00,
  `outstanding_balance` decimal(15,2) NOT NULL,
  `loan_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `reason` text DEFAULT NULL,
  `attachment_path` varchar(700) DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approval_remarks` text DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_loan_id`),
  UNIQUE KEY `uq_company_loan_number` (`company_id`,`loan_number`),
  KEY `fk_employee_loan_approved_by` (`approved_by_user_id`),
  KEY `ix_employee_loan_employee` (`employee_id`,`loan_status`),
  KEY `ix_employee_loan_company` (`company_id`,`loan_status`),
  CONSTRAINT `fk_employee_loan_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_loan_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_loan_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_offboarding_tasks
CREATE TABLE IF NOT EXISTS `employee_offboarding_tasks` (
  `employee_offboarding_task_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_offboarding_id` bigint(20) unsigned NOT NULL,
  `offboarding_template_task_id` bigint(20) unsigned DEFAULT NULL,
  `task_name` varchar(200) NOT NULL,
  `task_description` text DEFAULT NULL,
  `assigned_user_id` bigint(20) unsigned DEFAULT NULL,
  `assigned_employee_id` bigint(20) unsigned DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `task_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `completion_notes` text DEFAULT NULL,
  `evidence_storage_path` varchar(700) DEFAULT NULL,
  `completed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_offboarding_task_id`),
  KEY `fk_employee_offboarding_task_template` (`offboarding_template_task_id`),
  KEY `fk_employee_offboarding_task_user` (`assigned_user_id`),
  KEY `fk_employee_offboarding_task_employee` (`assigned_employee_id`),
  KEY `fk_employee_offboarding_task_completed` (`completed_by_user_id`),
  KEY `fk_employee_offboarding_task_approved` (`approved_by_user_id`),
  KEY `ix_employee_offboarding_task_status` (`employee_offboarding_id`,`task_status`),
  CONSTRAINT `fk_employee_offboarding_task_approved` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_offboarding_task_completed` FOREIGN KEY (`completed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_offboarding_task_employee` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_offboarding_task_parent` FOREIGN KEY (`employee_offboarding_id`) REFERENCES `employee_offboardings` (`employee_offboarding_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_offboarding_task_template` FOREIGN KEY (`offboarding_template_task_id`) REFERENCES `offboarding_template_tasks` (`offboarding_template_task_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_offboarding_task_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_offboardings
CREATE TABLE IF NOT EXISTS `employee_offboardings` (
  `employee_offboarding_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `offboarding_template_id` bigint(20) unsigned DEFAULT NULL,
  `offboarding_number` varchar(60) NOT NULL,
  `separation_type` varchar(40) NOT NULL,
  `resignation_date` date DEFAULT NULL,
  `notice_start_date` date DEFAULT NULL,
  `last_working_date` date NOT NULL,
  `reason_for_leaving` longtext DEFAULT NULL,
  `rehire_eligible` tinyint(1) DEFAULT NULL,
  `coordinator_user_id` bigint(20) unsigned DEFAULT NULL,
  `offboarding_status` varchar(30) NOT NULL DEFAULT 'NOT_STARTED',
  `progress_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_offboarding_id`),
  UNIQUE KEY `uq_employee_offboarding_number` (`company_id`,`offboarding_number`),
  KEY `fk_employee_offboarding_template` (`offboarding_template_id`),
  KEY `fk_employee_offboarding_user` (`coordinator_user_id`),
  KEY `ix_employee_offboarding_status` (`employee_id`,`offboarding_status`),
  CONSTRAINT `fk_employee_offboarding_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_offboarding_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_offboarding_template` FOREIGN KEY (`offboarding_template_id`) REFERENCES `offboarding_templates` (`offboarding_template_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_offboarding_user` FOREIGN KEY (`coordinator_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_onboarding_tasks
CREATE TABLE IF NOT EXISTS `employee_onboarding_tasks` (
  `employee_onboarding_task_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_onboarding_id` bigint(20) unsigned NOT NULL,
  `onboarding_template_task_id` bigint(20) unsigned DEFAULT NULL,
  `task_name` varchar(200) NOT NULL,
  `task_description` text DEFAULT NULL,
  `task_category` varchar(50) NOT NULL DEFAULT 'GENERAL',
  `assigned_user_id` bigint(20) unsigned DEFAULT NULL,
  `assigned_employee_id` bigint(20) unsigned DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `task_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `requires_document` tinyint(1) NOT NULL DEFAULT 0,
  `requires_approval` tinyint(1) NOT NULL DEFAULT 0,
  `evidence_storage_path` varchar(700) DEFAULT NULL,
  `completion_notes` text DEFAULT NULL,
  `completed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approval_comments` text DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_onboarding_task_id`),
  KEY `fk_employee_onboarding_task_template` (`onboarding_template_task_id`),
  KEY `fk_employee_onboarding_task_employee` (`assigned_employee_id`),
  KEY `fk_employee_onboarding_task_completed_by` (`completed_by_user_id`),
  KEY `fk_employee_onboarding_task_approved_by` (`approved_by_user_id`),
  KEY `ix_employee_onboarding_task_onboarding` (`employee_onboarding_id`,`task_status`),
  KEY `ix_employee_onboarding_task_assigned_user` (`assigned_user_id`,`task_status`),
  KEY `ix_employee_onboarding_task_due_date` (`due_date`,`task_status`),
  CONSTRAINT `fk_employee_onboarding_task_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_task_completed_by` FOREIGN KEY (`completed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_task_employee` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_task_onboarding` FOREIGN KEY (`employee_onboarding_id`) REFERENCES `employee_onboardings` (`employee_onboarding_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_task_template` FOREIGN KEY (`onboarding_template_task_id`) REFERENCES `onboarding_template_tasks` (`onboarding_template_task_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_task_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_onboardings
CREATE TABLE IF NOT EXISTS `employee_onboardings` (
  `employee_onboarding_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `job_offer_id` bigint(20) unsigned DEFAULT NULL,
  `onboarding_template_id` bigint(20) unsigned DEFAULT NULL,
  `onboarding_number` varchar(60) NOT NULL,
  `joining_date` date NOT NULL,
  `expected_completion_date` date DEFAULT NULL,
  `actual_completion_date` date DEFAULT NULL,
  `coordinator_user_id` bigint(20) unsigned DEFAULT NULL,
  `buddy_employee_id` bigint(20) unsigned DEFAULT NULL,
  `onboarding_status` varchar(30) NOT NULL DEFAULT 'NOT_STARTED',
  `progress_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `employee_acknowledged_at` datetime DEFAULT NULL,
  `completed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_onboarding_id`),
  UNIQUE KEY `uq_company_onboarding_number` (`company_id`,`onboarding_number`),
  UNIQUE KEY `uq_employee_active_onboarding` (`employee_id`,`joining_date`),
  KEY `fk_employee_onboarding_offer` (`job_offer_id`),
  KEY `fk_employee_onboarding_template` (`onboarding_template_id`),
  KEY `fk_employee_onboarding_coordinator` (`coordinator_user_id`),
  KEY `fk_employee_onboarding_buddy` (`buddy_employee_id`),
  KEY `fk_employee_onboarding_completed_by` (`completed_by_user_id`),
  KEY `ix_employee_onboarding_status` (`company_id`,`onboarding_status`),
  KEY `ix_employee_onboarding_employee` (`employee_id`),
  CONSTRAINT `fk_employee_onboarding_buddy` FOREIGN KEY (`buddy_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_completed_by` FOREIGN KEY (`completed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_coordinator` FOREIGN KEY (`coordinator_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_offer` FOREIGN KEY (`job_offer_id`) REFERENCES `job_offers` (`job_offer_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_onboarding_template` FOREIGN KEY (`onboarding_template_id`) REFERENCES `onboarding_templates` (`onboarding_template_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_referrals
CREATE TABLE IF NOT EXISTS `employee_referrals` (
  `employee_referral_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `referring_employee_id` bigint(20) unsigned NOT NULL,
  `job_opening_id` bigint(20) unsigned DEFAULT NULL,
  `candidate_id` bigint(20) unsigned DEFAULT NULL,
  `job_application_id` bigint(20) unsigned DEFAULT NULL,
  `candidate_name` varchar(200) NOT NULL,
  `candidate_email` varchar(150) DEFAULT NULL,
  `candidate_phone` varchar(50) DEFAULT NULL,
  `relationship_to_candidate` varchar(100) DEFAULT NULL,
  `referral_comments` text DEFAULT NULL,
  `referral_status` varchar(30) NOT NULL DEFAULT 'SUBMITTED',
  `referral_bonus_amount` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `bonus_status` varchar(30) DEFAULT NULL,
  `bonus_paid_at` datetime DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_referral_id`),
  KEY `fk_employee_referral_job` (`job_opening_id`),
  KEY `fk_employee_referral_candidate` (`candidate_id`),
  KEY `fk_employee_referral_application` (`job_application_id`),
  KEY `ix_employee_referral_employee` (`referring_employee_id`),
  KEY `ix_employee_referral_status` (`company_id`,`referral_status`),
  CONSTRAINT `fk_employee_referral_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_applications` (`job_application_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_referral_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_referral_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_referral_employee` FOREIGN KEY (`referring_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_referral_job` FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings` (`job_opening_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_rewards
CREATE TABLE IF NOT EXISTS `employee_rewards` (
  `employee_reward_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `performance_review_id` bigint(20) unsigned DEFAULT NULL,
  `reward_number` varchar(60) NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_title` varchar(200) NOT NULL,
  `reward_description` longtext DEFAULT NULL,
  `reward_date` date NOT NULL,
  `monetary_amount` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `certificate_storage_path` varchar(700) DEFAULT NULL,
  `is_public_recognition` tinyint(1) NOT NULL DEFAULT 1,
  `nominated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `reward_status` varchar(30) NOT NULL DEFAULT 'APPROVED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_reward_id`),
  UNIQUE KEY `uq_company_reward_number` (`company_id`,`reward_number`),
  KEY `fk_employee_reward_review` (`performance_review_id`),
  KEY `fk_employee_reward_nominated_by` (`nominated_by_user_id`),
  KEY `fk_employee_reward_approved_by` (`approved_by_user_id`),
  KEY `ix_employee_reward_employee` (`employee_id`,`reward_date`),
  KEY `ix_employee_reward_company` (`company_id`,`reward_status`),
  CONSTRAINT `fk_employee_reward_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_reward_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_reward_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_reward_nominated_by` FOREIGN KEY (`nominated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_reward_review` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`performance_review_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_salary_assignments
CREATE TABLE IF NOT EXISTS `employee_salary_assignments` (
  `salary_assignment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `salary_structure_id` bigint(20) unsigned NOT NULL,
  `pay_grade_id` bigint(20) unsigned DEFAULT NULL,
  `bank_account_id` bigint(20) unsigned DEFAULT NULL,
  `payroll_frequency` varchar(30) NOT NULL DEFAULT 'MONTHLY',
  `payment_method` varchar(30) NOT NULL DEFAULT 'BANK_TRANSFER',
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `basic_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reference_gross_salary` decimal(15,2) DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `assignment_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`salary_assignment_id`),
  UNIQUE KEY `uq_employee_salary_effective` (`employee_id`,`effective_from`),
  KEY `fk_salary_assignment_grade` (`pay_grade_id`),
  KEY `fk_salary_assignment_bank` (`bank_account_id`),
  KEY `fk_salary_assignment_approved_by` (`approved_by_user_id`),
  KEY `ix_salary_assignment_employee` (`employee_id`,`is_current`),
  KEY `ix_salary_assignment_structure` (`salary_structure_id`),
  KEY `ix_salary_assignment_company` (`company_id`,`assignment_status`),
  CONSTRAINT `fk_salary_assignment_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_salary_assignment_bank` FOREIGN KEY (`bank_account_id`) REFERENCES `employee_bank_accounts` (`bank_account_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_salary_assignment_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_salary_assignment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_salary_assignment_grade` FOREIGN KEY (`pay_grade_id`) REFERENCES `pay_grades` (`pay_grade_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_salary_assignment_structure` FOREIGN KEY (`salary_structure_id`) REFERENCES `salary_structures` (`salary_structure_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_salary_components
CREATE TABLE IF NOT EXISTS `employee_salary_components` (
  `employee_salary_component_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `salary_assignment_id` bigint(20) unsigned NOT NULL,
  `pay_component_id` bigint(20) unsigned NOT NULL,
  `base_component_id` bigint(20) unsigned DEFAULT NULL,
  `calculation_type` varchar(40) NOT NULL DEFAULT 'FIXED',
  `fixed_amount` decimal(15,2) DEFAULT NULL,
  `percentage_value` decimal(8,4) DEFAULT NULL,
  `formula_expression` text DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_salary_component_id`),
  UNIQUE KEY `uq_emp_salary_component_effective` (`salary_assignment_id`,`pay_component_id`,`effective_from`),
  KEY `fk_emp_salary_component_component` (`pay_component_id`),
  KEY `fk_emp_salary_component_base` (`base_component_id`),
  KEY `ix_emp_salary_component_assignment` (`salary_assignment_id`),
  CONSTRAINT `fk_emp_salary_component_assignment` FOREIGN KEY (`salary_assignment_id`) REFERENCES `employee_salary_assignments` (`salary_assignment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_salary_component_base` FOREIGN KEY (`base_component_id`) REFERENCES `pay_components` (`pay_component_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_salary_component_component` FOREIGN KEY (`pay_component_id`) REFERENCES `pay_components` (`pay_component_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_shift_assignments
CREATE TABLE IF NOT EXISTS `employee_shift_assignments` (
  `shift_assignment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `shift_id` bigint(20) unsigned NOT NULL,
  `schedule_id` bigint(20) unsigned DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `assignment_type` varchar(30) NOT NULL DEFAULT 'REGULAR',
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `assigned_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`shift_assignment_id`),
  UNIQUE KEY `uq_employee_shift_effective` (`employee_id`,`shift_id`,`effective_from`),
  KEY `fk_employee_shift_shift` (`shift_id`),
  KEY `fk_employee_shift_schedule` (`schedule_id`),
  KEY `fk_employee_shift_assigned_by` (`assigned_by_user_id`),
  KEY `ix_employee_shift_employee` (`employee_id`),
  KEY `ix_employee_shift_current` (`employee_id`,`is_current`),
  KEY `ix_employee_shift_dates` (`effective_from`,`effective_to`),
  CONSTRAINT `fk_employee_shift_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_shift_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_shift_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `work_schedules` (`schedule_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_shift_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_skills
CREATE TABLE IF NOT EXISTS `employee_skills` (
  `employee_skill_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `skill_id` bigint(20) unsigned NOT NULL,
  `proficiency_level` decimal(5,2) NOT NULL DEFAULT 0.00,
  `target_proficiency_level` decimal(5,2) DEFAULT NULL,
  `years_of_experience` decimal(6,2) DEFAULT NULL,
  `source_type` varchar(40) NOT NULL DEFAULT 'SELF_REPORTED',
  `is_primary_skill` tinyint(1) NOT NULL DEFAULT 0,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `verified_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `last_assessed_at` datetime DEFAULT NULL,
  `next_assessment_date` date DEFAULT NULL,
  `evidence_storage_path` varchar(700) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_skill_id`),
  UNIQUE KEY `uq_employee_skill` (`employee_id`,`skill_id`),
  KEY `fk_employee_skill_verified_by` (`verified_by_user_id`),
  KEY `ix_employee_skill_company` (`company_id`),
  KEY `ix_employee_skill_proficiency` (`skill_id`,`proficiency_level`),
  KEY `ix_employee_skill_verified` (`company_id`,`is_verified`),
  CONSTRAINT `fk_employee_skill_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_skill_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_skill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_skill_verified_by` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_statuses
CREATE TABLE IF NOT EXISTS `employee_statuses` (
  `employee_status_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `status_code` varchar(50) NOT NULL,
  `status_name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_active_employment` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_status_id`),
  UNIQUE KEY `uq_employee_status_code` (`status_code`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_tax_profiles
CREATE TABLE IF NOT EXISTS `employee_tax_profiles` (
  `employee_tax_profile_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `tax_rule_id` bigint(20) unsigned NOT NULL,
  `tax_identifier` varchar(100) DEFAULT NULL,
  `taxpayer_status` varchar(40) NOT NULL DEFAULT 'FILER',
  `annual_tax_credit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `annual_tax_exemption` decimal(15,2) NOT NULL DEFAULT 0.00,
  `additional_tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_tax_profile_id`),
  UNIQUE KEY `uq_employee_tax_effective` (`employee_id`,`effective_from`),
  KEY `fk_employee_tax_company` (`company_id`),
  KEY `fk_employee_tax_rule` (`tax_rule_id`),
  KEY `ix_employee_tax_current` (`employee_id`,`is_current`),
  CONSTRAINT `fk_employee_tax_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_tax_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_tax_rule` FOREIGN KEY (`tax_rule_id`) REFERENCES `tax_rules` (`tax_rule_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employee_warnings
CREATE TABLE IF NOT EXISTS `employee_warnings` (
  `employee_warning_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `disciplinary_case_id` bigint(20) unsigned DEFAULT NULL,
  `warning_number` varchar(60) NOT NULL,
  `warning_type` varchar(40) NOT NULL,
  `warning_title` varchar(200) NOT NULL,
  `warning_reason` longtext NOT NULL,
  `issue_date` date NOT NULL,
  `effective_until` date DEFAULT NULL,
  `expected_corrective_action` longtext DEFAULT NULL,
  `consequences_of_repetition` longtext DEFAULT NULL,
  `warning_letter_storage_path` varchar(700) DEFAULT NULL,
  `issued_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `employee_acknowledged_at` datetime DEFAULT NULL,
  `employee_comments` longtext DEFAULT NULL,
  `warning_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_warning_id`),
  UNIQUE KEY `uq_company_warning_number` (`company_id`,`warning_number`),
  KEY `fk_employee_warning_case` (`disciplinary_case_id`),
  KEY `fk_employee_warning_issued_by` (`issued_by_user_id`),
  KEY `fk_employee_warning_approved_by` (`approved_by_user_id`),
  KEY `ix_employee_warning_employee` (`employee_id`,`warning_status`),
  KEY `ix_employee_warning_issue_date` (`issue_date`),
  CONSTRAINT `fk_employee_warning_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_warning_case` FOREIGN KEY (`disciplinary_case_id`) REFERENCES `disciplinary_cases` (`disciplinary_case_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_warning_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_warning_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_warning_issued_by` FOREIGN KEY (`issued_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employees
CREATE TABLE IF NOT EXISTS `employees` (
  `employee_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `preferred_name` varchar(100) DEFAULT NULL,
  `father_name` varchar(150) DEFAULT NULL,
  `spouse_name` varchar(150) DEFAULT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `marital_status` varchar(30) DEFAULT NULL,
  `blood_group` varchar(10) DEFAULT NULL,
  `nationality` varchar(80) NOT NULL DEFAULT 'Pakistani',
  `cnic_number` varchar(20) DEFAULT NULL,
  `passport_number` varchar(50) DEFAULT NULL,
  `personal_email` varchar(150) DEFAULT NULL,
  `official_email` varchar(150) DEFAULT NULL,
  `mobile_number` varchar(50) DEFAULT NULL,
  `alternate_number` varchar(50) DEFAULT NULL,
  `employment_type_id` smallint(5) unsigned NOT NULL,
  `employee_status_id` smallint(5) unsigned NOT NULL,
  `joining_date` date NOT NULL,
  `probation_end_date` date DEFAULT NULL,
  `confirmation_date` date DEFAULT NULL,
  `contract_start_date` date DEFAULT NULL,
  `contract_end_date` date DEFAULT NULL,
  `resignation_date` date DEFAULT NULL,
  `last_working_date` date DEFAULT NULL,
  `profile_photo_path` varchar(500) DEFAULT NULL,
  `biometric_identifier` varchar(100) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `uq_company_employee_code` (`company_id`,`employee_code`),
  UNIQUE KEY `uq_company_employee_cnic` (`company_id`,`cnic_number`),
  UNIQUE KEY `uq_company_employee_official_email` (`company_id`,`official_email`),
  KEY `fk_employee_status` (`employee_status_id`),
  KEY `ix_employee_company` (`company_id`),
  KEY `ix_employee_status` (`company_id`,`employee_status_id`),
  KEY `ix_employee_type` (`employment_type_id`),
  KEY `ix_employee_name` (`company_id`,`first_name`,`last_name`),
  KEY `ix_employee_joining_date` (`joining_date`),
  KEY `ix_employee_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_employee_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_status` FOREIGN KEY (`employee_status_id`) REFERENCES `employee_statuses` (`employee_status_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_type` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`employment_type_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.employment_types
CREATE TABLE IF NOT EXISTS `employment_types` (
  `employment_type_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `type_code` varchar(50) NOT NULL,
  `type_name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employment_type_id`),
  UNIQUE KEY `uq_employment_type_code` (`type_code`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.exit_interviews
CREATE TABLE IF NOT EXISTS `exit_interviews` (
  `exit_interview_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_offboarding_id` bigint(20) unsigned NOT NULL,
  `interview_date` date DEFAULT NULL,
  `interviewer_user_id` bigint(20) unsigned DEFAULT NULL,
  `primary_reason_code` varchar(50) DEFAULT NULL,
  `overall_experience_rating` decimal(5,2) DEFAULT NULL,
  `manager_rating` decimal(5,2) DEFAULT NULL,
  `compensation_rating` decimal(5,2) DEFAULT NULL,
  `work_environment_rating` decimal(5,2) DEFAULT NULL,
  `would_recommend_company` tinyint(1) DEFAULT NULL,
  `would_consider_rejoining` tinyint(1) DEFAULT NULL,
  `feedback_summary` longtext DEFAULT NULL,
  `suggested_improvements` longtext DEFAULT NULL,
  `interview_status` varchar(30) NOT NULL DEFAULT 'SCHEDULED',
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`exit_interview_id`),
  UNIQUE KEY `uq_exit_interview_offboarding` (`employee_offboarding_id`),
  KEY `fk_exit_interview_user` (`interviewer_user_id`),
  CONSTRAINT `fk_exit_interview_offboarding` FOREIGN KEY (`employee_offboarding_id`) REFERENCES `employee_offboardings` (`employee_offboarding_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_exit_interview_user` FOREIGN KEY (`interviewer_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.expense_categories
CREATE TABLE IF NOT EXISTS `expense_categories` (
  `expense_category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `category_code` varchar(50) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `default_limit_amount` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `receipt_required` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`expense_category_id`),
  UNIQUE KEY `uq_expense_category_code` (`company_id`,`category_code`),
  CONSTRAINT `fk_expense_category_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.expense_claim_items
CREATE TABLE IF NOT EXISTS `expense_claim_items` (
  `expense_claim_item_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `expense_claim_id` bigint(20) unsigned NOT NULL,
  `expense_category_id` bigint(20) unsigned NOT NULL,
  `expense_date` date NOT NULL,
  `description` varchar(1000) NOT NULL,
  `merchant_name` varchar(200) DEFAULT NULL,
  `requested_amount` decimal(15,2) NOT NULL,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `receipt_storage_path` varchar(700) DEFAULT NULL,
  `item_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `review_notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`expense_claim_item_id`),
  KEY `fk_expense_item_category` (`expense_category_id`),
  KEY `ix_expense_item_claim` (`expense_claim_id`),
  CONSTRAINT `fk_expense_item_category` FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories` (`expense_category_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_expense_item_claim` FOREIGN KEY (`expense_claim_id`) REFERENCES `expense_claims` (`expense_claim_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.expense_claims
CREATE TABLE IF NOT EXISTS `expense_claims` (
  `expense_claim_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `travel_request_id` bigint(20) unsigned DEFAULT NULL,
  `payroll_period_id` bigint(20) unsigned DEFAULT NULL,
  `claim_number` varchar(60) NOT NULL,
  `claim_title` varchar(200) NOT NULL,
  `claim_date` date NOT NULL,
  `total_requested_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_approved_amount` decimal(18,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `claim_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `submitted_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `final_decision_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `final_decision_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`expense_claim_id`),
  UNIQUE KEY `uq_expense_claim_number` (`company_id`,`claim_number`),
  KEY `fk_expense_claim_employee` (`employee_id`),
  KEY `fk_expense_claim_travel` (`travel_request_id`),
  KEY `fk_expense_claim_period` (`payroll_period_id`),
  KEY `fk_expense_claim_submitter` (`submitted_by_user_id`),
  KEY `fk_expense_claim_decider` (`final_decision_by_user_id`),
  KEY `ix_expense_claim_status` (`company_id`,`claim_status`),
  CONSTRAINT `fk_expense_claim_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_expense_claim_decider` FOREIGN KEY (`final_decision_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_expense_claim_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_expense_claim_period` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`payroll_period_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_expense_claim_submitter` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_expense_claim_travel` FOREIGN KEY (`travel_request_id`) REFERENCES `travel_requests` (`travel_request_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.expense_reimbursements
CREATE TABLE IF NOT EXISTS `expense_reimbursements` (
  `reimbursement_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `payroll_period_id` bigint(20) unsigned DEFAULT NULL,
  `payroll_run_employee_id` bigint(20) unsigned DEFAULT NULL,
  `request_number` varchar(60) NOT NULL,
  `expense_category` varchar(100) NOT NULL,
  `expense_date` date NOT NULL,
  `description` text NOT NULL,
  `requested_amount` decimal(15,2) NOT NULL,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `reimbursement_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `receipt_path` varchar(700) DEFAULT NULL,
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approval_remarks` text DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`reimbursement_id`),
  UNIQUE KEY `uq_company_reimbursement_number` (`company_id`,`request_number`),
  KEY `fk_reimbursement_period` (`payroll_period_id`),
  KEY `fk_reimbursement_run_employee` (`payroll_run_employee_id`),
  KEY `fk_reimbursement_requested_by` (`requested_by_user_id`),
  KEY `fk_reimbursement_approved_by` (`approved_by_user_id`),
  KEY `ix_reimbursement_employee` (`employee_id`,`expense_date`),
  KEY `ix_reimbursement_status` (`company_id`,`reimbursement_status`),
  CONSTRAINT `fk_reimbursement_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reimbursement_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reimbursement_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reimbursement_period` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`payroll_period_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reimbursement_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reimbursement_run_employee` FOREIGN KEY (`payroll_run_employee_id`) REFERENCES `payroll_run_employees` (`payroll_run_employee_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.feature_flags
CREATE TABLE IF NOT EXISTS `feature_flags` (
  `feature_flag_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `feature_code` varchar(80) NOT NULL,
  `feature_name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `module_name` varchar(80) DEFAULT NULL,
  `default_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `minimum_plan_code` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`feature_flag_id`),
  UNIQUE KEY `uq_feature_flag_code` (`feature_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.final_settlement_items
CREATE TABLE IF NOT EXISTS `final_settlement_items` (
  `final_settlement_item_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `final_settlement_id` bigint(20) unsigned NOT NULL,
  `pay_component_id` bigint(20) unsigned DEFAULT NULL,
  `item_code` varchar(60) NOT NULL,
  `item_name` varchar(200) NOT NULL,
  `item_type` varchar(30) NOT NULL,
  `quantity` decimal(12,4) DEFAULT NULL,
  `rate` decimal(15,4) DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`final_settlement_item_id`),
  KEY `fk_final_settlement_item_component` (`pay_component_id`),
  KEY `ix_final_settlement_item` (`final_settlement_id`),
  CONSTRAINT `fk_final_settlement_item_component` FOREIGN KEY (`pay_component_id`) REFERENCES `pay_components` (`pay_component_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_final_settlement_item_settlement` FOREIGN KEY (`final_settlement_id`) REFERENCES `final_settlements` (`final_settlement_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.final_settlements
CREATE TABLE IF NOT EXISTS `final_settlements` (
  `final_settlement_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_offboarding_id` bigint(20) unsigned NOT NULL,
  `settlement_number` varchar(60) NOT NULL,
  `settlement_date` date NOT NULL,
  `gross_payable_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_deductions` decimal(18,2) NOT NULL DEFAULT 0.00,
  `net_payable_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `settlement_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `prepared_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `payment_reference` varchar(150) DEFAULT NULL,
  `settlement_document_path` varchar(700) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`final_settlement_id`),
  UNIQUE KEY `uq_final_settlement_number` (`company_id`,`settlement_number`),
  UNIQUE KEY `uq_final_settlement_offboarding` (`employee_offboarding_id`),
  KEY `fk_final_settlement_preparer` (`prepared_by_user_id`),
  KEY `fk_final_settlement_approver` (`approved_by_user_id`),
  CONSTRAINT `fk_final_settlement_approver` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_final_settlement_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_final_settlement_offboarding` FOREIGN KEY (`employee_offboarding_id`) REFERENCES `employee_offboardings` (`employee_offboarding_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_final_settlement_preparer` FOREIGN KEY (`prepared_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.form_definitions
CREATE TABLE IF NOT EXISTS `form_definitions` (
  `form_definition_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `form_code` varchar(60) NOT NULL,
  `form_name` varchar(200) NOT NULL,
  `module_name` varchar(80) NOT NULL,
  `entity_type` varchar(80) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `version_number` varchar(30) NOT NULL DEFAULT '1.0',
  `form_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`form_definition_id`),
  UNIQUE KEY `uq_form_definition` (`company_id`,`form_code`,`version_number`),
  KEY `fk_form_definition_user` (`created_by_user_id`),
  CONSTRAINT `fk_form_definition_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_form_definition_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.form_fields
CREATE TABLE IF NOT EXISTS `form_fields` (
  `form_field_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `form_definition_id` bigint(20) unsigned NOT NULL,
  `field_code` varchar(60) NOT NULL,
  `field_label` varchar(200) NOT NULL,
  `field_type` varchar(40) NOT NULL,
  `help_text` text DEFAULT NULL,
  `placeholder_text` varchar(250) DEFAULT NULL,
  `default_value` longtext DEFAULT NULL,
  `option_payload` longtext DEFAULT NULL,
  `validation_rules` longtext DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 0,
  `sequence_number` smallint(5) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`form_field_id`),
  UNIQUE KEY `uq_form_field_code` (`form_definition_id`,`field_code`),
  UNIQUE KEY `uq_form_field_sequence` (`form_definition_id`,`sequence_number`),
  CONSTRAINT `fk_form_field_definition` FOREIGN KEY (`form_definition_id`) REFERENCES `form_definitions` (`form_definition_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.form_submission_values
CREATE TABLE IF NOT EXISTS `form_submission_values` (
  `form_submission_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `form_submission_id` bigint(20) unsigned NOT NULL,
  `form_field_id` bigint(20) unsigned NOT NULL,
  `value_text` longtext DEFAULT NULL,
  `value_number` decimal(20,6) DEFAULT NULL,
  `value_date` date DEFAULT NULL,
  `value_datetime` datetime DEFAULT NULL,
  `value_boolean` tinyint(1) DEFAULT NULL,
  `value_file_path` varchar(700) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`form_submission_value_id`),
  UNIQUE KEY `uq_form_submission_value` (`form_submission_id`,`form_field_id`),
  KEY `fk_form_value_field` (`form_field_id`),
  CONSTRAINT `fk_form_value_field` FOREIGN KEY (`form_field_id`) REFERENCES `form_fields` (`form_field_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_form_value_submission` FOREIGN KEY (`form_submission_id`) REFERENCES `form_submissions` (`form_submission_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.form_submissions
CREATE TABLE IF NOT EXISTS `form_submissions` (
  `form_submission_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `form_definition_id` bigint(20) unsigned NOT NULL,
  `submission_number` varchar(60) NOT NULL,
  `entity_type` varchar(80) DEFAULT NULL,
  `entity_id` bigint(20) unsigned DEFAULT NULL,
  `submitted_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `submission_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `submitted_at` datetime DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`form_submission_id`),
  UNIQUE KEY `uq_form_submission_number` (`company_id`,`submission_number`),
  KEY `fk_form_submission_definition` (`form_definition_id`),
  KEY `fk_form_submission_submitter` (`submitted_by_user_id`),
  KEY `fk_form_submission_approver` (`approved_by_user_id`),
  CONSTRAINT `fk_form_submission_approver` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_form_submission_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_form_submission_definition` FOREIGN KEY (`form_definition_id`) REFERENCES `form_definitions` (`form_definition_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_form_submission_submitter` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.goal_progress_updates
CREATE TABLE IF NOT EXISTS `goal_progress_updates` (
  `goal_progress_update_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_goal_id` bigint(20) unsigned NOT NULL,
  `progress_date` date NOT NULL,
  `previous_value` decimal(18,4) DEFAULT NULL,
  `updated_value` decimal(18,4) DEFAULT NULL,
  `previous_progress_percentage` decimal(6,2) DEFAULT NULL,
  `updated_progress_percentage` decimal(6,2) NOT NULL,
  `update_notes` text DEFAULT NULL,
  `evidence_storage_path` varchar(700) DEFAULT NULL,
  `submitted_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`goal_progress_update_id`),
  KEY `fk_goal_progress_submitted_by` (`submitted_by_user_id`),
  KEY `ix_goal_progress_goal_date` (`employee_goal_id`,`progress_date`),
  CONSTRAINT `fk_goal_progress_goal` FOREIGN KEY (`employee_goal_id`) REFERENCES `employee_goals` (`employee_goal_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_goal_progress_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.holidays
CREATE TABLE IF NOT EXISTS `holidays` (
  `holiday_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `holiday_name` varchar(150) NOT NULL,
  `holiday_date` date NOT NULL,
  `holiday_type` varchar(30) NOT NULL DEFAULT 'PUBLIC',
  `description` varchar(500) DEFAULT NULL,
  `is_optional` tinyint(1) NOT NULL DEFAULT 0,
  `is_paid` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`holiday_id`),
  KEY `ix_holiday_company_date` (`company_id`,`holiday_date`),
  KEY `ix_holiday_branch_date` (`branch_id`,`holiday_date`),
  CONSTRAINT `fk_holiday_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_holiday_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.hr_service_categories
CREATE TABLE IF NOT EXISTS `hr_service_categories` (
  `service_category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `category_code` varchar(50) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `default_assignee_role_id` bigint(20) unsigned DEFAULT NULL,
  `service_level_hours` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`service_category_id`),
  UNIQUE KEY `uq_hr_service_category_code` (`company_id`,`category_code`),
  KEY `fk_hr_service_category_role` (`default_assignee_role_id`),
  CONSTRAINT `fk_hr_service_category_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hr_service_category_role` FOREIGN KEY (`default_assignee_role_id`) REFERENCES `roles` (`role_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.hr_service_requests
CREATE TABLE IF NOT EXISTS `hr_service_requests` (
  `service_request_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `service_category_id` bigint(20) unsigned NOT NULL,
  `request_number` varchar(60) NOT NULL,
  `request_subject` varchar(250) NOT NULL,
  `request_description` longtext NOT NULL,
  `priority_level` varchar(30) NOT NULL DEFAULT 'NORMAL',
  `request_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `assigned_to_user_id` bigint(20) unsigned DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `satisfaction_rating` decimal(5,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`service_request_id`),
  UNIQUE KEY `uq_hr_service_request_number` (`company_id`,`request_number`),
  KEY `fk_hr_service_request_employee` (`employee_id`),
  KEY `fk_hr_service_request_category` (`service_category_id`),
  KEY `fk_hr_service_request_user` (`assigned_to_user_id`),
  KEY `ix_hr_service_request_status` (`company_id`,`request_status`),
  CONSTRAINT `fk_hr_service_request_category` FOREIGN KEY (`service_category_id`) REFERENCES `hr_service_categories` (`service_category_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_hr_service_request_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hr_service_request_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hr_service_request_user` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.hse_incident_actions
CREATE TABLE IF NOT EXISTS `hse_incident_actions` (
  `hse_action_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `hse_incident_id` bigint(20) unsigned NOT NULL,
  `action_title` varchar(250) NOT NULL,
  `action_description` longtext NOT NULL,
  `assigned_to_user_id` bigint(20) unsigned DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `action_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `completed_at` datetime DEFAULT NULL,
  `evidence_storage_path` varchar(700) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`hse_action_id`),
  KEY `fk_hse_action_incident` (`hse_incident_id`),
  KEY `fk_hse_action_user` (`assigned_to_user_id`),
  KEY `ix_hse_action_status` (`action_status`,`due_date`),
  CONSTRAINT `fk_hse_action_incident` FOREIGN KEY (`hse_incident_id`) REFERENCES `hse_incidents` (`hse_incident_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hse_action_user` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.hse_incidents
CREATE TABLE IF NOT EXISTS `hse_incidents` (
  `hse_incident_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `incident_number` varchar(60) NOT NULL,
  `incident_type` varchar(80) NOT NULL,
  `severity_level` varchar(30) NOT NULL DEFAULT 'LOW',
  `incident_date` date NOT NULL,
  `incident_time` time DEFAULT NULL,
  `incident_location` varchar(255) DEFAULT NULL,
  `incident_description` longtext NOT NULL,
  `immediate_action_taken` longtext DEFAULT NULL,
  `lost_time_hours` decimal(10,2) NOT NULL DEFAULT 0.00,
  `medical_treatment_required` tinyint(1) NOT NULL DEFAULT 0,
  `reportable_to_authority` tinyint(1) NOT NULL DEFAULT 0,
  `incident_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `reported_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `investigator_user_id` bigint(20) unsigned DEFAULT NULL,
  `root_cause_analysis` longtext DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`hse_incident_id`),
  UNIQUE KEY `uq_hse_incident_number` (`company_id`,`incident_number`),
  KEY `fk_hse_incident_branch` (`branch_id`),
  KEY `fk_hse_incident_employee` (`employee_id`),
  KEY `fk_hse_incident_reporter` (`reported_by_user_id`),
  KEY `fk_hse_incident_investigator` (`investigator_user_id`),
  KEY `ix_hse_incident_status` (`company_id`,`incident_status`),
  CONSTRAINT `fk_hse_incident_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_hse_incident_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hse_incident_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_hse_incident_investigator` FOREIGN KEY (`investigator_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_hse_incident_reporter` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.integration_connections
CREATE TABLE IF NOT EXISTS `integration_connections` (
  `integration_connection_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `integration_code` varchar(60) NOT NULL,
  `integration_name` varchar(200) NOT NULL,
  `integration_type` varchar(80) NOT NULL,
  `provider_name` varchar(150) DEFAULT NULL,
  `connection_settings` longtext DEFAULT NULL,
  `credential_reference` varchar(500) DEFAULT NULL,
  `sync_direction` varchar(30) NOT NULL DEFAULT 'BIDIRECTIONAL',
  `sync_frequency` varchar(30) DEFAULT NULL,
  `last_sync_at` datetime DEFAULT NULL,
  `next_sync_at` datetime DEFAULT NULL,
  `connection_status` varchar(30) NOT NULL DEFAULT 'INACTIVE',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`integration_connection_id`),
  UNIQUE KEY `uq_integration_connection_code` (`company_id`,`integration_code`),
  KEY `fk_integration_connection_user` (`created_by_user_id`),
  CONSTRAINT `fk_integration_connection_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_integration_connection_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.interview_evaluations
CREATE TABLE IF NOT EXISTS `interview_evaluations` (
  `interview_evaluation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `interview_id` bigint(20) unsigned NOT NULL,
  `evaluator_user_id` bigint(20) unsigned NOT NULL,
  `technical_score` decimal(6,2) DEFAULT NULL,
  `communication_score` decimal(6,2) DEFAULT NULL,
  `cultural_fit_score` decimal(6,2) DEFAULT NULL,
  `experience_score` decimal(6,2) DEFAULT NULL,
  `overall_score` decimal(6,2) DEFAULT NULL,
  `recommendation` varchar(40) NOT NULL,
  `strengths` text DEFAULT NULL,
  `concerns` text DEFAULT NULL,
  `detailed_comments` longtext DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `is_finalized` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`interview_evaluation_id`),
  UNIQUE KEY `uq_interview_evaluator` (`interview_id`,`evaluator_user_id`),
  KEY `fk_interview_evaluation_user` (`evaluator_user_id`),
  KEY `ix_interview_evaluation_recommendation` (`recommendation`),
  CONSTRAINT `fk_interview_evaluation_interview` FOREIGN KEY (`interview_id`) REFERENCES `interviews` (`interview_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_interview_evaluation_user` FOREIGN KEY (`evaluator_user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.interview_panel_members
CREATE TABLE IF NOT EXISTS `interview_panel_members` (
  `interview_panel_member_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `interview_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `external_panelist_name` varchar(150) DEFAULT NULL,
  `external_panelist_email` varchar(150) DEFAULT NULL,
  `panel_role` varchar(50) NOT NULL DEFAULT 'INTERVIEWER',
  `is_lead_interviewer` tinyint(1) NOT NULL DEFAULT 0,
  `attendance_required` tinyint(1) NOT NULL DEFAULT 1,
  `invitation_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `responded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`interview_panel_member_id`),
  KEY `fk_interview_panel_employee` (`employee_id`),
  KEY `ix_interview_panel_interview` (`interview_id`),
  KEY `ix_interview_panel_user` (`user_id`),
  CONSTRAINT `fk_interview_panel_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_interview_panel_interview` FOREIGN KEY (`interview_id`) REFERENCES `interviews` (`interview_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_interview_panel_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.interviews
CREATE TABLE IF NOT EXISTS `interviews` (
  `interview_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `job_application_id` bigint(20) unsigned NOT NULL,
  `interview_round` smallint(5) unsigned NOT NULL DEFAULT 1,
  `interview_title` varchar(200) NOT NULL,
  `interview_type` varchar(50) NOT NULL DEFAULT 'IN_PERSON',
  `scheduled_start_at` datetime NOT NULL,
  `scheduled_end_at` datetime NOT NULL,
  `timezone` varchar(60) NOT NULL DEFAULT 'Asia/Karachi',
  `physical_location` varchar(255) DEFAULT NULL,
  `meeting_url` varchar(700) DEFAULT NULL,
  `meeting_id` varchar(150) DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `interview_status` varchar(30) NOT NULL DEFAULT 'SCHEDULED',
  `organized_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `candidate_confirmed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`interview_id`),
  KEY `fk_interview_organized_by` (`organized_by_user_id`),
  KEY `ix_interview_application` (`job_application_id`),
  KEY `ix_interview_schedule` (`company_id`,`scheduled_start_at`),
  KEY `ix_interview_status` (`company_id`,`interview_status`),
  CONSTRAINT `fk_interview_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_applications` (`job_application_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_interview_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_interview_organized_by` FOREIGN KEY (`organized_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.job_applications
CREATE TABLE IF NOT EXISTS `job_applications` (
  `job_application_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `application_number` varchar(60) NOT NULL,
  `job_opening_id` bigint(20) unsigned NOT NULL,
  `candidate_id` bigint(20) unsigned NOT NULL,
  `candidate_source_id` bigint(20) unsigned DEFAULT NULL,
  `referred_by_employee_id` bigint(20) unsigned DEFAULT NULL,
  `current_stage_id` bigint(20) unsigned DEFAULT NULL,
  `applied_at` datetime NOT NULL DEFAULT current_timestamp(),
  `cover_letter` longtext DEFAULT NULL,
  `expected_salary` decimal(15,2) DEFAULT NULL,
  `salary_currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `notice_period_days` smallint(5) unsigned DEFAULT NULL,
  `screening_score` decimal(6,2) DEFAULT NULL,
  `overall_score` decimal(6,2) DEFAULT NULL,
  `application_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `rejection_reason_code` varchar(50) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `rejected_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `withdrawn_by_candidate` tinyint(1) NOT NULL DEFAULT 0,
  `withdrawn_at` datetime DEFAULT NULL,
  `withdrawal_reason` text DEFAULT NULL,
  `hired_employee_id` bigint(20) unsigned DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`job_application_id`),
  UNIQUE KEY `uq_company_application_number` (`company_id`,`application_number`),
  UNIQUE KEY `uq_candidate_job_application` (`job_opening_id`,`candidate_id`),
  KEY `fk_application_source` (`candidate_source_id`),
  KEY `fk_application_referring_employee` (`referred_by_employee_id`),
  KEY `fk_application_current_stage` (`current_stage_id`),
  KEY `fk_application_rejected_by` (`rejected_by_user_id`),
  KEY `fk_application_hired_employee` (`hired_employee_id`),
  KEY `fk_application_created_by` (`created_by_user_id`),
  KEY `ix_application_company_status` (`company_id`,`application_status`),
  KEY `ix_application_job_stage` (`job_opening_id`,`current_stage_id`),
  KEY `ix_application_candidate` (`candidate_id`),
  KEY `ix_application_applied_at` (`applied_at`),
  CONSTRAINT `fk_application_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_application_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_application_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_application_current_stage` FOREIGN KEY (`current_stage_id`) REFERENCES `recruitment_stages` (`recruitment_stage_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_application_hired_employee` FOREIGN KEY (`hired_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_application_job_opening` FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings` (`job_opening_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_application_referring_employee` FOREIGN KEY (`referred_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_application_rejected_by` FOREIGN KEY (`rejected_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_application_source` FOREIGN KEY (`candidate_source_id`) REFERENCES `candidate_sources` (`candidate_source_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.job_offer_approvals
CREATE TABLE IF NOT EXISTS `job_offer_approvals` (
  `job_offer_approval_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `job_offer_id` bigint(20) unsigned NOT NULL,
  `approval_level` smallint(5) unsigned NOT NULL DEFAULT 1,
  `approver_user_id` bigint(20) unsigned NOT NULL,
  `decision` varchar(30) NOT NULL DEFAULT 'PENDING',
  `comments` text DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `is_final_level` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`job_offer_approval_id`),
  UNIQUE KEY `uq_job_offer_approval_level` (`job_offer_id`,`approval_level`,`approver_user_id`),
  KEY `ix_job_offer_approval_user` (`approver_user_id`,`decision`),
  CONSTRAINT `fk_job_offer_approval_offer` FOREIGN KEY (`job_offer_id`) REFERENCES `job_offers` (`job_offer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_approval_user` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.job_offers
CREATE TABLE IF NOT EXISTS `job_offers` (
  `job_offer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `offer_number` varchar(60) NOT NULL,
  `job_application_id` bigint(20) unsigned NOT NULL,
  `offer_version` smallint(5) unsigned NOT NULL DEFAULT 1,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `employment_type_id` smallint(5) unsigned DEFAULT NULL,
  `reporting_manager_employee_id` bigint(20) unsigned DEFAULT NULL,
  `proposed_joining_date` date NOT NULL,
  `probation_months` smallint(5) unsigned DEFAULT NULL,
  `contract_start_date` date DEFAULT NULL,
  `contract_end_date` date DEFAULT NULL,
  `basic_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `gross_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `payroll_frequency` varchar(30) NOT NULL DEFAULT 'MONTHLY',
  `offer_expiry_date` date DEFAULT NULL,
  `offer_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `offer_letter_storage_path` varchar(700) DEFAULT NULL,
  `offer_letter_checksum` char(64) DEFAULT NULL,
  `prepared_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `issued_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `declined_at` datetime DEFAULT NULL,
  `decline_reason` text DEFAULT NULL,
  `withdrawn_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `withdrawn_at` datetime DEFAULT NULL,
  `withdrawal_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`job_offer_id`),
  UNIQUE KEY `uq_company_offer_number` (`company_id`,`offer_number`),
  UNIQUE KEY `uq_application_offer_version` (`job_application_id`,`offer_version`),
  KEY `fk_job_offer_designation` (`designation_id`),
  KEY `fk_job_offer_department` (`department_id`),
  KEY `fk_job_offer_branch` (`branch_id`),
  KEY `fk_job_offer_employment_type` (`employment_type_id`),
  KEY `fk_job_offer_reporting_manager` (`reporting_manager_employee_id`),
  KEY `fk_job_offer_prepared_by` (`prepared_by_user_id`),
  KEY `fk_job_offer_issued_by` (`issued_by_user_id`),
  KEY `fk_job_offer_withdrawn_by` (`withdrawn_by_user_id`),
  KEY `ix_job_offer_company_status` (`company_id`,`offer_status`),
  KEY `ix_job_offer_application` (`job_application_id`),
  CONSTRAINT `fk_job_offer_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_applications` (`job_application_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_employment_type` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`employment_type_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_issued_by` FOREIGN KEY (`issued_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_prepared_by` FOREIGN KEY (`prepared_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_reporting_manager` FOREIGN KEY (`reporting_manager_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_offer_withdrawn_by` FOREIGN KEY (`withdrawn_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.job_opening_stages
CREATE TABLE IF NOT EXISTS `job_opening_stages` (
  `job_opening_stage_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `job_opening_id` bigint(20) unsigned NOT NULL,
  `recruitment_stage_id` bigint(20) unsigned NOT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL,
  `target_completion_days` smallint(5) unsigned DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`job_opening_stage_id`),
  UNIQUE KEY `uq_job_opening_stage` (`job_opening_id`,`recruitment_stage_id`),
  UNIQUE KEY `uq_job_opening_stage_sequence` (`job_opening_id`,`sequence_number`),
  KEY `fk_job_opening_stage_stage` (`recruitment_stage_id`),
  CONSTRAINT `fk_job_opening_stage_opening` FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings` (`job_opening_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_opening_stage_stage` FOREIGN KEY (`recruitment_stage_id`) REFERENCES `recruitment_stages` (`recruitment_stage_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.job_openings
CREATE TABLE IF NOT EXISTS `job_openings` (
  `job_opening_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `job_requisition_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `employment_type_id` smallint(5) unsigned DEFAULT NULL,
  `job_code` varchar(60) NOT NULL,
  `job_title` varchar(200) NOT NULL,
  `public_slug` varchar(200) DEFAULT NULL,
  `positions_available` smallint(5) unsigned NOT NULL DEFAULT 1,
  `positions_filled` smallint(5) unsigned NOT NULL DEFAULT 0,
  `job_location` varchar(255) DEFAULT NULL,
  `workplace_type` varchar(30) NOT NULL DEFAULT 'ONSITE',
  `job_description` longtext NOT NULL,
  `responsibilities` longtext DEFAULT NULL,
  `required_qualifications` longtext DEFAULT NULL,
  `preferred_qualifications` longtext DEFAULT NULL,
  `required_skills` longtext DEFAULT NULL,
  `benefits_description` longtext DEFAULT NULL,
  `minimum_experience_years` decimal(5,2) DEFAULT NULL,
  `maximum_experience_years` decimal(5,2) DEFAULT NULL,
  `minimum_salary` decimal(15,2) DEFAULT NULL,
  `maximum_salary` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `display_salary` tinyint(1) NOT NULL DEFAULT 0,
  `publication_type` varchar(30) NOT NULL DEFAULT 'PUBLIC',
  `published_at` datetime DEFAULT NULL,
  `application_deadline` datetime DEFAULT NULL,
  `expected_joining_date` date DEFAULT NULL,
  `job_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `closure_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`job_opening_id`),
  UNIQUE KEY `uq_company_job_code` (`company_id`,`job_code`),
  UNIQUE KEY `uq_company_public_slug` (`company_id`,`public_slug`),
  KEY `fk_job_opening_requisition` (`job_requisition_id`),
  KEY `fk_job_opening_branch` (`branch_id`),
  KEY `fk_job_opening_designation` (`designation_id`),
  KEY `fk_job_opening_employment_type` (`employment_type_id`),
  KEY `fk_job_opening_created_by` (`created_by_user_id`),
  KEY `fk_job_opening_closed_by` (`closed_by_user_id`),
  KEY `ix_job_opening_company_status` (`company_id`,`job_status`),
  KEY `ix_job_opening_department` (`department_id`),
  KEY `ix_job_opening_deadline` (`application_deadline`),
  CONSTRAINT `fk_job_opening_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_opening_closed_by` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_opening_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_opening_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_opening_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_opening_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_opening_employment_type` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`employment_type_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_opening_requisition` FOREIGN KEY (`job_requisition_id`) REFERENCES `job_requisitions` (`job_requisition_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.job_requisition_approvals
CREATE TABLE IF NOT EXISTS `job_requisition_approvals` (
  `requisition_approval_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `job_requisition_id` bigint(20) unsigned NOT NULL,
  `approval_level` smallint(5) unsigned NOT NULL DEFAULT 1,
  `approver_user_id` bigint(20) unsigned NOT NULL,
  `decision` varchar(30) NOT NULL DEFAULT 'PENDING',
  `comments` text DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `is_final_level` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`requisition_approval_id`),
  UNIQUE KEY `uq_requisition_approval_level` (`job_requisition_id`,`approval_level`,`approver_user_id`),
  KEY `ix_requisition_approval_user` (`approver_user_id`,`decision`),
  CONSTRAINT `fk_requisition_approval_requisition` FOREIGN KEY (`job_requisition_id`) REFERENCES `job_requisitions` (`job_requisition_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_requisition_approval_user` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.job_requisitions
CREATE TABLE IF NOT EXISTS `job_requisitions` (
  `job_requisition_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `requisition_number` varchar(60) NOT NULL,
  `requisition_title` varchar(200) NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `employment_type_id` smallint(5) unsigned DEFAULT NULL,
  `requested_positions` smallint(5) unsigned NOT NULL DEFAULT 1,
  `filled_positions` smallint(5) unsigned NOT NULL DEFAULT 0,
  `replacement_employee_id` bigint(20) unsigned DEFAULT NULL,
  `hiring_manager_employee_id` bigint(20) unsigned DEFAULT NULL,
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `reason_for_hiring` text NOT NULL,
  `job_summary` text DEFAULT NULL,
  `responsibilities` longtext DEFAULT NULL,
  `required_qualifications` longtext DEFAULT NULL,
  `preferred_qualifications` longtext DEFAULT NULL,
  `minimum_experience_years` decimal(5,2) DEFAULT NULL,
  `maximum_experience_years` decimal(5,2) DEFAULT NULL,
  `minimum_budget` decimal(15,2) DEFAULT NULL,
  `maximum_budget` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `expected_hiring_date` date DEFAULT NULL,
  `requested_at` datetime DEFAULT NULL,
  `requisition_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `final_approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `final_approved_at` datetime DEFAULT NULL,
  `final_remarks` text DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`job_requisition_id`),
  UNIQUE KEY `uq_company_requisition_number` (`company_id`,`requisition_number`),
  KEY `fk_job_requisition_branch` (`branch_id`),
  KEY `fk_job_requisition_designation` (`designation_id`),
  KEY `fk_job_requisition_employment_type` (`employment_type_id`),
  KEY `fk_job_requisition_replacement_employee` (`replacement_employee_id`),
  KEY `fk_job_requisition_requested_by` (`requested_by_user_id`),
  KEY `fk_job_requisition_final_approved_by` (`final_approved_by_user_id`),
  KEY `ix_requisition_company_status` (`company_id`,`requisition_status`),
  KEY `ix_requisition_department` (`department_id`),
  KEY `ix_requisition_hiring_manager` (`hiring_manager_employee_id`),
  CONSTRAINT `fk_job_requisition_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_requisition_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_requisition_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_requisition_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_requisition_employment_type` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`employment_type_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_requisition_final_approved_by` FOREIGN KEY (`final_approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_requisition_hiring_manager` FOREIGN KEY (`hiring_manager_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_requisition_replacement_employee` FOREIGN KEY (`replacement_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_requisition_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.kpi_definitions
CREATE TABLE IF NOT EXISTS `kpi_definitions` (
  `kpi_definition_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `kpi_code` varchar(50) NOT NULL,
  `kpi_name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `measurement_type` varchar(40) NOT NULL DEFAULT 'NUMBER',
  `measurement_unit` varchar(50) DEFAULT NULL,
  `direction_type` varchar(30) NOT NULL DEFAULT 'HIGHER_IS_BETTER',
  `default_target_value` decimal(18,4) DEFAULT NULL,
  `default_minimum_value` decimal(18,4) DEFAULT NULL,
  `default_maximum_value` decimal(18,4) DEFAULT NULL,
  `default_weight_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `calculation_formula` text DEFAULT NULL,
  `data_source` varchar(255) DEFAULT NULL,
  `update_frequency` varchar(30) NOT NULL DEFAULT 'MONTHLY',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`kpi_definition_id`),
  UNIQUE KEY `uq_company_kpi_code` (`company_id`,`kpi_code`),
  KEY `fk_kpi_definition_designation` (`designation_id`),
  KEY `ix_kpi_definition_company` (`company_id`,`is_active`),
  KEY `ix_kpi_definition_department` (`department_id`),
  CONSTRAINT `fk_kpi_definition_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_kpi_definition_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_kpi_definition_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.learning_path_courses
CREATE TABLE IF NOT EXISTS `learning_path_courses` (
  `learning_path_course_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `learning_path_id` bigint(20) unsigned NOT NULL,
  `training_course_id` bigint(20) unsigned NOT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `target_completion_day` smallint(5) unsigned DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`learning_path_course_id`),
  UNIQUE KEY `uq_learning_path_course` (`learning_path_id`,`training_course_id`),
  UNIQUE KEY `uq_learning_path_sequence` (`learning_path_id`,`sequence_number`),
  KEY `fk_learning_path_course_course` (`training_course_id`),
  CONSTRAINT `fk_learning_path_course_course` FOREIGN KEY (`training_course_id`) REFERENCES `training_courses` (`training_course_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_learning_path_course_path` FOREIGN KEY (`learning_path_id`) REFERENCES `learning_paths` (`learning_path_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.learning_paths
CREATE TABLE IF NOT EXISTS `learning_paths` (
  `learning_path_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `path_code` varchar(60) NOT NULL,
  `path_name` varchar(250) NOT NULL,
  `description` longtext DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `employment_type_id` smallint(5) unsigned DEFAULT NULL,
  `expected_duration_days` smallint(5) unsigned DEFAULT NULL,
  `completion_percentage_required` decimal(6,2) NOT NULL DEFAULT 100.00,
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`learning_path_id`),
  UNIQUE KEY `uq_company_learning_path` (`company_id`,`path_code`),
  KEY `fk_learning_path_department` (`department_id`),
  KEY `fk_learning_path_designation` (`designation_id`),
  KEY `fk_learning_path_employment_type` (`employment_type_id`),
  KEY `fk_learning_path_created_by` (`created_by_user_id`),
  KEY `ix_learning_path_company` (`company_id`,`is_active`),
  CONSTRAINT `fk_learning_path_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_learning_path_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_learning_path_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_learning_path_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_learning_path_employment_type` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`employment_type_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.learning_settings
CREATE TABLE IF NOT EXISTS `learning_settings` (
  `learning_setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `allow_self_enrollment` tinyint(1) NOT NULL DEFAULT 1,
  `require_enrollment_approval` tinyint(1) NOT NULL DEFAULT 0,
  `allow_external_training` tinyint(1) NOT NULL DEFAULT 1,
  `require_training_request_approval` tinyint(1) NOT NULL DEFAULT 1,
  `default_currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `certificate_expiry_alert_days` smallint(5) unsigned NOT NULL DEFAULT 30,
  `course_due_reminder_days` smallint(5) unsigned NOT NULL DEFAULT 7,
  `minimum_course_completion_percentage` decimal(6,2) NOT NULL DEFAULT 100.00,
  `default_assessment_pass_score` decimal(6,2) NOT NULL DEFAULT 60.00,
  `default_assessment_attempts` smallint(5) unsigned NOT NULL DEFAULT 3,
  `require_training_feedback` tinyint(1) NOT NULL DEFAULT 1,
  `enable_training_budget` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`learning_setting_id`),
  UNIQUE KEY `uq_learning_setting_company` (`company_id`),
  CONSTRAINT `fk_learning_setting_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_accrual_run_details
CREATE TABLE IF NOT EXISTS `leave_accrual_run_details` (
  `accrual_run_detail_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `accrual_run_id` bigint(20) unsigned NOT NULL,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `leave_policy_rule_id` bigint(20) unsigned DEFAULT NULL,
  `leave_balance_id` bigint(20) unsigned DEFAULT NULL,
  `accrual_from_date` date NOT NULL,
  `accrual_to_date` date NOT NULL,
  `annual_entitlement_units` decimal(10,2) DEFAULT NULL,
  `accrual_rate_units` decimal(10,4) DEFAULT NULL,
  `proration_factor` decimal(10,6) NOT NULL DEFAULT 1.000000,
  `calculated_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `applied_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `balance_before` decimal(10,2) DEFAULT NULL,
  `balance_after` decimal(10,2) DEFAULT NULL,
  `detail_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `skip_reason` varchar(1000) DEFAULT NULL,
  `error_code` varchar(100) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `transaction_id` bigint(20) unsigned DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`accrual_run_detail_id`),
  UNIQUE KEY `uq_accrual_run_employee_leave_type` (`accrual_run_id`,`employee_id`,`leave_type_id`),
  KEY `ix_accrual_detail_company` (`company_id`),
  KEY `ix_accrual_detail_employee` (`employee_id`),
  KEY `ix_accrual_detail_leave_type` (`leave_type_id`),
  KEY `ix_accrual_detail_balance` (`leave_balance_id`),
  KEY `ix_accrual_detail_status` (`accrual_run_id`,`detail_status`),
  KEY `fk_accrual_detail_policy_rule` (`leave_policy_rule_id`),
  KEY `fk_accrual_detail_transaction` (`transaction_id`),
  CONSTRAINT `fk_accrual_detail_balance` FOREIGN KEY (`leave_balance_id`) REFERENCES `employee_leave_balances` (`leave_balance_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_detail_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_detail_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_detail_leave_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_detail_policy_rule` FOREIGN KEY (`leave_policy_rule_id`) REFERENCES `leave_policy_rules` (`leave_policy_rule_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_detail_run` FOREIGN KEY (`accrual_run_id`) REFERENCES `leave_accrual_runs` (`accrual_run_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_detail_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `leave_balance_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_accrual_runs
CREATE TABLE IF NOT EXISTS `leave_accrual_runs` (
  `accrual_run_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `leave_period_id` bigint(20) unsigned NOT NULL,
  `run_number` varchar(60) NOT NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `run_name` varchar(150) NOT NULL,
  `run_type` varchar(30) NOT NULL DEFAULT 'REGULAR',
  `accrual_method` varchar(30) NOT NULL,
  `accrual_from_date` date NOT NULL,
  `accrual_to_date` date NOT NULL,
  `posting_date` date NOT NULL,
  `run_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `is_dry_run` tinyint(1) NOT NULL DEFAULT 0,
  `total_candidates` int(10) unsigned NOT NULL DEFAULT 0,
  `processed_count` int(10) unsigned NOT NULL DEFAULT 0,
  `successful_count` int(10) unsigned NOT NULL DEFAULT 0,
  `skipped_count` int(10) unsigned NOT NULL DEFAULT 0,
  `failed_count` int(10) unsigned NOT NULL DEFAULT 0,
  `total_calculated_units` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total_applied_units` decimal(14,2) NOT NULL DEFAULT 0.00,
  `started_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancellation_reason` varchar(1000) DEFAULT NULL,
  `error_summary` text DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`accrual_run_id`),
  UNIQUE KEY `uq_company_accrual_run_number` (`company_id`,`run_number`),
  UNIQUE KEY `uq_company_accrual_idempotency` (`company_id`,`idempotency_key`),
  KEY `ix_accrual_run_company_status` (`company_id`,`run_status`),
  KEY `ix_accrual_run_period` (`leave_period_id`),
  KEY `ix_accrual_run_posting_date` (`company_id`,`posting_date`),
  KEY `fk_accrual_run_started_by` (`started_by_user_id`),
  KEY `fk_accrual_run_cancelled_by` (`cancelled_by_user_id`),
  KEY `fk_accrual_run_created_by` (`created_by_user_id`),
  CONSTRAINT `fk_accrual_run_cancelled_by` FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_run_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_run_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_run_period` FOREIGN KEY (`leave_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_accrual_run_started_by` FOREIGN KEY (`started_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_approval_delegations
CREATE TABLE IF NOT EXISTS `leave_approval_delegations` (
  `delegation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `delegator_user_id` bigint(20) unsigned NOT NULL,
  `delegate_user_id` bigint(20) unsigned NOT NULL,
  `effective_from` datetime NOT NULL,
  `effective_to` datetime NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`delegation_id`),
  KEY `fk_leave_delegation_company` (`company_id`),
  KEY `fk_leave_delegation_created_by` (`created_by_user_id`),
  KEY `ix_leave_delegation_delegator` (`delegator_user_id`,`effective_from`,`effective_to`),
  KEY `ix_leave_delegation_delegate` (`delegate_user_id`,`effective_from`,`effective_to`),
  CONSTRAINT `fk_leave_delegate_user` FOREIGN KEY (`delegate_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_delegation_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_delegation_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_delegator_user` FOREIGN KEY (`delegator_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_balance_expiries
CREATE TABLE IF NOT EXISTS `leave_balance_expiries` (
  `leave_balance_expiry_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `carry_forward_lot_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `leave_period_id` bigint(20) unsigned NOT NULL,
  `leave_balance_id` bigint(20) unsigned NOT NULL,
  `expiry_date` date NOT NULL,
  `scheduled_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `expired_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `expiry_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `transaction_id` bigint(20) unsigned DEFAULT NULL,
  `processed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `error_code` varchar(100) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`leave_balance_expiry_id`),
  UNIQUE KEY `uq_leave_expiry_carry_lot` (`carry_forward_lot_id`),
  KEY `ix_leave_expiry_company_status` (`company_id`,`expiry_status`),
  KEY `ix_leave_expiry_date` (`company_id`,`expiry_date`,`expiry_status`),
  KEY `ix_leave_expiry_balance` (`leave_balance_id`),
  KEY `fk_leave_expiry_employee` (`employee_id`),
  KEY `fk_leave_expiry_leave_type` (`leave_type_id`),
  KEY `fk_leave_expiry_period` (`leave_period_id`),
  KEY `fk_leave_expiry_transaction` (`transaction_id`),
  KEY `fk_leave_expiry_processed_by` (`processed_by_user_id`),
  CONSTRAINT `fk_leave_expiry_balance` FOREIGN KEY (`leave_balance_id`) REFERENCES `employee_leave_balances` (`leave_balance_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_expiry_carry_lot` FOREIGN KEY (`carry_forward_lot_id`) REFERENCES `leave_carry_forward_lots` (`carry_forward_lot_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_expiry_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_expiry_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_expiry_leave_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_expiry_period` FOREIGN KEY (`leave_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_expiry_processed_by` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_expiry_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `leave_balance_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_balance_transactions
CREATE TABLE IF NOT EXISTS `leave_balance_transactions` (
  `transaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `leave_balance_id` bigint(20) unsigned NOT NULL,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `leave_period_id` bigint(20) unsigned NOT NULL,
  `transaction_date` date NOT NULL,
  `transaction_type` varchar(40) NOT NULL,
  `units_changed` decimal(10,2) NOT NULL,
  `balance_before` decimal(10,2) DEFAULT NULL,
  `balance_after` decimal(10,2) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `remarks` varchar(1000) DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`transaction_id`),
  KEY `fk_leave_transaction_company` (`company_id`),
  KEY `fk_leave_transaction_type` (`leave_type_id`),
  KEY `fk_leave_transaction_period` (`leave_period_id`),
  KEY `fk_leave_transaction_created_by` (`created_by_user_id`),
  KEY `ix_leave_transaction_balance` (`leave_balance_id`,`transaction_date`),
  KEY `ix_leave_transaction_employee` (`employee_id`,`transaction_date`),
  KEY `ix_leave_transaction_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `fk_leave_transaction_balance` FOREIGN KEY (`leave_balance_id`) REFERENCES `employee_leave_balances` (`leave_balance_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_transaction_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_transaction_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_transaction_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_transaction_period` FOREIGN KEY (`leave_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_transaction_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_blackout_periods
CREATE TABLE IF NOT EXISTS `leave_blackout_periods` (
  `blackout_period_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `leave_type_id` bigint(20) unsigned DEFAULT NULL,
  `blackout_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `restriction_type` varchar(30) NOT NULL DEFAULT 'BLOCK',
  `exception_requires_approval` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`blackout_period_id`),
  KEY `fk_blackout_department` (`department_id`),
  KEY `fk_blackout_leave_type` (`leave_type_id`),
  KEY `ix_blackout_company_dates` (`company_id`,`start_date`,`end_date`),
  KEY `ix_blackout_scope` (`branch_id`,`department_id`),
  CONSTRAINT `fk_blackout_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_blackout_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_blackout_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_blackout_leave_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_carry_forward_lots
CREATE TABLE IF NOT EXISTS `leave_carry_forward_lots` (
  `carry_forward_lot_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `carry_forward_run_detail_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `source_period_id` bigint(20) unsigned NOT NULL,
  `target_period_id` bigint(20) unsigned NOT NULL,
  `source_leave_balance_id` bigint(20) unsigned NOT NULL,
  `target_leave_balance_id` bigint(20) unsigned NOT NULL,
  `original_units` decimal(10,2) NOT NULL,
  `remaining_units` decimal(10,2) NOT NULL,
  `consumed_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `expired_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `expiry_date` date DEFAULT NULL,
  `lot_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `carry_transaction_id` bigint(20) unsigned DEFAULT NULL,
  `expiry_transaction_id` bigint(20) unsigned DEFAULT NULL,
  `fully_consumed_at` datetime DEFAULT NULL,
  `expired_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`carry_forward_lot_id`),
  UNIQUE KEY `uq_carry_forward_detail_lot` (`carry_forward_run_detail_id`),
  KEY `ix_carry_lot_employee_leave` (`company_id`,`employee_id`,`leave_type_id`,`lot_status`),
  KEY `ix_carry_lot_expiry` (`company_id`,`expiry_date`,`lot_status`),
  KEY `ix_carry_lot_target_balance` (`target_leave_balance_id`),
  KEY `fk_carry_lot_employee` (`employee_id`),
  KEY `fk_carry_lot_leave_type` (`leave_type_id`),
  KEY `fk_carry_lot_source_period` (`source_period_id`),
  KEY `fk_carry_lot_target_period` (`target_period_id`),
  KEY `fk_carry_lot_source_balance` (`source_leave_balance_id`),
  KEY `fk_carry_lot_carry_transaction` (`carry_transaction_id`),
  KEY `fk_carry_lot_expiry_transaction` (`expiry_transaction_id`),
  CONSTRAINT `fk_carry_lot_carry_transaction` FOREIGN KEY (`carry_transaction_id`) REFERENCES `leave_balance_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_lot_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_lot_detail` FOREIGN KEY (`carry_forward_run_detail_id`) REFERENCES `leave_carry_forward_run_details` (`carry_forward_run_detail_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_lot_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_lot_expiry_transaction` FOREIGN KEY (`expiry_transaction_id`) REFERENCES `leave_balance_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_lot_leave_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_lot_source_balance` FOREIGN KEY (`source_leave_balance_id`) REFERENCES `employee_leave_balances` (`leave_balance_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_lot_source_period` FOREIGN KEY (`source_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_lot_target_balance` FOREIGN KEY (`target_leave_balance_id`) REFERENCES `employee_leave_balances` (`leave_balance_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_lot_target_period` FOREIGN KEY (`target_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_carry_forward_run_details
CREATE TABLE IF NOT EXISTS `leave_carry_forward_run_details` (
  `carry_forward_run_detail_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `carry_forward_run_id` bigint(20) unsigned NOT NULL,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `leave_policy_rule_id` bigint(20) unsigned DEFAULT NULL,
  `source_leave_balance_id` bigint(20) unsigned NOT NULL,
  `target_leave_balance_id` bigint(20) unsigned DEFAULT NULL,
  `source_available_balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `carry_forward_limit_units` decimal(10,2) DEFAULT NULL,
  `eligible_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `carried_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `expired_units_at_close` decimal(10,2) NOT NULL DEFAULT 0.00,
  `target_balance_before` decimal(10,2) DEFAULT NULL,
  `target_balance_after` decimal(10,2) DEFAULT NULL,
  `carry_forward_expiry_date` date DEFAULT NULL,
  `carry_transaction_id` bigint(20) unsigned DEFAULT NULL,
  `source_expiry_transaction_id` bigint(20) unsigned DEFAULT NULL,
  `detail_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `skip_reason` varchar(1000) DEFAULT NULL,
  `error_code` varchar(100) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`carry_forward_run_detail_id`),
  UNIQUE KEY `uq_carry_run_source_balance` (`carry_forward_run_id`,`source_leave_balance_id`),
  KEY `ix_carry_detail_company` (`company_id`),
  KEY `ix_carry_detail_employee` (`employee_id`),
  KEY `ix_carry_detail_leave_type` (`leave_type_id`),
  KEY `ix_carry_detail_target_balance` (`target_leave_balance_id`),
  KEY `ix_carry_detail_status` (`carry_forward_run_id`,`detail_status`),
  KEY `fk_carry_detail_policy_rule` (`leave_policy_rule_id`),
  KEY `fk_carry_detail_source_balance` (`source_leave_balance_id`),
  KEY `fk_carry_detail_carry_transaction` (`carry_transaction_id`),
  KEY `fk_carry_detail_expiry_transaction` (`source_expiry_transaction_id`),
  CONSTRAINT `fk_carry_detail_carry_transaction` FOREIGN KEY (`carry_transaction_id`) REFERENCES `leave_balance_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_detail_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_detail_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_detail_expiry_transaction` FOREIGN KEY (`source_expiry_transaction_id`) REFERENCES `leave_balance_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_detail_leave_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_detail_policy_rule` FOREIGN KEY (`leave_policy_rule_id`) REFERENCES `leave_policy_rules` (`leave_policy_rule_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_detail_run` FOREIGN KEY (`carry_forward_run_id`) REFERENCES `leave_carry_forward_runs` (`carry_forward_run_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_detail_source_balance` FOREIGN KEY (`source_leave_balance_id`) REFERENCES `employee_leave_balances` (`leave_balance_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_detail_target_balance` FOREIGN KEY (`target_leave_balance_id`) REFERENCES `employee_leave_balances` (`leave_balance_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_carry_forward_runs
CREATE TABLE IF NOT EXISTS `leave_carry_forward_runs` (
  `carry_forward_run_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `source_period_id` bigint(20) unsigned NOT NULL,
  `target_period_id` bigint(20) unsigned NOT NULL,
  `run_number` varchar(60) NOT NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `run_name` varchar(150) NOT NULL,
  `processing_date` date NOT NULL,
  `run_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `is_dry_run` tinyint(1) NOT NULL DEFAULT 0,
  `total_candidates` int(10) unsigned NOT NULL DEFAULT 0,
  `processed_count` int(10) unsigned NOT NULL DEFAULT 0,
  `successful_count` int(10) unsigned NOT NULL DEFAULT 0,
  `skipped_count` int(10) unsigned NOT NULL DEFAULT 0,
  `failed_count` int(10) unsigned NOT NULL DEFAULT 0,
  `total_eligible_units` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total_carried_units` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total_expired_units` decimal(14,2) NOT NULL DEFAULT 0.00,
  `started_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancellation_reason` varchar(1000) DEFAULT NULL,
  `error_summary` text DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`carry_forward_run_id`),
  UNIQUE KEY `uq_company_carry_run_number` (`company_id`,`run_number`),
  UNIQUE KEY `uq_company_carry_idempotency` (`company_id`,`idempotency_key`),
  KEY `ix_carry_run_company_status` (`company_id`,`run_status`),
  KEY `ix_carry_run_source_period` (`source_period_id`),
  KEY `ix_carry_run_target_period` (`target_period_id`),
  KEY `fk_carry_run_started_by` (`started_by_user_id`),
  KEY `fk_carry_run_cancelled_by` (`cancelled_by_user_id`),
  KEY `fk_carry_run_created_by` (`created_by_user_id`),
  CONSTRAINT `fk_carry_run_cancelled_by` FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_run_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_run_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_run_source_period` FOREIGN KEY (`source_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_run_started_by` FOREIGN KEY (`started_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_carry_run_target_period` FOREIGN KEY (`target_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_encashment_requests
CREATE TABLE IF NOT EXISTS `leave_encashment_requests` (
  `encashment_request_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `leave_period_id` bigint(20) unsigned NOT NULL,
  `request_number` varchar(60) NOT NULL,
  `requested_units` decimal(10,2) NOT NULL,
  `approved_units` decimal(10,2) DEFAULT NULL,
  `rate_per_unit` decimal(15,2) DEFAULT NULL,
  `gross_amount` decimal(15,2) DEFAULT NULL,
  `request_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `reason` text DEFAULT NULL,
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approval_remarks` text DEFAULT NULL,
  `payroll_reference` varchar(100) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`encashment_request_id`),
  UNIQUE KEY `uq_company_encashment_number` (`company_id`,`request_number`),
  KEY `fk_encashment_leave_type` (`leave_type_id`),
  KEY `fk_encashment_period` (`leave_period_id`),
  KEY `fk_encashment_requested_by` (`requested_by_user_id`),
  KEY `fk_encashment_approved_by` (`approved_by_user_id`),
  KEY `ix_encashment_employee` (`employee_id`),
  KEY `ix_encashment_company_status` (`company_id`,`request_status`),
  CONSTRAINT `fk_encashment_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_encashment_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_encashment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_encashment_leave_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_encashment_period` FOREIGN KEY (`leave_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_encashment_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_periods
CREATE TABLE IF NOT EXISTS `leave_periods` (
  `leave_period_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `period_code` varchar(50) NOT NULL,
  `period_name` varchar(150) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `period_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `closed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`leave_period_id`),
  UNIQUE KEY `uq_company_leave_period_code` (`company_id`,`period_code`),
  KEY `fk_leave_period_closed_by` (`closed_by_user_id`),
  KEY `ix_leave_period_company_dates` (`company_id`,`start_date`,`end_date`),
  KEY `ix_leave_period_status` (`company_id`,`period_status`),
  CONSTRAINT `fk_leave_period_closed_by` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_period_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_policies
CREATE TABLE IF NOT EXISTS `leave_policies` (
  `leave_policy_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `policy_code` varchar(50) NOT NULL,
  `policy_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`leave_policy_id`),
  UNIQUE KEY `uq_company_leave_policy_code` (`company_id`,`policy_code`),
  KEY `ix_leave_policy_company` (`company_id`),
  KEY `ix_leave_policy_dates` (`effective_from`,`effective_to`),
  KEY `ix_leave_policy_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_leave_policy_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_policy_rules
CREATE TABLE IF NOT EXISTS `leave_policy_rules` (
  `leave_policy_rule_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `leave_policy_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `annual_entitlement_units` decimal(10,2) NOT NULL DEFAULT 0.00,
  `accrual_method` varchar(30) NOT NULL DEFAULT 'ANNUAL',
  `accrual_units_per_period` decimal(10,4) NOT NULL DEFAULT 0.0000,
  `accrual_start_after_days` smallint(5) unsigned NOT NULL DEFAULT 0,
  `prorate_entitlement` tinyint(1) NOT NULL DEFAULT 1,
  `allow_during_probation` tinyint(1) NOT NULL DEFAULT 0,
  `eligible_gender` varchar(30) NOT NULL DEFAULT 'ALL',
  `minimum_request_units` decimal(10,2) NOT NULL DEFAULT 0.50,
  `maximum_request_units` decimal(10,2) DEFAULT NULL,
  `minimum_notice_days` smallint(5) unsigned NOT NULL DEFAULT 0,
  `maximum_advance_days` smallint(5) unsigned DEFAULT NULL,
  `maximum_backdate_days` smallint(5) unsigned NOT NULL DEFAULT 0,
  `allow_half_day` tinyint(1) NOT NULL DEFAULT 1,
  `allow_hourly_leave` tinyint(1) NOT NULL DEFAULT 0,
  `include_weekends` tinyint(1) NOT NULL DEFAULT 0,
  `include_holidays` tinyint(1) NOT NULL DEFAULT 0,
  `sandwich_rule_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `carry_forward_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `maximum_carry_forward_units` decimal(10,2) DEFAULT NULL,
  `carry_forward_expiry_months` smallint(5) unsigned DEFAULT NULL,
  `maximum_balance_units` decimal(10,2) DEFAULT NULL,
  `allow_negative_balance` tinyint(1) NOT NULL DEFAULT 0,
  `negative_balance_limit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `attachment_required_after_units` decimal(10,2) DEFAULT NULL,
  `encashment_allowed` tinyint(1) NOT NULL DEFAULT 0,
  `maximum_encashment_units` decimal(10,2) DEFAULT NULL,
  `approval_levels_required` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`leave_policy_rule_id`),
  UNIQUE KEY `uq_leave_policy_type` (`leave_policy_id`,`leave_type_id`),
  KEY `ix_leave_rule_policy` (`leave_policy_id`),
  KEY `ix_leave_rule_type` (`leave_type_id`),
  CONSTRAINT `fk_leave_rule_policy` FOREIGN KEY (`leave_policy_id`) REFERENCES `leave_policies` (`leave_policy_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_rule_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_request_approvals
CREATE TABLE IF NOT EXISTS `leave_request_approvals` (
  `leave_approval_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `leave_request_id` bigint(20) unsigned NOT NULL,
  `approval_level` smallint(5) unsigned NOT NULL DEFAULT 1,
  `approver_user_id` bigint(20) unsigned NOT NULL,
  `decision` varchar(30) NOT NULL DEFAULT 'PENDING',
  `comments` text DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `is_final_level` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`leave_approval_id`),
  UNIQUE KEY `uq_leave_request_approval` (`leave_request_id`,`approval_level`,`approver_user_id`),
  KEY `ix_leave_approval_user_decision` (`approver_user_id`,`decision`),
  KEY `ix_leave_approval_request` (`leave_request_id`),
  CONSTRAINT `fk_leave_approval_request` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests` (`leave_request_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_approval_user` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_request_attachments
CREATE TABLE IF NOT EXISTS `leave_request_attachments` (
  `attachment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `leave_request_id` bigint(20) unsigned NOT NULL,
  `attachment_type` varchar(50) DEFAULT NULL,
  `attachment_title` varchar(200) DEFAULT NULL,
  `original_filename` varchar(255) NOT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `storage_path` varchar(700) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size_bytes` bigint(20) unsigned DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `uploaded_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`attachment_id`),
  KEY `fk_leave_attachment_user` (`uploaded_by_user_id`),
  KEY `ix_leave_attachment_request` (`leave_request_id`),
  CONSTRAINT `fk_leave_attachment_request` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests` (`leave_request_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_attachment_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_request_days
CREATE TABLE IF NOT EXISTS `leave_request_days` (
  `leave_request_day_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `leave_request_id` bigint(20) unsigned NOT NULL,
  `leave_date` date NOT NULL,
  `duration_type` varchar(30) NOT NULL DEFAULT 'FULL_DAY',
  `requested_units` decimal(10,2) NOT NULL DEFAULT 1.00,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `is_weekend` tinyint(1) NOT NULL DEFAULT 0,
  `is_holiday` tinyint(1) NOT NULL DEFAULT 0,
  `holiday_id` bigint(20) unsigned DEFAULT NULL,
  `is_chargeable` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`leave_request_day_id`),
  UNIQUE KEY `uq_leave_request_date` (`leave_request_id`,`leave_date`),
  KEY `fk_leave_request_day_holiday` (`holiday_id`),
  KEY `ix_leave_request_day_date` (`leave_date`),
  CONSTRAINT `fk_leave_request_day_holiday` FOREIGN KEY (`holiday_id`) REFERENCES `holidays` (`holiday_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_day_request` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests` (`leave_request_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_requests
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `leave_request_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `leave_period_id` bigint(20) unsigned DEFAULT NULL,
  `request_number` varchar(60) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `start_session` varchar(20) NOT NULL DEFAULT 'FULL_DAY',
  `end_session` varchar(20) NOT NULL DEFAULT 'FULL_DAY',
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `requested_units` decimal(10,2) NOT NULL,
  `reason` text NOT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `contact_address` varchar(500) DEFAULT NULL,
  `work_handover_to_employee_id` bigint(20) unsigned DEFAULT NULL,
  `work_handover_notes` text DEFAULT NULL,
  `request_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `submitted_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `final_decision_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `final_decision_at` datetime DEFAULT NULL,
  `final_remarks` text DEFAULT NULL,
  `cancelled_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`leave_request_id`),
  UNIQUE KEY `uq_company_leave_request_number` (`company_id`,`request_number`),
  KEY `fk_leave_request_period` (`leave_period_id`),
  KEY `fk_leave_request_handover_employee` (`work_handover_to_employee_id`),
  KEY `fk_leave_request_submitted_by` (`submitted_by_user_id`),
  KEY `fk_leave_request_decision_by` (`final_decision_by_user_id`),
  KEY `fk_leave_request_cancelled_by` (`cancelled_by_user_id`),
  KEY `ix_leave_request_employee` (`employee_id`,`start_date`),
  KEY `ix_leave_request_company_status` (`company_id`,`request_status`),
  KEY `ix_leave_request_type` (`leave_type_id`),
  KEY `ix_leave_request_dates` (`company_id`,`start_date`,`end_date`),
  CONSTRAINT `fk_leave_request_cancelled_by` FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_decision_by` FOREIGN KEY (`final_decision_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_handover_employee` FOREIGN KEY (`work_handover_to_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_period` FOREIGN KEY (`leave_period_id`) REFERENCES `leave_periods` (`leave_period_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`leave_type_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.leave_types
CREATE TABLE IF NOT EXISTS `leave_types` (
  `leave_type_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `leave_type_code` varchar(50) NOT NULL,
  `leave_type_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `unit_type` varchar(20) NOT NULL DEFAULT 'DAYS',
  `is_paid` tinyint(1) NOT NULL DEFAULT 1,
  `requires_approval` tinyint(1) NOT NULL DEFAULT 1,
  `requires_attachment` tinyint(1) NOT NULL DEFAULT 0,
  `display_color` varchar(20) DEFAULT NULL,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`leave_type_id`),
  UNIQUE KEY `uq_company_leave_type_code` (`company_id`,`leave_type_code`),
  KEY `ix_leave_type_company` (`company_id`),
  KEY `ix_leave_type_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_leave_type_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.legal_cases
CREATE TABLE IF NOT EXISTS `legal_cases` (
  `legal_case_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `case_number` varchar(60) NOT NULL,
  `case_title` varchar(250) NOT NULL,
  `case_type` varchar(80) NOT NULL,
  `jurisdiction` varchar(150) DEFAULT NULL,
  `external_counsel_name` varchar(200) DEFAULT NULL,
  `filing_date` date DEFAULT NULL,
  `next_hearing_date` date DEFAULT NULL,
  `case_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `estimated_liability` decimal(18,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `case_summary` longtext DEFAULT NULL,
  `owner_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`legal_case_id`),
  UNIQUE KEY `uq_legal_case_number` (`company_id`,`case_number`),
  KEY `fk_legal_case_employee` (`employee_id`),
  KEY `fk_legal_case_user` (`owner_user_id`),
  KEY `ix_legal_case_status` (`company_id`,`case_status`),
  CONSTRAINT `fk_legal_case_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_legal_case_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_legal_case_user` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.loan_installments
CREATE TABLE IF NOT EXISTS `loan_installments` (
  `loan_installment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_loan_id` bigint(20) unsigned NOT NULL,
  `payroll_period_id` bigint(20) unsigned DEFAULT NULL,
  `payroll_run_employee_id` bigint(20) unsigned DEFAULT NULL,
  `installment_number` smallint(5) unsigned NOT NULL,
  `due_date` date NOT NULL,
  `principal_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `interest_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `installment_amount` decimal(15,2) NOT NULL,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `remaining_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `installment_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `paid_at` datetime DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`loan_installment_id`),
  UNIQUE KEY `uq_loan_installment_number` (`employee_loan_id`,`installment_number`),
  KEY `fk_loan_installment_period` (`payroll_period_id`),
  KEY `fk_loan_installment_run_employee` (`payroll_run_employee_id`),
  KEY `ix_loan_installment_due` (`due_date`,`installment_status`),
  CONSTRAINT `fk_loan_installment_loan` FOREIGN KEY (`employee_loan_id`) REFERENCES `employee_loans` (`employee_loan_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_loan_installment_period` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`payroll_period_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_loan_installment_run_employee` FOREIGN KEY (`payroll_run_employee_id`) REFERENCES `payroll_run_employees` (`payroll_run_employee_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.notification_queue
CREATE TABLE IF NOT EXISTS `notification_queue` (
  `notification_queue_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `channel_type` varchar(30) NOT NULL,
  `recipient_address` varchar(255) NOT NULL,
  `template_code` varchar(80) DEFAULT NULL,
  `subject_text` varchar(500) DEFAULT NULL,
  `message_body` longtext NOT NULL,
  `payload` longtext DEFAULT NULL,
  `queue_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `priority_level` varchar(30) NOT NULL DEFAULT 'NORMAL',
  `scheduled_at` datetime NOT NULL DEFAULT current_timestamp(),
  `sent_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `retry_count` smallint(5) unsigned NOT NULL DEFAULT 0,
  `last_error` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_queue_id`),
  KEY `fk_notification_queue_company` (`company_id`),
  KEY `fk_notification_queue_user` (`user_id`),
  KEY `ix_notification_queue_status` (`queue_status`,`scheduled_at`,`priority_level`),
  CONSTRAINT `fk_notification_queue_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notification_queue_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `notification_type` varchar(50) NOT NULL,
  `title` varchar(250) NOT NULL,
  `message_body` longtext NOT NULL,
  `action_url` varchar(1000) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `priority_level` varchar(30) NOT NULL DEFAULT 'NORMAL',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `fk_notification_company` (`company_id`),
  KEY `ix_notification_user` (`user_id`,`is_read`,`created_at`),
  KEY `ix_notification_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `fk_notification_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.offboarding_template_tasks
CREATE TABLE IF NOT EXISTS `offboarding_template_tasks` (
  `offboarding_template_task_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `offboarding_template_id` bigint(20) unsigned NOT NULL,
  `task_code` varchar(60) NOT NULL,
  `task_name` varchar(200) NOT NULL,
  `task_description` text DEFAULT NULL,
  `task_category` varchar(50) NOT NULL DEFAULT 'GENERAL',
  `relative_due_day` smallint(6) NOT NULL DEFAULT 0,
  `default_role_id` bigint(20) unsigned DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `requires_approval` tinyint(1) NOT NULL DEFAULT 0,
  `sequence_number` smallint(5) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`offboarding_template_task_id`),
  UNIQUE KEY `uq_offboarding_task_code` (`offboarding_template_id`,`task_code`),
  UNIQUE KEY `uq_offboarding_task_sequence` (`offboarding_template_id`,`sequence_number`),
  KEY `fk_offboarding_task_role` (`default_role_id`),
  CONSTRAINT `fk_offboarding_task_role` FOREIGN KEY (`default_role_id`) REFERENCES `roles` (`role_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_offboarding_task_template` FOREIGN KEY (`offboarding_template_id`) REFERENCES `offboarding_templates` (`offboarding_template_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.offboarding_templates
CREATE TABLE IF NOT EXISTS `offboarding_templates` (
  `offboarding_template_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `template_code` varchar(60) NOT NULL,
  `template_name` varchar(200) NOT NULL,
  `description` longtext DEFAULT NULL,
  `employment_type_id` smallint(5) unsigned DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`offboarding_template_id`),
  UNIQUE KEY `uq_offboarding_template_code` (`company_id`,`template_code`),
  KEY `fk_offboarding_template_type` (`employment_type_id`),
  CONSTRAINT `fk_offboarding_template_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_offboarding_template_type` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`employment_type_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.onboarding_template_tasks
CREATE TABLE IF NOT EXISTS `onboarding_template_tasks` (
  `onboarding_template_task_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `onboarding_template_id` bigint(20) unsigned NOT NULL,
  `task_code` varchar(50) NOT NULL,
  `task_name` varchar(200) NOT NULL,
  `task_description` text DEFAULT NULL,
  `task_category` varchar(50) NOT NULL DEFAULT 'GENERAL',
  `relative_due_day` smallint(6) NOT NULL DEFAULT 0,
  `assignment_type` varchar(40) NOT NULL DEFAULT 'HR',
  `default_role_id` bigint(20) unsigned DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `requires_document` tinyint(1) NOT NULL DEFAULT 0,
  `requires_approval` tinyint(1) NOT NULL DEFAULT 0,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`onboarding_template_task_id`),
  UNIQUE KEY `uq_onboarding_template_task_code` (`onboarding_template_id`,`task_code`),
  KEY `fk_onboarding_template_task_role` (`default_role_id`),
  KEY `ix_onboarding_template_task_sequence` (`onboarding_template_id`,`sequence_number`),
  CONSTRAINT `fk_onboarding_template_task_role` FOREIGN KEY (`default_role_id`) REFERENCES `roles` (`role_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_onboarding_template_task_template` FOREIGN KEY (`onboarding_template_id`) REFERENCES `onboarding_templates` (`onboarding_template_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.onboarding_templates
CREATE TABLE IF NOT EXISTS `onboarding_templates` (
  `onboarding_template_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `template_code` varchar(50) NOT NULL,
  `template_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `employment_type_id` smallint(5) unsigned DEFAULT NULL,
  `expected_duration_days` smallint(5) unsigned NOT NULL DEFAULT 30,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`onboarding_template_id`),
  UNIQUE KEY `uq_company_onboarding_template` (`company_id`,`template_code`),
  KEY `fk_onboarding_template_department` (`department_id`),
  KEY `fk_onboarding_template_designation` (`designation_id`),
  KEY `fk_onboarding_template_employment_type` (`employment_type_id`),
  KEY `ix_onboarding_template_company` (`company_id`,`is_active`),
  CONSTRAINT `fk_onboarding_template_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_onboarding_template_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_onboarding_template_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_onboarding_template_employment_type` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`employment_type_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.overtime_requests
CREATE TABLE IF NOT EXISTS `overtime_requests` (
  `overtime_request_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `attendance_id` bigint(20) unsigned DEFAULT NULL,
  `overtime_date` date NOT NULL,
  `requested_start_at` datetime DEFAULT NULL,
  `requested_end_at` datetime DEFAULT NULL,
  `requested_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `approved_minutes` int(10) unsigned DEFAULT NULL,
  `reason` text NOT NULL,
  `request_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approval_remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`overtime_request_id`),
  KEY `fk_overtime_requested_by` (`requested_by_user_id`),
  KEY `fk_overtime_approved_by` (`approved_by_user_id`),
  KEY `ix_overtime_company_status` (`company_id`,`request_status`),
  KEY `ix_overtime_employee_date` (`employee_id`,`overtime_date`),
  KEY `ix_overtime_attendance` (`attendance_id`),
  CONSTRAINT `fk_overtime_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_overtime_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `attendance_records` (`attendance_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_overtime_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_overtime_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_overtime_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.password_reset_tokens
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `password_reset_token_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `requested_ip` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`password_reset_token_id`),
  UNIQUE KEY `uq_password_reset_token_hash` (`token_hash`),
  KEY `ix_password_reset_token_user` (`user_id`),
  KEY `ix_password_reset_token_expiry` (`expires_at`),
  KEY `ix_password_reset_token_active` (`user_id`,`used_at`,`revoked_at`,`expires_at`),
  CONSTRAINT `fk_password_reset_token_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.pay_components
CREATE TABLE IF NOT EXISTS `pay_components` (
  `pay_component_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `component_code` varchar(50) NOT NULL,
  `component_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `component_type` varchar(40) NOT NULL,
  `calculation_type` varchar(40) NOT NULL DEFAULT 'FIXED',
  `default_amount` decimal(15,2) DEFAULT NULL,
  `default_percentage` decimal(8,4) DEFAULT NULL,
  `is_taxable` tinyint(1) NOT NULL DEFAULT 0,
  `is_pensionable` tinyint(1) NOT NULL DEFAULT 0,
  `is_proratable` tinyint(1) NOT NULL DEFAULT 1,
  `affects_gross_salary` tinyint(1) NOT NULL DEFAULT 0,
  `affects_net_salary` tinyint(1) NOT NULL DEFAULT 1,
  `is_recurring` tinyint(1) NOT NULL DEFAULT 1,
  `include_in_payslip` tinyint(1) NOT NULL DEFAULT 1,
  `expense_account_code` varchar(100) DEFAULT NULL,
  `liability_account_code` varchar(100) DEFAULT NULL,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`pay_component_id`),
  UNIQUE KEY `uq_company_pay_component` (`company_id`,`component_code`),
  KEY `ix_pay_component_company` (`company_id`,`is_active`),
  KEY `ix_pay_component_type` (`company_id`,`component_type`),
  CONSTRAINT `fk_pay_component_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.pay_grades
CREATE TABLE IF NOT EXISTS `pay_grades` (
  `pay_grade_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `grade_code` varchar(50) NOT NULL,
  `grade_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `minimum_salary` decimal(15,2) DEFAULT NULL,
  `midpoint_salary` decimal(15,2) DEFAULT NULL,
  `maximum_salary` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `grade_level` smallint(5) unsigned DEFAULT NULL,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`pay_grade_id`),
  UNIQUE KEY `uq_company_pay_grade` (`company_id`,`grade_code`),
  KEY `ix_pay_grade_company` (`company_id`,`is_active`),
  CONSTRAINT `fk_pay_grade_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.payroll_adjustments
CREATE TABLE IF NOT EXISTS `payroll_adjustments` (
  `payroll_adjustment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `payroll_period_id` bigint(20) unsigned NOT NULL,
  `payroll_run_id` bigint(20) unsigned DEFAULT NULL,
  `pay_component_id` bigint(20) unsigned DEFAULT NULL,
  `adjustment_type` varchar(40) NOT NULL,
  `adjustment_amount` decimal(15,2) NOT NULL,
  `reason` text NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `attachment_path` varchar(700) DEFAULT NULL,
  `adjustment_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approval_remarks` text DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payroll_adjustment_id`),
  KEY `fk_payroll_adjustment_period` (`payroll_period_id`),
  KEY `fk_payroll_adjustment_run` (`payroll_run_id`),
  KEY `fk_payroll_adjustment_component` (`pay_component_id`),
  KEY `fk_payroll_adjustment_requested_by` (`requested_by_user_id`),
  KEY `fk_payroll_adjustment_approved_by` (`approved_by_user_id`),
  KEY `ix_payroll_adjustment_employee` (`employee_id`,`payroll_period_id`),
  KEY `ix_payroll_adjustment_status` (`company_id`,`adjustment_status`),
  CONSTRAINT `fk_payroll_adjustment_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_adjustment_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_adjustment_component` FOREIGN KEY (`pay_component_id`) REFERENCES `pay_components` (`pay_component_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_adjustment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_adjustment_period` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`payroll_period_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_adjustment_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_adjustment_run` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`payroll_run_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.payroll_periods
CREATE TABLE IF NOT EXISTS `payroll_periods` (
  `payroll_period_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `period_code` varchar(50) NOT NULL,
  `period_name` varchar(150) NOT NULL,
  `payroll_frequency` varchar(30) NOT NULL DEFAULT 'MONTHLY',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `attendance_cutoff_date` date DEFAULT NULL,
  `leave_cutoff_date` date DEFAULT NULL,
  `adjustment_cutoff_date` date DEFAULT NULL,
  `expected_payment_date` date DEFAULT NULL,
  `actual_payment_date` date DEFAULT NULL,
  `period_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `closed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payroll_period_id`),
  UNIQUE KEY `uq_company_payroll_period` (`company_id`,`period_code`),
  KEY `fk_payroll_period_closed_by` (`closed_by_user_id`),
  KEY `ix_payroll_period_company_dates` (`company_id`,`start_date`,`end_date`),
  KEY `ix_payroll_period_status` (`company_id`,`period_status`),
  CONSTRAINT `fk_payroll_period_closed_by` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_period_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.payroll_run_employees
CREATE TABLE IF NOT EXISTS `payroll_run_employees` (
  `payroll_run_employee_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payroll_run_id` bigint(20) unsigned NOT NULL,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `salary_assignment_id` bigint(20) unsigned DEFAULT NULL,
  `bank_account_id` bigint(20) unsigned DEFAULT NULL,
  `employee_code_snapshot` varchar(50) NOT NULL,
  `employee_name_snapshot` varchar(250) NOT NULL,
  `designation_snapshot` varchar(150) DEFAULT NULL,
  `department_snapshot` varchar(150) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `calendar_days` decimal(8,2) NOT NULL DEFAULT 0.00,
  `working_days` decimal(8,2) NOT NULL DEFAULT 0.00,
  `payable_days` decimal(8,2) NOT NULL DEFAULT 0.00,
  `present_days` decimal(8,2) NOT NULL DEFAULT 0.00,
  `absent_days` decimal(8,2) NOT NULL DEFAULT 0.00,
  `paid_leave_days` decimal(8,2) NOT NULL DEFAULT 0.00,
  `unpaid_leave_days` decimal(8,2) NOT NULL DEFAULT 0.00,
  `overtime_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `late_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `basic_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `gross_earnings` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_deductions` decimal(15,2) NOT NULL DEFAULT 0.00,
  `employer_contributions` decimal(15,2) NOT NULL DEFAULT 0.00,
  `taxable_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `net_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payroll_status` varchar(30) NOT NULL DEFAULT 'CALCULATED',
  `payment_status` varchar(30) NOT NULL DEFAULT 'UNPAID',
  `calculation_notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payroll_run_employee_id`),
  UNIQUE KEY `uq_payroll_run_employee` (`payroll_run_id`,`employee_id`),
  KEY `fk_run_employee_company` (`company_id`),
  KEY `fk_run_employee_salary_assignment` (`salary_assignment_id`),
  KEY `fk_run_employee_bank` (`bank_account_id`),
  KEY `ix_run_employee_employee` (`employee_id`),
  KEY `ix_run_employee_payment_status` (`payroll_run_id`,`payment_status`),
  CONSTRAINT `fk_run_employee_bank` FOREIGN KEY (`bank_account_id`) REFERENCES `employee_bank_accounts` (`bank_account_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_run_employee_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_run_employee_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_run_employee_run` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`payroll_run_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_run_employee_salary_assignment` FOREIGN KEY (`salary_assignment_id`) REFERENCES `employee_salary_assignments` (`salary_assignment_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.payroll_run_items
CREATE TABLE IF NOT EXISTS `payroll_run_items` (
  `payroll_run_item_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payroll_run_employee_id` bigint(20) unsigned NOT NULL,
  `pay_component_id` bigint(20) unsigned DEFAULT NULL,
  `component_code_snapshot` varchar(50) NOT NULL,
  `component_name_snapshot` varchar(150) NOT NULL,
  `component_type_snapshot` varchar(40) NOT NULL,
  `calculation_type` varchar(40) DEFAULT NULL,
  `quantity` decimal(12,4) DEFAULT NULL,
  `rate` decimal(15,4) DEFAULT NULL,
  `percentage_value` decimal(8,4) DEFAULT NULL,
  `calculated_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `taxable_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `employer_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `source_type` varchar(50) DEFAULT NULL,
  `source_reference_id` bigint(20) unsigned DEFAULT NULL,
  `formula_snapshot` text DEFAULT NULL,
  `remarks` varchar(1000) DEFAULT NULL,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payroll_run_item_id`),
  KEY `ix_run_item_employee` (`payroll_run_employee_id`),
  KEY `ix_run_item_component` (`pay_component_id`),
  KEY `ix_run_item_source` (`source_type`,`source_reference_id`),
  CONSTRAINT `fk_run_item_component` FOREIGN KEY (`pay_component_id`) REFERENCES `pay_components` (`pay_component_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_run_item_employee` FOREIGN KEY (`payroll_run_employee_id`) REFERENCES `payroll_run_employees` (`payroll_run_employee_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.payroll_runs
CREATE TABLE IF NOT EXISTS `payroll_runs` (
  `payroll_run_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `payroll_period_id` bigint(20) unsigned NOT NULL,
  `run_number` varchar(60) NOT NULL,
  `run_name` varchar(150) DEFAULT NULL,
  `run_type` varchar(30) NOT NULL DEFAULT 'REGULAR',
  `run_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `employee_count` int(10) unsigned NOT NULL DEFAULT 0,
  `total_gross_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_deduction_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_employer_contribution` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_net_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `initiated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `initiated_at` datetime DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `finalized_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `finalized_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payroll_run_id`),
  UNIQUE KEY `uq_company_payroll_run_number` (`company_id`,`run_number`),
  KEY `fk_payroll_run_initiated_by` (`initiated_by_user_id`),
  KEY `fk_payroll_run_approved_by` (`approved_by_user_id`),
  KEY `fk_payroll_run_finalized_by` (`finalized_by_user_id`),
  KEY `ix_payroll_run_period` (`payroll_period_id`),
  KEY `ix_payroll_run_status` (`company_id`,`run_status`),
  CONSTRAINT `fk_payroll_run_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_run_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_run_finalized_by` FOREIGN KEY (`finalized_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_run_initiated_by` FOREIGN KEY (`initiated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_run_period` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`payroll_period_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.payroll_settings
CREATE TABLE IF NOT EXISTS `payroll_settings` (
  `payroll_setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `payroll_frequency` varchar(30) NOT NULL DEFAULT 'MONTHLY',
  `payroll_day` tinyint(3) unsigned DEFAULT NULL,
  `default_currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `salary_proration_method` varchar(40) NOT NULL DEFAULT 'CALENDAR_DAYS',
  `rounding_method` varchar(30) NOT NULL DEFAULT 'ROUND',
  `decimal_places` tinyint(3) unsigned NOT NULL DEFAULT 2,
  `standard_monthly_days` decimal(6,2) NOT NULL DEFAULT 30.00,
  `standard_daily_hours` decimal(6,2) NOT NULL DEFAULT 8.00,
  `include_unapproved_overtime` tinyint(1) NOT NULL DEFAULT 0,
  `deduct_unpaid_leave` tinyint(1) NOT NULL DEFAULT 1,
  `deduct_absence` tinyint(1) NOT NULL DEFAULT 1,
  `deduct_late_minutes` tinyint(1) NOT NULL DEFAULT 0,
  `require_payroll_approval` tinyint(1) NOT NULL DEFAULT 1,
  `approval_levels_required` smallint(5) unsigned NOT NULL DEFAULT 1,
  `payslip_prefix` varchar(30) NOT NULL DEFAULT 'PS',
  `payroll_run_prefix` varchar(30) NOT NULL DEFAULT 'PAY',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payroll_setting_id`),
  UNIQUE KEY `uq_payroll_setting_company` (`company_id`),
  CONSTRAINT `fk_payroll_setting_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.payslips
CREATE TABLE IF NOT EXISTS `payslips` (
  `payslip_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payroll_run_employee_id` bigint(20) unsigned NOT NULL,
  `payslip_number` varchar(80) NOT NULL,
  `pdf_storage_path` varchar(700) DEFAULT NULL,
  `pdf_checksum_sha256` char(64) DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `emailed_at` datetime DEFAULT NULL,
  `first_viewed_at` datetime DEFAULT NULL,
  `last_viewed_at` datetime DEFAULT NULL,
  `view_count` int(10) unsigned NOT NULL DEFAULT 0,
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payslip_id`),
  UNIQUE KEY `uq_payslip_run_employee` (`payroll_run_employee_id`),
  UNIQUE KEY `uq_payslip_number` (`payslip_number`),
  CONSTRAINT `fk_payslip_run_employee` FOREIGN KEY (`payroll_run_employee_id`) REFERENCES `payroll_run_employees` (`payroll_run_employee_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_cycle_employees
CREATE TABLE IF NOT EXISTS `performance_cycle_employees` (
  `cycle_employee_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `performance_cycle_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `manager_employee_id` bigint(20) unsigned DEFAULT NULL,
  `eligibility_status` varchar(30) NOT NULL DEFAULT 'ELIGIBLE',
  `exclusion_reason` varchar(500) DEFAULT NULL,
  `review_status` varchar(30) NOT NULL DEFAULT 'NOT_STARTED',
  `assigned_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`cycle_employee_id`),
  UNIQUE KEY `uq_cycle_employee` (`performance_cycle_id`,`employee_id`),
  KEY `fk_cycle_employee_employee` (`employee_id`),
  KEY `fk_cycle_employee_assigned_by` (`assigned_by_user_id`),
  KEY `ix_cycle_employee_status` (`performance_cycle_id`,`review_status`),
  KEY `ix_cycle_employee_manager` (`manager_employee_id`),
  CONSTRAINT `fk_cycle_employee_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cycle_employee_cycle` FOREIGN KEY (`performance_cycle_id`) REFERENCES `performance_cycles` (`performance_cycle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cycle_employee_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cycle_employee_manager` FOREIGN KEY (`manager_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_cycles
CREATE TABLE IF NOT EXISTS `performance_cycles` (
  `performance_cycle_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `cycle_code` varchar(50) NOT NULL,
  `cycle_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `cycle_type` varchar(40) NOT NULL DEFAULT 'ANNUAL',
  `evaluation_start_date` date NOT NULL,
  `evaluation_end_date` date NOT NULL,
  `goal_setting_start_date` date DEFAULT NULL,
  `goal_setting_end_date` date DEFAULT NULL,
  `self_review_start_date` date DEFAULT NULL,
  `self_review_end_date` date DEFAULT NULL,
  `manager_review_start_date` date DEFAULT NULL,
  `manager_review_end_date` date DEFAULT NULL,
  `calibration_start_date` date DEFAULT NULL,
  `calibration_end_date` date DEFAULT NULL,
  `cycle_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `launched_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `launched_at` datetime DEFAULT NULL,
  `closed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`performance_cycle_id`),
  UNIQUE KEY `uq_company_performance_cycle` (`company_id`,`cycle_code`),
  KEY `fk_performance_cycle_created_by` (`created_by_user_id`),
  KEY `fk_performance_cycle_launched_by` (`launched_by_user_id`),
  KEY `fk_performance_cycle_closed_by` (`closed_by_user_id`),
  KEY `ix_performance_cycle_company_status` (`company_id`,`cycle_status`),
  KEY `ix_performance_cycle_dates` (`evaluation_start_date`,`evaluation_end_date`),
  CONSTRAINT `fk_performance_cycle_closed_by` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_cycle_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_cycle_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_cycle_launched_by` FOREIGN KEY (`launched_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_improvement_plans
CREATE TABLE IF NOT EXISTS `performance_improvement_plans` (
  `improvement_plan_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `performance_review_id` bigint(20) unsigned DEFAULT NULL,
  `plan_number` varchar(60) NOT NULL,
  `plan_title` varchar(200) NOT NULL,
  `performance_concerns` longtext NOT NULL,
  `expected_improvements` longtext NOT NULL,
  `support_resources` longtext DEFAULT NULL,
  `consequences_if_unsuccessful` longtext DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `review_frequency` varchar(30) NOT NULL DEFAULT 'WEEKLY',
  `manager_employee_id` bigint(20) unsigned DEFAULT NULL,
  `hr_user_id` bigint(20) unsigned DEFAULT NULL,
  `plan_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `employee_acknowledged_at` datetime DEFAULT NULL,
  `employee_comments` text DEFAULT NULL,
  `final_outcome` varchar(40) DEFAULT NULL,
  `final_comments` longtext DEFAULT NULL,
  `closed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`improvement_plan_id`),
  UNIQUE KEY `uq_company_improvement_plan` (`company_id`,`plan_number`),
  KEY `fk_improvement_plan_review` (`performance_review_id`),
  KEY `fk_improvement_plan_manager` (`manager_employee_id`),
  KEY `fk_improvement_plan_hr_user` (`hr_user_id`),
  KEY `fk_improvement_plan_closed_by` (`closed_by_user_id`),
  KEY `fk_improvement_plan_created_by` (`created_by_user_id`),
  KEY `ix_improvement_plan_employee` (`employee_id`,`plan_status`),
  KEY `ix_improvement_plan_dates` (`start_date`,`end_date`),
  CONSTRAINT `fk_improvement_plan_closed_by` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_improvement_plan_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_improvement_plan_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_improvement_plan_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_improvement_plan_hr_user` FOREIGN KEY (`hr_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_improvement_plan_manager` FOREIGN KEY (`manager_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_improvement_plan_review` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`performance_review_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_improvement_updates
CREATE TABLE IF NOT EXISTS `performance_improvement_updates` (
  `improvement_update_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `improvement_plan_id` bigint(20) unsigned NOT NULL,
  `review_date` date NOT NULL,
  `progress_status` varchar(40) NOT NULL,
  `achievements` longtext DEFAULT NULL,
  `remaining_concerns` longtext DEFAULT NULL,
  `manager_feedback` longtext DEFAULT NULL,
  `employee_feedback` longtext DEFAULT NULL,
  `progress_percentage` decimal(6,2) DEFAULT NULL,
  `next_review_date` date DEFAULT NULL,
  `recorded_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`improvement_update_id`),
  KEY `fk_improvement_update_recorded_by` (`recorded_by_user_id`),
  KEY `ix_improvement_update_plan_date` (`improvement_plan_id`,`review_date`),
  CONSTRAINT `fk_improvement_update_plan` FOREIGN KEY (`improvement_plan_id`) REFERENCES `performance_improvement_plans` (`improvement_plan_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_improvement_update_recorded_by` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_review_participants
CREATE TABLE IF NOT EXISTS `performance_review_participants` (
  `review_participant_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `performance_review_id` bigint(20) unsigned NOT NULL,
  `participant_type` varchar(40) NOT NULL,
  `reviewer_employee_id` bigint(20) unsigned DEFAULT NULL,
  `reviewer_user_id` bigint(20) unsigned DEFAULT NULL,
  `external_reviewer_name` varchar(150) DEFAULT NULL,
  `external_reviewer_email` varchar(150) DEFAULT NULL,
  `response_weight_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `invitation_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `invited_at` datetime DEFAULT NULL,
  `review_status` varchar(30) NOT NULL DEFAULT 'NOT_STARTED',
  `started_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `access_token_hash` varchar(255) DEFAULT NULL,
  `access_token_expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`review_participant_id`),
  UNIQUE KEY `uq_review_participant_internal` (`performance_review_id`,`reviewer_employee_id`,`participant_type`),
  KEY `fk_review_participant_employee` (`reviewer_employee_id`),
  KEY `ix_review_participant_user` (`reviewer_user_id`,`review_status`),
  KEY `ix_review_participant_review` (`performance_review_id`,`participant_type`),
  CONSTRAINT `fk_review_participant_employee` FOREIGN KEY (`reviewer_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_review_participant_review` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`performance_review_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_review_participant_user` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_review_responses
CREATE TABLE IF NOT EXISTS `performance_review_responses` (
  `review_response_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `performance_review_id` bigint(20) unsigned NOT NULL,
  `review_participant_id` bigint(20) unsigned NOT NULL,
  `template_section_id` bigint(20) unsigned NOT NULL,
  `template_question_id` bigint(20) unsigned NOT NULL,
  `response_score` decimal(6,2) DEFAULT NULL,
  `response_text` longtext DEFAULT NULL,
  `response_boolean` tinyint(1) DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `weighted_score` decimal(8,2) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`review_response_id`),
  UNIQUE KEY `uq_participant_question_response` (`review_participant_id`,`template_question_id`),
  KEY `fk_review_response_question` (`template_question_id`),
  KEY `ix_review_response_review` (`performance_review_id`),
  KEY `ix_review_response_section` (`template_section_id`),
  CONSTRAINT `fk_review_response_participant` FOREIGN KEY (`review_participant_id`) REFERENCES `performance_review_participants` (`review_participant_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_review_response_question` FOREIGN KEY (`template_question_id`) REFERENCES `performance_template_questions` (`template_question_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_review_response_review` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`performance_review_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_review_response_section` FOREIGN KEY (`template_section_id`) REFERENCES `performance_template_sections` (`template_section_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_review_summaries
CREATE TABLE IF NOT EXISTS `performance_review_summaries` (
  `review_summary_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `performance_review_id` bigint(20) unsigned NOT NULL,
  `goals_score` decimal(8,2) DEFAULT NULL,
  `kpi_score` decimal(8,2) DEFAULT NULL,
  `competency_score` decimal(8,2) DEFAULT NULL,
  `self_review_score` decimal(8,2) DEFAULT NULL,
  `manager_review_score` decimal(8,2) DEFAULT NULL,
  `peer_review_score` decimal(8,2) DEFAULT NULL,
  `subordinate_review_score` decimal(8,2) DEFAULT NULL,
  `hr_review_score` decimal(8,2) DEFAULT NULL,
  `calculated_score` decimal(8,2) DEFAULT NULL,
  `calibrated_score` decimal(8,2) DEFAULT NULL,
  `final_score` decimal(8,2) DEFAULT NULL,
  `rating_code` varchar(50) DEFAULT NULL,
  `rating_label` varchar(100) DEFAULT NULL,
  `key_strengths` longtext DEFAULT NULL,
  `development_areas` longtext DEFAULT NULL,
  `manager_summary` longtext DEFAULT NULL,
  `employee_comments` longtext DEFAULT NULL,
  `hr_comments` longtext DEFAULT NULL,
  `promotion_recommended` tinyint(1) NOT NULL DEFAULT 0,
  `salary_increase_recommended` tinyint(1) NOT NULL DEFAULT 0,
  `training_recommended` tinyint(1) NOT NULL DEFAULT 0,
  `improvement_plan_required` tinyint(1) NOT NULL DEFAULT 0,
  `recommended_salary_increase_percentage` decimal(6,2) DEFAULT NULL,
  `calibrated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `calibrated_at` datetime DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`review_summary_id`),
  UNIQUE KEY `uq_review_summary_review` (`performance_review_id`),
  KEY `fk_review_summary_calibrated_by` (`calibrated_by_user_id`),
  KEY `fk_review_summary_approved_by` (`approved_by_user_id`),
  KEY `ix_review_summary_rating` (`rating_code`),
  KEY `ix_review_summary_final_score` (`final_score`),
  CONSTRAINT `fk_review_summary_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_review_summary_calibrated_by` FOREIGN KEY (`calibrated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_review_summary_review` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`performance_review_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_reviews
CREATE TABLE IF NOT EXISTS `performance_reviews` (
  `performance_review_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `performance_cycle_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `performance_template_id` bigint(20) unsigned NOT NULL,
  `review_number` varchar(60) NOT NULL,
  `review_type` varchar(40) NOT NULL DEFAULT 'ANNUAL',
  `manager_employee_id` bigint(20) unsigned DEFAULT NULL,
  `review_period_start` date NOT NULL,
  `review_period_end` date NOT NULL,
  `review_status` varchar(30) NOT NULL DEFAULT 'NOT_STARTED',
  `self_review_due_date` date DEFAULT NULL,
  `manager_review_due_date` date DEFAULT NULL,
  `finalization_due_date` date DEFAULT NULL,
  `self_review_submitted_at` datetime DEFAULT NULL,
  `manager_review_submitted_at` datetime DEFAULT NULL,
  `finalized_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `finalized_at` datetime DEFAULT NULL,
  `reopened_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `reopened_at` datetime DEFAULT NULL,
  `reopening_reason` text DEFAULT NULL,
  `employee_acknowledged_at` datetime DEFAULT NULL,
  `employee_acknowledgement_comments` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`performance_review_id`),
  UNIQUE KEY `uq_company_review_number` (`company_id`,`review_number`),
  UNIQUE KEY `uq_employee_cycle_review_type` (`employee_id`,`performance_cycle_id`,`review_type`),
  KEY `fk_performance_review_cycle` (`performance_cycle_id`),
  KEY `fk_performance_review_template` (`performance_template_id`),
  KEY `fk_performance_review_finalized_by` (`finalized_by_user_id`),
  KEY `fk_performance_review_reopened_by` (`reopened_by_user_id`),
  KEY `ix_performance_review_company_status` (`company_id`,`review_status`),
  KEY `ix_performance_review_employee` (`employee_id`,`performance_cycle_id`),
  KEY `ix_performance_review_manager` (`manager_employee_id`,`review_status`),
  CONSTRAINT `fk_performance_review_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_review_cycle` FOREIGN KEY (`performance_cycle_id`) REFERENCES `performance_cycles` (`performance_cycle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_review_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_review_finalized_by` FOREIGN KEY (`finalized_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_review_manager` FOREIGN KEY (`manager_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_review_reopened_by` FOREIGN KEY (`reopened_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_review_template` FOREIGN KEY (`performance_template_id`) REFERENCES `performance_templates` (`performance_template_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_settings
CREATE TABLE IF NOT EXISTS `performance_settings` (
  `performance_setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `default_rating_scale` decimal(5,2) NOT NULL DEFAULT 5.00,
  `minimum_passing_score` decimal(6,2) NOT NULL DEFAULT 50.00,
  `allow_self_review` tinyint(1) NOT NULL DEFAULT 1,
  `allow_peer_review` tinyint(1) NOT NULL DEFAULT 1,
  `allow_subordinate_review` tinyint(1) NOT NULL DEFAULT 0,
  `manager_review_required` tinyint(1) NOT NULL DEFAULT 1,
  `hr_review_required` tinyint(1) NOT NULL DEFAULT 0,
  `goals_weight_percentage` decimal(6,2) NOT NULL DEFAULT 50.00,
  `competency_weight_percentage` decimal(6,2) NOT NULL DEFAULT 30.00,
  `kpi_weight_percentage` decimal(6,2) NOT NULL DEFAULT 20.00,
  `require_employee_acknowledgement` tinyint(1) NOT NULL DEFAULT 1,
  `allow_review_reopening` tinyint(1) NOT NULL DEFAULT 1,
  `require_final_approval` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`performance_setting_id`),
  UNIQUE KEY `uq_performance_setting_company` (`company_id`),
  CONSTRAINT `fk_performance_setting_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_template_questions
CREATE TABLE IF NOT EXISTS `performance_template_questions` (
  `template_question_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `template_section_id` bigint(20) unsigned NOT NULL,
  `question_code` varchar(50) NOT NULL,
  `question_text` text NOT NULL,
  `help_text` text DEFAULT NULL,
  `response_type` varchar(30) NOT NULL DEFAULT 'RATING',
  `minimum_rating` decimal(5,2) DEFAULT NULL,
  `maximum_rating` decimal(5,2) DEFAULT NULL,
  `question_weight_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `allow_comments` tinyint(1) NOT NULL DEFAULT 1,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`template_question_id`),
  UNIQUE KEY `uq_section_question_code` (`template_section_id`,`question_code`),
  UNIQUE KEY `uq_section_question_sequence` (`template_section_id`,`sequence_number`),
  CONSTRAINT `fk_template_question_section` FOREIGN KEY (`template_section_id`) REFERENCES `performance_template_sections` (`template_section_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_template_sections
CREATE TABLE IF NOT EXISTS `performance_template_sections` (
  `template_section_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `performance_template_id` bigint(20) unsigned NOT NULL,
  `section_code` varchar(50) NOT NULL,
  `section_name` varchar(150) NOT NULL,
  `section_description` text DEFAULT NULL,
  `section_type` varchar(40) NOT NULL DEFAULT 'COMPETENCY',
  `section_weight_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`template_section_id`),
  UNIQUE KEY `uq_template_section_code` (`performance_template_id`,`section_code`),
  UNIQUE KEY `uq_template_section_sequence` (`performance_template_id`,`sequence_number`),
  CONSTRAINT `fk_template_section_template` FOREIGN KEY (`performance_template_id`) REFERENCES `performance_templates` (`performance_template_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.performance_templates
CREATE TABLE IF NOT EXISTS `performance_templates` (
  `performance_template_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `template_code` varchar(50) NOT NULL,
  `template_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `employment_type_id` smallint(5) unsigned DEFAULT NULL,
  `review_type` varchar(40) NOT NULL DEFAULT 'ANNUAL',
  `rating_scale_maximum` decimal(5,2) NOT NULL DEFAULT 5.00,
  `include_goals` tinyint(1) NOT NULL DEFAULT 1,
  `include_kpis` tinyint(1) NOT NULL DEFAULT 1,
  `include_competencies` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`performance_template_id`),
  UNIQUE KEY `uq_company_performance_template` (`company_id`,`template_code`),
  KEY `fk_performance_template_department` (`department_id`),
  KEY `fk_performance_template_designation` (`designation_id`),
  KEY `fk_performance_template_employment_type` (`employment_type_id`),
  KEY `fk_performance_template_created_by` (`created_by_user_id`),
  KEY `ix_performance_template_company` (`company_id`,`is_active`),
  CONSTRAINT `fk_performance_template_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_template_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_template_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_template_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_performance_template_employment_type` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`employment_type_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `permission_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `permission_code` varchar(120) NOT NULL,
  `module_name` varchar(80) NOT NULL,
  `action_name` varchar(80) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uq_permission_code` (`permission_code`),
  KEY `ix_permission_module` (`module_name`)
) ENGINE=InnoDB AUTO_INCREMENT=197 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.platform_support_tickets
CREATE TABLE IF NOT EXISTS `platform_support_tickets` (
  `support_ticket_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `opened_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `ticket_number` varchar(60) NOT NULL,
  `ticket_subject` varchar(250) NOT NULL,
  `ticket_description` longtext NOT NULL,
  `ticket_category` varchar(80) DEFAULT NULL,
  `priority_level` varchar(30) NOT NULL DEFAULT 'NORMAL',
  `ticket_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `assigned_to_user_id` bigint(20) unsigned DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `resolution_summary` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`support_ticket_id`),
  UNIQUE KEY `uq_support_ticket_number` (`ticket_number`),
  KEY `fk_support_ticket_company` (`company_id`),
  KEY `fk_support_ticket_opener` (`opened_by_user_id`),
  KEY `fk_support_ticket_assignee` (`assigned_to_user_id`),
  KEY `ix_support_ticket_status` (`ticket_status`,`priority_level`),
  CONSTRAINT `fk_support_ticket_assignee` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_support_ticket_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_support_ticket_opener` FOREIGN KEY (`opened_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.policy_acknowledgements
CREATE TABLE IF NOT EXISTS `policy_acknowledgements` (
  `policy_acknowledgement_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `policy_version_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `acknowledgement_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `due_date` date DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `acknowledgement_comments` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`policy_acknowledgement_id`),
  UNIQUE KEY `uq_policy_ack_employee` (`policy_version_id`,`employee_id`),
  KEY `fk_policy_ack_employee` (`employee_id`),
  KEY `ix_policy_ack_status` (`acknowledgement_status`,`due_date`),
  CONSTRAINT `fk_policy_ack_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_policy_ack_version` FOREIGN KEY (`policy_version_id`) REFERENCES `policy_versions` (`policy_version_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.policy_versions
CREATE TABLE IF NOT EXISTS `policy_versions` (
  `policy_version_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_policy_id` bigint(20) unsigned NOT NULL,
  `version_number` varchar(30) NOT NULL,
  `title` varchar(250) NOT NULL,
  `content_text` longtext DEFAULT NULL,
  `document_storage_path` varchar(700) DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `version_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `published_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`policy_version_id`),
  UNIQUE KEY `uq_policy_version_number` (`company_policy_id`,`version_number`),
  KEY `fk_policy_version_approver` (`approved_by_user_id`),
  KEY `fk_policy_version_publisher` (`published_by_user_id`),
  CONSTRAINT `fk_policy_version_approver` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_policy_version_policy` FOREIGN KEY (`company_policy_id`) REFERENCES `company_policies` (`company_policy_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_policy_version_publisher` FOREIGN KEY (`published_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.position_assignments
CREATE TABLE IF NOT EXISTS `position_assignments` (
  `position_assignment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `position_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `assignment_type` varchar(30) NOT NULL DEFAULT 'PRIMARY',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `assigned_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`position_assignment_id`),
  UNIQUE KEY `uq_position_assignment_date` (`position_id`,`employee_id`,`effective_from`),
  KEY `fk_position_assignment_employee` (`employee_id`),
  KEY `fk_position_assignment_user` (`assigned_by_user_id`),
  KEY `ix_position_assignment_current` (`position_id`,`is_current`),
  CONSTRAINT `fk_position_assignment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_position_assignment_position` FOREIGN KEY (`position_id`) REFERENCES `positions` (`position_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_position_assignment_user` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.positions
CREATE TABLE IF NOT EXISTS `positions` (
  `position_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `reports_to_position_id` bigint(20) unsigned DEFAULT NULL,
  `position_code` varchar(60) NOT NULL,
  `position_title` varchar(200) NOT NULL,
  `position_type` varchar(40) NOT NULL DEFAULT 'PERMANENT',
  `approved_headcount` smallint(5) unsigned NOT NULL DEFAULT 1,
  `filled_headcount` smallint(5) unsigned NOT NULL DEFAULT 0,
  `minimum_salary` decimal(15,2) DEFAULT NULL,
  `maximum_salary` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `position_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`position_id`),
  -- edited by wali: Position codes are scoped to their department.
  UNIQUE KEY `uq_position_code` (`company_id`,`department_id`,`position_code`),
  KEY `fk_position_branch` (`branch_id`),
  KEY `fk_position_department` (`department_id`),
  KEY `fk_position_designation` (`designation_id`),
  KEY `fk_position_parent` (`reports_to_position_id`),
  CONSTRAINT `fk_position_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_position_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_position_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_position_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_position_parent` FOREIGN KEY (`reports_to_position_id`) REFERENCES `positions` (`position_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.project_members
CREATE TABLE IF NOT EXISTS `project_members` (
  `project_member_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `project_role` varchar(100) DEFAULT NULL,
  `allocation_percentage` decimal(6,2) NOT NULL DEFAULT 100.00,
  `billable_rate` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `member_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `added_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`project_member_id`),
  UNIQUE KEY `uq_project_member_date` (`project_id`,`employee_id`,`start_date`),
  KEY `fk_project_member_user` (`added_by_user_id`),
  KEY `ix_project_member_employee` (`employee_id`,`member_status`),
  CONSTRAINT `fk_project_member_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_member_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_member_user` FOREIGN KEY (`added_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.projects
CREATE TABLE IF NOT EXISTS `projects` (
  `project_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `project_code` varchar(60) NOT NULL,
  `project_name` varchar(250) NOT NULL,
  `client_name` varchar(250) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `project_manager_employee_id` bigint(20) unsigned DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `budget_amount` decimal(18,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `is_billable` tinyint(1) NOT NULL DEFAULT 0,
  `project_status` varchar(30) NOT NULL DEFAULT 'PLANNED',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`project_id`),
  UNIQUE KEY `uq_project_code` (`company_id`,`project_code`),
  KEY `fk_project_branch` (`branch_id`),
  KEY `fk_project_department` (`department_id`),
  KEY `fk_project_manager` (`project_manager_employee_id`),
  KEY `fk_project_creator` (`created_by_user_id`),
  KEY `ix_project_status` (`company_id`,`project_status`),
  CONSTRAINT `fk_project_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_project_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_project_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_project_manager` FOREIGN KEY (`project_manager_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.promotion_requests
CREATE TABLE IF NOT EXISTS `promotion_requests` (
  `promotion_request_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `performance_review_id` bigint(20) unsigned DEFAULT NULL,
  `promotion_number` varchar(60) NOT NULL,
  `current_branch_id` bigint(20) unsigned DEFAULT NULL,
  `current_department_id` bigint(20) unsigned DEFAULT NULL,
  `current_designation_id` bigint(20) unsigned DEFAULT NULL,
  `current_pay_grade_id` bigint(20) unsigned DEFAULT NULL,
  `proposed_branch_id` bigint(20) unsigned DEFAULT NULL,
  `proposed_department_id` bigint(20) unsigned DEFAULT NULL,
  `proposed_designation_id` bigint(20) unsigned DEFAULT NULL,
  `proposed_pay_grade_id` bigint(20) unsigned DEFAULT NULL,
  `proposed_reporting_manager_id` bigint(20) unsigned DEFAULT NULL,
  `current_basic_salary` decimal(15,2) DEFAULT NULL,
  `proposed_basic_salary` decimal(15,2) DEFAULT NULL,
  `effective_date` date NOT NULL,
  `promotion_reason` longtext NOT NULL,
  `request_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `requested_at` datetime DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approval_comments` text DEFAULT NULL,
  `implemented_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `implemented_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`promotion_request_id`),
  UNIQUE KEY `uq_company_promotion_number` (`company_id`,`promotion_number`),
  KEY `fk_promotion_review` (`performance_review_id`),
  KEY `fk_promotion_current_branch` (`current_branch_id`),
  KEY `fk_promotion_current_department` (`current_department_id`),
  KEY `fk_promotion_current_designation` (`current_designation_id`),
  KEY `fk_promotion_current_pay_grade` (`current_pay_grade_id`),
  KEY `fk_promotion_proposed_branch` (`proposed_branch_id`),
  KEY `fk_promotion_proposed_department` (`proposed_department_id`),
  KEY `fk_promotion_proposed_designation` (`proposed_designation_id`),
  KEY `fk_promotion_proposed_pay_grade` (`proposed_pay_grade_id`),
  KEY `fk_promotion_proposed_manager` (`proposed_reporting_manager_id`),
  KEY `fk_promotion_requested_by` (`requested_by_user_id`),
  KEY `fk_promotion_approved_by` (`approved_by_user_id`),
  KEY `fk_promotion_implemented_by` (`implemented_by_user_id`),
  KEY `ix_promotion_employee` (`employee_id`,`request_status`),
  KEY `ix_promotion_effective_date` (`effective_date`),
  CONSTRAINT `fk_promotion_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_current_branch` FOREIGN KEY (`current_branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_current_department` FOREIGN KEY (`current_department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_current_designation` FOREIGN KEY (`current_designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_current_pay_grade` FOREIGN KEY (`current_pay_grade_id`) REFERENCES `pay_grades` (`pay_grade_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_implemented_by` FOREIGN KEY (`implemented_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_proposed_branch` FOREIGN KEY (`proposed_branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_proposed_department` FOREIGN KEY (`proposed_department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_proposed_designation` FOREIGN KEY (`proposed_designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_proposed_manager` FOREIGN KEY (`proposed_reporting_manager_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_proposed_pay_grade` FOREIGN KEY (`proposed_pay_grade_id`) REFERENCES `pay_grades` (`pay_grade_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_review` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`performance_review_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.recruitment_settings
CREATE TABLE IF NOT EXISTS `recruitment_settings` (
  `recruitment_setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `careers_page_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `careers_page_title` varchar(200) DEFAULT NULL,
  `careers_page_description` text DEFAULT NULL,
  `candidate_code_prefix` varchar(20) NOT NULL DEFAULT 'CAN',
  `application_code_prefix` varchar(20) NOT NULL DEFAULT 'APP',
  `requisition_code_prefix` varchar(20) NOT NULL DEFAULT 'REQ',
  `job_code_prefix` varchar(20) NOT NULL DEFAULT 'JOB',
  `offer_code_prefix` varchar(20) NOT NULL DEFAULT 'OFF',
  `require_candidate_consent` tinyint(1) NOT NULL DEFAULT 1,
  `candidate_retention_days` int(10) unsigned NOT NULL DEFAULT 730,
  `allow_employee_referrals` tinyint(1) NOT NULL DEFAULT 1,
  `require_requisition_approval` tinyint(1) NOT NULL DEFAULT 1,
  `require_offer_approval` tinyint(1) NOT NULL DEFAULT 1,
  `default_requisition_approval_levels` smallint(5) unsigned NOT NULL DEFAULT 1,
  `default_offer_approval_levels` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`recruitment_setting_id`),
  UNIQUE KEY `uq_recruitment_settings_company` (`company_id`),
  CONSTRAINT `fk_recruitment_settings_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.recruitment_stages
CREATE TABLE IF NOT EXISTS `recruitment_stages` (
  `recruitment_stage_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `stage_code` varchar(50) NOT NULL,
  `stage_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `stage_type` varchar(40) NOT NULL DEFAULT 'PROCESS',
  `default_sequence` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_initial_stage` tinyint(1) NOT NULL DEFAULT 0,
  `is_final_stage` tinyint(1) NOT NULL DEFAULT 0,
  `is_success_stage` tinyint(1) NOT NULL DEFAULT 0,
  `is_rejection_stage` tinyint(1) NOT NULL DEFAULT 0,
  `display_color` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`recruitment_stage_id`),
  UNIQUE KEY `uq_company_recruitment_stage` (`company_id`,`stage_code`),
  KEY `ix_recruitment_stage_company` (`company_id`,`is_active`),
  KEY `ix_recruitment_stage_sequence` (`company_id`,`default_sequence`),
  CONSTRAINT `fk_recruitment_stage_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` bigint(20) unsigned NOT NULL,
  `permission_id` bigint(20) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `ix_role_permission_permission` (`permission_id`),
  CONSTRAINT `fk_role_permission_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_role_permission_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `role_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `role_scope_id` bigint(20) unsigned GENERATED ALWAYS AS (IFNULL(`company_id`, 0)) STORED,
  `role_code` varchar(50) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_system_role` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_role_scope_code` (`role_scope_id`, `role_code`),
  KEY `ix_roles_company_id` (`company_id`),
  CONSTRAINT `fk_roles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.salary_structure_components
CREATE TABLE IF NOT EXISTS `salary_structure_components` (
  `structure_component_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `salary_structure_id` bigint(20) unsigned NOT NULL,
  `pay_component_id` bigint(20) unsigned NOT NULL,
  `base_component_id` bigint(20) unsigned DEFAULT NULL,
  `calculation_type` varchar(40) NOT NULL DEFAULT 'FIXED',
  `fixed_amount` decimal(15,2) DEFAULT NULL,
  `percentage_value` decimal(8,4) DEFAULT NULL,
  `formula_expression` text DEFAULT NULL,
  `minimum_amount` decimal(15,2) DEFAULT NULL,
  `maximum_amount` decimal(15,2) DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`structure_component_id`),
  UNIQUE KEY `uq_structure_component` (`salary_structure_id`,`pay_component_id`),
  KEY `fk_structure_component_base` (`base_component_id`),
  KEY `ix_structure_component_structure` (`salary_structure_id`),
  KEY `ix_structure_component_pay_component` (`pay_component_id`),
  CONSTRAINT `fk_structure_component_base` FOREIGN KEY (`base_component_id`) REFERENCES `pay_components` (`pay_component_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_structure_component_pay_component` FOREIGN KEY (`pay_component_id`) REFERENCES `pay_components` (`pay_component_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_structure_component_structure` FOREIGN KEY (`salary_structure_id`) REFERENCES `salary_structures` (`salary_structure_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.salary_structures
CREATE TABLE IF NOT EXISTS `salary_structures` (
  `salary_structure_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `pay_grade_id` bigint(20) unsigned DEFAULT NULL,
  `structure_code` varchar(50) NOT NULL,
  `structure_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `payroll_frequency` varchar(30) NOT NULL DEFAULT 'MONTHLY',
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`salary_structure_id`),
  UNIQUE KEY `uq_company_salary_structure` (`company_id`,`structure_code`),
  KEY `ix_salary_structure_company` (`company_id`,`is_active`),
  KEY `ix_salary_structure_grade` (`pay_grade_id`),
  CONSTRAINT `fk_salary_structure_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_salary_structure_grade` FOREIGN KEY (`pay_grade_id`) REFERENCES `pay_grades` (`pay_grade_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.saved_reports
CREATE TABLE IF NOT EXISTS `saved_reports` (
  `saved_report_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `report_code` varchar(60) NOT NULL,
  `report_name` varchar(250) NOT NULL,
  `module_name` varchar(80) NOT NULL,
  `description` text DEFAULT NULL,
  `report_type` varchar(40) NOT NULL DEFAULT 'TABULAR',
  `query_definition` longtext NOT NULL,
  `column_definition` longtext DEFAULT NULL,
  `filter_definition` longtext DEFAULT NULL,
  `is_system_report` tinyint(1) NOT NULL DEFAULT 0,
  `is_shared` tinyint(1) NOT NULL DEFAULT 0,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`saved_report_id`),
  UNIQUE KEY `uq_saved_report_code` (`company_id`,`report_code`),
  KEY `fk_saved_report_user` (`created_by_user_id`),
  CONSTRAINT `fk_saved_report_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_saved_report_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.scheduled_reports
CREATE TABLE IF NOT EXISTS `scheduled_reports` (
  `scheduled_report_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `saved_report_id` bigint(20) unsigned NOT NULL,
  `company_id` bigint(20) unsigned NOT NULL,
  `schedule_name` varchar(200) NOT NULL,
  `cron_expression` varchar(100) NOT NULL,
  `timezone` varchar(60) NOT NULL DEFAULT 'Asia/Karachi',
  `output_format` varchar(20) NOT NULL DEFAULT 'XLSX',
  `recipient_emails` longtext DEFAULT NULL,
  `delivery_channel` varchar(30) NOT NULL DEFAULT 'EMAIL',
  `last_run_at` datetime DEFAULT NULL,
  `next_run_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`scheduled_report_id`),
  KEY `fk_scheduled_report_report` (`saved_report_id`),
  KEY `fk_scheduled_report_company` (`company_id`),
  KEY `fk_scheduled_report_user` (`created_by_user_id`),
  KEY `ix_scheduled_report_next` (`is_active`,`next_run_at`),
  CONSTRAINT `fk_scheduled_report_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_scheduled_report_report` FOREIGN KEY (`saved_report_id`) REFERENCES `saved_reports` (`saved_report_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_scheduled_report_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.shifts
CREATE TABLE IF NOT EXISTS `shifts` (
  `shift_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `shift_code` varchar(50) NOT NULL,
  `shift_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `crosses_midnight` tinyint(1) NOT NULL DEFAULT 0,
  `is_flexible` tinyint(1) NOT NULL DEFAULT 0,
  `break_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `expected_work_minutes` smallint(5) unsigned NOT NULL DEFAULT 480,
  `check_in_start_time` time DEFAULT NULL,
  `check_in_end_time` time DEFAULT NULL,
  `check_out_start_time` time DEFAULT NULL,
  `check_out_end_time` time DEFAULT NULL,
  `late_grace_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `early_departure_grace_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `overtime_after_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`shift_id`),
  UNIQUE KEY `uq_company_shift_code` (`company_id`,`shift_code`),
  KEY `ix_shift_company` (`company_id`),
  KEY `ix_shift_branch` (`branch_id`),
  KEY `ix_shift_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_shift_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_shift_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.skill_categories
CREATE TABLE IF NOT EXISTS `skill_categories` (
  `skill_category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `parent_skill_category_id` bigint(20) unsigned DEFAULT NULL,
  `category_code` varchar(50) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`skill_category_id`),
  UNIQUE KEY `uq_company_skill_category` (`company_id`,`category_code`),
  KEY `ix_skill_category_parent` (`parent_skill_category_id`),
  KEY `ix_skill_category_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_skill_category_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_skill_category_parent` FOREIGN KEY (`parent_skill_category_id`) REFERENCES `skill_categories` (`skill_category_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.skills
CREATE TABLE IF NOT EXISTS `skills` (
  `skill_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `skill_category_id` bigint(20) unsigned DEFAULT NULL,
  `skill_code` varchar(50) NOT NULL,
  `skill_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `skill_type` varchar(40) NOT NULL DEFAULT 'TECHNICAL',
  `proficiency_scale_maximum` decimal(5,2) NOT NULL DEFAULT 5.00,
  `measurement_method` varchar(40) NOT NULL DEFAULT 'RATING',
  `is_certification_required` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`skill_id`),
  UNIQUE KEY `uq_company_skill` (`company_id`,`skill_code`),
  KEY `ix_skill_category` (`skill_category_id`),
  KEY `ix_skill_company_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_skill_category` FOREIGN KEY (`skill_category_id`) REFERENCES `skill_categories` (`skill_category_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_skill_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.subscription_invoices
CREATE TABLE IF NOT EXISTS `subscription_invoices` (
  `subscription_invoice_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `subscription_id` bigint(20) unsigned DEFAULT NULL,
  `invoice_number` varchar(60) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `billing_period_start` date DEFAULT NULL,
  `billing_period_end` date DEFAULT NULL,
  `subtotal_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `balance_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `invoice_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `invoice_storage_path` varchar(700) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`subscription_invoice_id`),
  UNIQUE KEY `uq_subscription_invoice_number` (`company_id`,`invoice_number`),
  KEY `fk_subscription_invoice_subscription` (`subscription_id`),
  KEY `ix_subscription_invoice_status` (`company_id`,`invoice_status`,`due_date`),
  CONSTRAINT `fk_subscription_invoice_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_subscription_invoice_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `company_subscriptions` (`subscription_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.subscription_payments
CREATE TABLE IF NOT EXISTS `subscription_payments` (
  `subscription_payment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `subscription_invoice_id` bigint(20) unsigned DEFAULT NULL,
  `payment_number` varchar(60) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(40) NOT NULL,
  `payment_amount` decimal(18,2) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `transaction_reference` varchar(200) DEFAULT NULL,
  `payment_status` varchar(30) NOT NULL DEFAULT 'COMPLETED',
  `received_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`subscription_payment_id`),
  UNIQUE KEY `uq_subscription_payment_number` (`company_id`,`payment_number`),
  KEY `fk_subscription_payment_invoice` (`subscription_invoice_id`),
  KEY `fk_subscription_payment_user` (`received_by_user_id`),
  CONSTRAINT `fk_subscription_payment_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_subscription_payment_invoice` FOREIGN KEY (`subscription_invoice_id`) REFERENCES `subscription_invoices` (`subscription_invoice_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_subscription_payment_user` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.subscription_plan_features
CREATE TABLE IF NOT EXISTS `subscription_plan_features` (
  `subscription_plan_feature_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `plan_id` bigint(20) unsigned NOT NULL,
  `feature_flag_id` bigint(20) unsigned NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `configuration_payload` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`subscription_plan_feature_id`),
  UNIQUE KEY `uq_subscription_plan_feature` (`plan_id`,`feature_flag_id`),
  KEY `ix_subscription_plan_feature_feature` (`feature_flag_id`,`is_enabled`),
  CONSTRAINT `fk_subscription_plan_feature_feature` FOREIGN KEY (`feature_flag_id`) REFERENCES `feature_flags` (`feature_flag_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_subscription_plan_feature_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`plan_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_subscription_plan_feature_enabled` CHECK (`is_enabled` in (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.subscription_plans
CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `plan_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `plan_code` varchar(50) NOT NULL,
  `plan_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `maximum_employees` int(10) unsigned DEFAULT NULL,
  `maximum_branches` int(10) unsigned DEFAULT NULL,
  `maximum_users` int(10) unsigned DEFAULT NULL,
  `storage_limit_mb` int(10) unsigned DEFAULT NULL,
  `monthly_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `annual_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `trial_days` smallint(5) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`plan_id`),
  UNIQUE KEY `uq_plan_code` (`plan_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.succession_candidates
CREATE TABLE IF NOT EXISTS `succession_candidates` (
  `succession_candidate_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `succession_plan_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `readiness_level` varchar(30) NOT NULL DEFAULT 'DEVELOPING',
  `readiness_score` decimal(6,2) DEFAULT NULL,
  `performance_score` decimal(6,2) DEFAULT NULL,
  `potential_score` decimal(6,2) DEFAULT NULL,
  `retention_risk` varchar(30) DEFAULT NULL,
  `target_ready_date` date DEFAULT NULL,
  `development_plan_id` bigint(20) unsigned DEFAULT NULL,
  `candidate_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `nominated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `nomination_notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`succession_candidate_id`),
  UNIQUE KEY `uq_succession_candidate` (`succession_plan_id`,`employee_id`),
  KEY `fk_succession_candidate_employee` (`employee_id`),
  KEY `fk_succession_candidate_devplan` (`development_plan_id`),
  KEY `fk_succession_candidate_user` (`nominated_by_user_id`),
  CONSTRAINT `fk_succession_candidate_devplan` FOREIGN KEY (`development_plan_id`) REFERENCES `development_plans` (`development_plan_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_succession_candidate_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_succession_candidate_plan` FOREIGN KEY (`succession_plan_id`) REFERENCES `succession_plans` (`succession_plan_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_succession_candidate_user` FOREIGN KEY (`nominated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.succession_plans
CREATE TABLE IF NOT EXISTS `succession_plans` (
  `succession_plan_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `position_id` bigint(20) unsigned NOT NULL,
  `plan_code` varchar(60) NOT NULL,
  `criticality_level` varchar(30) NOT NULL DEFAULT 'MEDIUM',
  `risk_of_vacancy` varchar(30) DEFAULT NULL,
  `readiness_target_date` date DEFAULT NULL,
  `plan_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `owner_user_id` bigint(20) unsigned DEFAULT NULL,
  `notes` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`succession_plan_id`),
  UNIQUE KEY `uq_succession_plan_position` (`position_id`),
  UNIQUE KEY `uq_succession_plan_code` (`company_id`,`plan_code`),
  KEY `fk_succession_plan_owner` (`owner_user_id`),
  CONSTRAINT `fk_succession_plan_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_succession_plan_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_succession_plan_position` FOREIGN KEY (`position_id`) REFERENCES `positions` (`position_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.survey_answers
CREATE TABLE IF NOT EXISTS `survey_answers` (
  `survey_answer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `survey_response_id` bigint(20) unsigned NOT NULL,
  `survey_question_id` bigint(20) unsigned NOT NULL,
  `survey_option_id` bigint(20) unsigned DEFAULT NULL,
  `answer_text` longtext DEFAULT NULL,
  `answer_numeric` decimal(18,4) DEFAULT NULL,
  `answer_boolean` tinyint(1) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`survey_answer_id`),
  UNIQUE KEY `uq_survey_answer_question` (`survey_response_id`,`survey_question_id`),
  KEY `fk_survey_answer_question` (`survey_question_id`),
  KEY `fk_survey_answer_option` (`survey_option_id`),
  CONSTRAINT `fk_survey_answer_option` FOREIGN KEY (`survey_option_id`) REFERENCES `survey_options` (`survey_option_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_survey_answer_question` FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions` (`survey_question_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_survey_answer_response` FOREIGN KEY (`survey_response_id`) REFERENCES `survey_responses` (`survey_response_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.survey_options
CREATE TABLE IF NOT EXISTS `survey_options` (
  `survey_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `survey_question_id` bigint(20) unsigned NOT NULL,
  `option_text` varchar(500) NOT NULL,
  `option_value` varchar(100) DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`survey_option_id`),
  UNIQUE KEY `uq_survey_option_sequence` (`survey_question_id`,`sequence_number`),
  CONSTRAINT `fk_survey_option_question` FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions` (`survey_question_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.survey_questions
CREATE TABLE IF NOT EXISTS `survey_questions` (
  `survey_question_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `survey_id` bigint(20) unsigned NOT NULL,
  `question_text` longtext NOT NULL,
  `question_type` varchar(40) NOT NULL DEFAULT 'SINGLE_CHOICE',
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `sequence_number` smallint(5) unsigned NOT NULL,
  `rating_minimum` decimal(5,2) DEFAULT NULL,
  `rating_maximum` decimal(5,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`survey_question_id`),
  UNIQUE KEY `uq_survey_question_sequence` (`survey_id`,`sequence_number`),
  CONSTRAINT `fk_survey_question_survey` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`survey_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.survey_responses
CREATE TABLE IF NOT EXISTS `survey_responses` (
  `survey_response_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `survey_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `response_token_hash` varchar(255) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `response_status` varchar(30) NOT NULL DEFAULT 'IN_PROGRESS',
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`survey_response_id`),
  KEY `fk_survey_response_employee` (`employee_id`),
  KEY `ix_survey_response_status` (`survey_id`,`response_status`),
  CONSTRAINT `fk_survey_response_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_survey_response_survey` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`survey_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.surveys
CREATE TABLE IF NOT EXISTS `surveys` (
  `survey_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `survey_code` varchar(60) NOT NULL,
  `survey_title` varchar(250) NOT NULL,
  `survey_description` longtext DEFAULT NULL,
  `survey_type` varchar(50) NOT NULL DEFAULT 'ENGAGEMENT',
  `is_anonymous` tinyint(1) NOT NULL DEFAULT 0,
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `survey_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`survey_id`),
  UNIQUE KEY `uq_survey_code` (`company_id`,`survey_code`),
  KEY `fk_survey_user` (`created_by_user_id`),
  CONSTRAINT `fk_survey_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_survey_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.system_error_logs
CREATE TABLE IF NOT EXISTS `system_error_logs` (
  `system_error_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `error_code` varchar(100) DEFAULT NULL,
  `error_message` longtext NOT NULL,
  `error_stack` longtext DEFAULT NULL,
  `request_method` varchar(10) DEFAULT NULL,
  `request_path` varchar(1000) DEFAULT NULL,
  `request_id` varchar(100) DEFAULT NULL,
  `environment_name` varchar(50) DEFAULT NULL,
  `severity_level` varchar(30) NOT NULL DEFAULT 'ERROR',
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`system_error_log_id`),
  KEY `fk_system_error_company` (`company_id`),
  KEY `fk_system_error_user` (`user_id`),
  KEY `fk_system_error_resolver` (`resolved_by_user_id`),
  KEY `ix_system_error_severity` (`severity_level`,`created_at`),
  KEY `ix_system_error_request` (`request_id`),
  CONSTRAINT `fk_system_error_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_system_error_resolver` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_system_error_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.talent_pool_candidates
CREATE TABLE IF NOT EXISTS `talent_pool_candidates` (
  `talent_pool_candidate_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `talent_pool_id` bigint(20) unsigned NOT NULL,
  `candidate_id` bigint(20) unsigned NOT NULL,
  `added_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `added_at` datetime NOT NULL DEFAULT current_timestamp(),
  `candidate_rating` decimal(6,2) DEFAULT NULL,
  `availability_status` varchar(30) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`talent_pool_candidate_id`),
  UNIQUE KEY `uq_talent_pool_candidate` (`talent_pool_id`,`candidate_id`),
  KEY `fk_talent_pool_candidate_added_by` (`added_by_user_id`),
  KEY `ix_talent_pool_candidate_candidate` (`candidate_id`),
  CONSTRAINT `fk_talent_pool_candidate_added_by` FOREIGN KEY (`added_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_talent_pool_candidate_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`candidate_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_talent_pool_candidate_pool` FOREIGN KEY (`talent_pool_id`) REFERENCES `talent_pools` (`talent_pool_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.talent_pools
CREATE TABLE IF NOT EXISTS `talent_pools` (
  `talent_pool_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `pool_code` varchar(50) NOT NULL,
  `pool_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `designation_id` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`talent_pool_id`),
  UNIQUE KEY `uq_company_talent_pool` (`company_id`,`pool_code`),
  KEY `fk_talent_pool_department` (`department_id`),
  KEY `fk_talent_pool_designation` (`designation_id`),
  KEY `fk_talent_pool_created_by` (`created_by_user_id`),
  KEY `ix_talent_pool_company` (`company_id`,`is_active`),
  CONSTRAINT `fk_talent_pool_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_talent_pool_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_talent_pool_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_talent_pool_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.tax_rule_slabs
CREATE TABLE IF NOT EXISTS `tax_rule_slabs` (
  `tax_slab_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tax_rule_id` bigint(20) unsigned NOT NULL,
  `slab_order` smallint(5) unsigned NOT NULL,
  `minimum_taxable_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `maximum_taxable_amount` decimal(15,2) DEFAULT NULL,
  `fixed_tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_percentage` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `excess_over_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`tax_slab_id`),
  UNIQUE KEY `uq_tax_rule_slab_order` (`tax_rule_id`,`slab_order`),
  KEY `ix_tax_slab_range` (`tax_rule_id`,`minimum_taxable_amount`,`maximum_taxable_amount`),
  CONSTRAINT `fk_tax_slab_rule` FOREIGN KEY (`tax_rule_id`) REFERENCES `tax_rules` (`tax_rule_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.tax_rules
CREATE TABLE IF NOT EXISTS `tax_rules` (
  `tax_rule_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `tax_rule_code` varchar(50) NOT NULL,
  `tax_rule_name` varchar(150) NOT NULL,
  `country_code` char(2) NOT NULL DEFAULT 'PK',
  `region_code` varchar(50) DEFAULT NULL,
  `tax_year_start` date NOT NULL,
  `tax_year_end` date NOT NULL,
  `calculation_method` varchar(40) NOT NULL DEFAULT 'ANNUALIZED',
  `annual_exemption_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `fixed_rebate_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`tax_rule_id`),
  UNIQUE KEY `uq_company_tax_rule` (`company_id`,`tax_rule_code`),
  KEY `ix_tax_rule_year` (`company_id`,`tax_year_start`,`tax_year_end`),
  CONSTRAINT `fk_tax_rule_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.tenant_usage_snapshots
CREATE TABLE IF NOT EXISTS `tenant_usage_snapshots` (
  `tenant_usage_snapshot_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `snapshot_date` date NOT NULL,
  `active_employee_count` int(10) unsigned NOT NULL DEFAULT 0,
  `active_user_count` int(10) unsigned NOT NULL DEFAULT 0,
  `branch_count` int(10) unsigned NOT NULL DEFAULT 0,
  `database_size_bytes` bigint(20) unsigned NOT NULL DEFAULT 0,
  `file_storage_bytes` bigint(20) unsigned NOT NULL DEFAULT 0,
  `api_requests_count` bigint(20) unsigned NOT NULL DEFAULT 0,
  `emails_sent_count` bigint(20) unsigned NOT NULL DEFAULT 0,
  `sms_sent_count` bigint(20) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`tenant_usage_snapshot_id`),
  UNIQUE KEY `uq_tenant_usage_date` (`company_id`,`snapshot_date`),
  CONSTRAINT `fk_tenant_usage_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.timesheet_entries
CREATE TABLE IF NOT EXISTS `timesheet_entries` (
  `timesheet_entry_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `timesheet_id` bigint(20) unsigned NOT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `work_date` date NOT NULL,
  `task_name` varchar(250) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `regular_hours` decimal(8,2) NOT NULL DEFAULT 0.00,
  `overtime_hours` decimal(8,2) NOT NULL DEFAULT 0.00,
  `billable_hours` decimal(8,2) NOT NULL DEFAULT 0.00,
  `entry_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`timesheet_entry_id`),
  KEY `ix_timesheet_entry_date` (`timesheet_id`,`work_date`),
  KEY `ix_timesheet_entry_project` (`project_id`,`work_date`),
  CONSTRAINT `fk_timesheet_entry_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_timesheet_entry_timesheet` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheets` (`timesheet_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.timesheet_periods
CREATE TABLE IF NOT EXISTS `timesheet_periods` (
  `timesheet_period_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `period_code` varchar(50) NOT NULL,
  `period_name` varchar(150) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `submission_deadline` datetime DEFAULT NULL,
  `approval_deadline` datetime DEFAULT NULL,
  `period_status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `closed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`timesheet_period_id`),
  UNIQUE KEY `uq_timesheet_period_code` (`company_id`,`period_code`),
  KEY `fk_timesheet_period_user` (`closed_by_user_id`),
  KEY `ix_timesheet_period_dates` (`company_id`,`start_date`,`end_date`),
  CONSTRAINT `fk_timesheet_period_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_timesheet_period_user` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.timesheets
CREATE TABLE IF NOT EXISTS `timesheets` (
  `timesheet_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `timesheet_period_id` bigint(20) unsigned NOT NULL,
  `total_hours` decimal(10,2) NOT NULL DEFAULT 0.00,
  `billable_hours` decimal(10,2) NOT NULL DEFAULT 0.00,
  `overtime_hours` decimal(10,2) NOT NULL DEFAULT 0.00,
  `timesheet_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `submitted_at` datetime DEFAULT NULL,
  `final_approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `final_approved_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`timesheet_id`),
  UNIQUE KEY `uq_timesheet_employee_period` (`employee_id`,`timesheet_period_id`),
  KEY `fk_timesheet_period` (`timesheet_period_id`),
  KEY `fk_timesheet_approver` (`final_approved_by_user_id`),
  KEY `ix_timesheet_status` (`company_id`,`timesheet_status`),
  CONSTRAINT `fk_timesheet_approver` FOREIGN KEY (`final_approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_timesheet_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_timesheet_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_timesheet_period` FOREIGN KEY (`timesheet_period_id`) REFERENCES `timesheet_periods` (`timesheet_period_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_assessment_answers
CREATE TABLE IF NOT EXISTS `training_assessment_answers` (
  `assessment_answer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `assessment_attempt_id` bigint(20) unsigned NOT NULL,
  `assessment_question_id` bigint(20) unsigned NOT NULL,
  `selected_option_id` bigint(20) unsigned DEFAULT NULL,
  `answer_text` longtext DEFAULT NULL,
  `answer_numeric` decimal(18,4) DEFAULT NULL,
  `answer_boolean` tinyint(1) DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `marks_awarded` decimal(10,2) NOT NULL DEFAULT 0.00,
  `evaluator_comments` text DEFAULT NULL,
  `answered_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assessment_answer_id`),
  UNIQUE KEY `uq_attempt_question_answer` (`assessment_attempt_id`,`assessment_question_id`),
  KEY `fk_assessment_answer_question` (`assessment_question_id`),
  KEY `ix_assessment_answer_option` (`selected_option_id`),
  CONSTRAINT `fk_assessment_answer_attempt` FOREIGN KEY (`assessment_attempt_id`) REFERENCES `training_assessment_attempts` (`assessment_attempt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_assessment_answer_option` FOREIGN KEY (`selected_option_id`) REFERENCES `training_assessment_options` (`assessment_option_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assessment_answer_question` FOREIGN KEY (`assessment_question_id`) REFERENCES `training_assessment_questions` (`assessment_question_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_assessment_attempts
CREATE TABLE IF NOT EXISTS `training_assessment_attempts` (
  `assessment_attempt_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_enrollment_id` bigint(20) unsigned NOT NULL,
  `training_assessment_id` bigint(20) unsigned NOT NULL,
  `attempt_number` smallint(5) unsigned NOT NULL,
  `started_at` datetime NOT NULL DEFAULT current_timestamp(),
  `submitted_at` datetime DEFAULT NULL,
  `obtained_marks` decimal(10,2) NOT NULL DEFAULT 0.00,
  `percentage_score` decimal(8,2) DEFAULT NULL,
  `result_status` varchar(30) DEFAULT NULL,
  `attempt_status` varchar(30) NOT NULL DEFAULT 'IN_PROGRESS',
  `time_spent_seconds` int(10) unsigned DEFAULT NULL,
  `graded_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  `grader_comments` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assessment_attempt_id`),
  UNIQUE KEY `uq_enrollment_assessment_attempt` (`training_enrollment_id`,`training_assessment_id`,`attempt_number`),
  KEY `fk_assessment_attempt_assessment` (`training_assessment_id`),
  KEY `fk_assessment_attempt_graded_by` (`graded_by_user_id`),
  KEY `ix_assessment_attempt_status` (`attempt_status`,`result_status`),
  CONSTRAINT `fk_assessment_attempt_assessment` FOREIGN KEY (`training_assessment_id`) REFERENCES `training_assessments` (`training_assessment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_assessment_attempt_enrollment` FOREIGN KEY (`training_enrollment_id`) REFERENCES `training_enrollments` (`training_enrollment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_assessment_attempt_graded_by` FOREIGN KEY (`graded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_assessment_options
CREATE TABLE IF NOT EXISTS `training_assessment_options` (
  `assessment_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `assessment_question_id` bigint(20) unsigned NOT NULL,
  `option_text` longtext NOT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_correct` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assessment_option_id`),
  UNIQUE KEY `uq_question_option_sequence` (`assessment_question_id`,`sequence_number`),
  CONSTRAINT `fk_assessment_option_question` FOREIGN KEY (`assessment_question_id`) REFERENCES `training_assessment_questions` (`assessment_question_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_assessment_questions
CREATE TABLE IF NOT EXISTS `training_assessment_questions` (
  `assessment_question_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_assessment_id` bigint(20) unsigned NOT NULL,
  `question_code` varchar(60) NOT NULL,
  `question_text` longtext NOT NULL,
  `help_text` text DEFAULT NULL,
  `question_type` varchar(40) NOT NULL DEFAULT 'SINGLE_CHOICE',
  `marks` decimal(10,2) NOT NULL DEFAULT 1.00,
  `negative_marks` decimal(10,2) NOT NULL DEFAULT 0.00,
  `correct_text_answer` longtext DEFAULT NULL,
  `correct_numeric_answer` decimal(18,4) DEFAULT NULL,
  `sequence_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assessment_question_id`),
  UNIQUE KEY `uq_assessment_question_code` (`training_assessment_id`,`question_code`),
  UNIQUE KEY `uq_assessment_question_sequence` (`training_assessment_id`,`sequence_number`),
  CONSTRAINT `fk_assessment_question_assessment` FOREIGN KEY (`training_assessment_id`) REFERENCES `training_assessments` (`training_assessment_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_assessments
CREATE TABLE IF NOT EXISTS `training_assessments` (
  `training_assessment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_course_id` bigint(20) unsigned NOT NULL,
  `course_module_id` bigint(20) unsigned DEFAULT NULL,
  `course_lesson_id` bigint(20) unsigned DEFAULT NULL,
  `assessment_code` varchar(60) NOT NULL,
  `assessment_name` varchar(250) NOT NULL,
  `description` longtext DEFAULT NULL,
  `assessment_type` varchar(40) NOT NULL DEFAULT 'QUIZ',
  `total_marks` decimal(10,2) NOT NULL DEFAULT 100.00,
  `passing_marks` decimal(10,2) NOT NULL DEFAULT 60.00,
  `time_limit_minutes` smallint(5) unsigned DEFAULT NULL,
  `maximum_attempts` smallint(5) unsigned NOT NULL DEFAULT 3,
  `randomize_questions` tinyint(1) NOT NULL DEFAULT 0,
  `randomize_options` tinyint(1) NOT NULL DEFAULT 0,
  `show_correct_answers` tinyint(1) NOT NULL DEFAULT 0,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_assessment_id`),
  UNIQUE KEY `uq_course_assessment_code` (`training_course_id`,`assessment_code`),
  KEY `fk_training_assessment_created_by` (`created_by_user_id`),
  KEY `ix_training_assessment_module` (`course_module_id`),
  KEY `ix_training_assessment_lesson` (`course_lesson_id`),
  CONSTRAINT `fk_training_assessment_course` FOREIGN KEY (`training_course_id`) REFERENCES `training_courses` (`training_course_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_assessment_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_assessment_lesson` FOREIGN KEY (`course_lesson_id`) REFERENCES `course_lessons` (`course_lesson_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_assessment_module` FOREIGN KEY (`course_module_id`) REFERENCES `course_modules` (`course_module_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_attendance
CREATE TABLE IF NOT EXISTS `training_attendance` (
  `training_attendance_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_enrollment_id` bigint(20) unsigned NOT NULL,
  `attendance_date` date NOT NULL,
  `attendance_status` varchar(30) NOT NULL DEFAULT 'PRESENT',
  `check_in_at` datetime DEFAULT NULL,
  `check_out_at` datetime DEFAULT NULL,
  `attended_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `attendance_percentage` decimal(6,2) DEFAULT NULL,
  `marked_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_attendance_id`),
  UNIQUE KEY `uq_training_enrollment_date` (`training_enrollment_id`,`attendance_date`),
  KEY `fk_training_attendance_marked_by` (`marked_by_user_id`),
  KEY `ix_training_attendance_date` (`attendance_date`,`attendance_status`),
  CONSTRAINT `fk_training_attendance_enrollment` FOREIGN KEY (`training_enrollment_id`) REFERENCES `training_enrollments` (`training_enrollment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_attendance_marked_by` FOREIGN KEY (`marked_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_budget_transactions
CREATE TABLE IF NOT EXISTS `training_budget_transactions` (
  `budget_transaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_budget_id` bigint(20) unsigned NOT NULL,
  `transaction_date` date NOT NULL,
  `transaction_type` varchar(40) NOT NULL,
  `transaction_amount` decimal(18,2) NOT NULL,
  `balance_before` decimal(18,2) DEFAULT NULL,
  `balance_after` decimal(18,2) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `training_request_id` bigint(20) unsigned DEFAULT NULL,
  `training_session_id` bigint(20) unsigned DEFAULT NULL,
  `training_enrollment_id` bigint(20) unsigned DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`budget_transaction_id`),
  KEY `fk_budget_transaction_request` (`training_request_id`),
  KEY `fk_budget_transaction_session` (`training_session_id`),
  KEY `fk_budget_transaction_enrollment` (`training_enrollment_id`),
  KEY `fk_budget_transaction_created_by` (`created_by_user_id`),
  KEY `ix_budget_transaction_budget` (`training_budget_id`,`transaction_date`),
  KEY `ix_budget_transaction_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `fk_budget_transaction_budget` FOREIGN KEY (`training_budget_id`) REFERENCES `training_budgets` (`training_budget_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_budget_transaction_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_budget_transaction_enrollment` FOREIGN KEY (`training_enrollment_id`) REFERENCES `training_enrollments` (`training_enrollment_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_budget_transaction_request` FOREIGN KEY (`training_request_id`) REFERENCES `training_requests` (`training_request_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_budget_transaction_session` FOREIGN KEY (`training_session_id`) REFERENCES `training_sessions` (`training_session_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_budgets
CREATE TABLE IF NOT EXISTS `training_budgets` (
  `training_budget_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `budget_code` varchar(60) NOT NULL,
  `budget_name` varchar(200) NOT NULL,
  `budget_scope` varchar(30) NOT NULL DEFAULT 'COMPANY',
  `period_start_date` date NOT NULL,
  `period_end_date` date NOT NULL,
  `allocated_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `committed_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `spent_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `remaining_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `budget_status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_budget_id`),
  UNIQUE KEY `uq_company_training_budget` (`company_id`,`budget_code`),
  KEY `fk_training_budget_department` (`department_id`),
  KEY `fk_training_budget_approved_by` (`approved_by_user_id`),
  KEY `fk_training_budget_created_by` (`created_by_user_id`),
  KEY `ix_training_budget_period` (`company_id`,`period_start_date`,`period_end_date`),
  KEY `ix_training_budget_scope` (`branch_id`,`department_id`),
  CONSTRAINT `fk_training_budget_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_budget_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_budget_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_budget_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_budget_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_courses
CREATE TABLE IF NOT EXISTS `training_courses` (
  `training_course_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `training_provider_id` bigint(20) unsigned DEFAULT NULL,
  `course_code` varchar(60) NOT NULL,
  `course_name` varchar(250) NOT NULL,
  `short_description` varchar(1000) DEFAULT NULL,
  `full_description` longtext DEFAULT NULL,
  `course_category` varchar(100) DEFAULT NULL,
  `course_level` varchar(40) NOT NULL DEFAULT 'BEGINNER',
  `course_type` varchar(40) NOT NULL DEFAULT 'PROFESSIONAL',
  `delivery_mode` varchar(40) NOT NULL DEFAULT 'CLASSROOM',
  `language_code` varchar(10) NOT NULL DEFAULT 'en',
  `duration_minutes` int(10) unsigned DEFAULT NULL,
  `duration_days` decimal(8,2) DEFAULT NULL,
  `minimum_pass_score` decimal(6,2) DEFAULT NULL,
  `maximum_attempts` smallint(5) unsigned DEFAULT NULL,
  `estimated_cost` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `certificate_awarded` tinyint(1) NOT NULL DEFAULT 0,
  `certificate_validity_months` smallint(5) unsigned DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 0,
  `requires_approval` tinyint(1) NOT NULL DEFAULT 0,
  `allow_self_enrollment` tinyint(1) NOT NULL DEFAULT 1,
  `thumbnail_path` varchar(700) DEFAULT NULL,
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `course_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_course_id`),
  UNIQUE KEY `uq_company_training_course` (`company_id`,`course_code`),
  KEY `fk_training_course_created_by` (`created_by_user_id`),
  KEY `ix_training_course_provider` (`training_provider_id`),
  KEY `ix_training_course_company_status` (`company_id`,`course_status`),
  KEY `ix_training_course_delivery` (`delivery_mode`,`is_active`),
  CONSTRAINT `fk_training_course_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_course_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_course_provider` FOREIGN KEY (`training_provider_id`) REFERENCES `training_providers` (`training_provider_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_enrollments
CREATE TABLE IF NOT EXISTS `training_enrollments` (
  `training_enrollment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `training_course_id` bigint(20) unsigned NOT NULL,
  `training_session_id` bigint(20) unsigned DEFAULT NULL,
  `enrollment_number` varchar(60) NOT NULL,
  `enrollment_source` varchar(40) NOT NULL DEFAULT 'HR_ASSIGNED',
  `enrollment_status` varchar(30) NOT NULL DEFAULT 'ENROLLED',
  `enrollment_date` date NOT NULL,
  `assigned_date` date DEFAULT NULL,
  `expected_start_date` date DEFAULT NULL,
  `expected_completion_date` date DEFAULT NULL,
  `actual_start_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `progress_percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `final_score` decimal(8,2) DEFAULT NULL,
  `attendance_percentage` decimal(6,2) DEFAULT NULL,
  `result_status` varchar(30) DEFAULT NULL,
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `enrolled_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `cancelled_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_enrollment_id`),
  UNIQUE KEY `uq_company_enrollment_number` (`company_id`,`enrollment_number`),
  KEY `fk_training_enrollment_requested_by` (`requested_by_user_id`),
  KEY `fk_training_enrollment_approved_by` (`approved_by_user_id`),
  KEY `fk_training_enrollment_enrolled_by` (`enrolled_by_user_id`),
  KEY `fk_training_enrollment_cancelled_by` (`cancelled_by_user_id`),
  KEY `ix_training_enrollment_employee` (`employee_id`,`enrollment_status`),
  KEY `ix_training_enrollment_course` (`training_course_id`,`enrollment_status`),
  KEY `ix_training_enrollment_session` (`training_session_id`),
  KEY `ix_training_enrollment_completion` (`expected_completion_date`,`enrollment_status`),
  CONSTRAINT `fk_training_enrollment_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_enrollment_cancelled_by` FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_enrollment_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_enrollment_course` FOREIGN KEY (`training_course_id`) REFERENCES `training_courses` (`training_course_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_training_enrollment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_enrollment_enrolled_by` FOREIGN KEY (`enrolled_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_enrollment_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_enrollment_session` FOREIGN KEY (`training_session_id`) REFERENCES `training_sessions` (`training_session_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_feedback
CREATE TABLE IF NOT EXISTS `training_feedback` (
  `training_feedback_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_enrollment_id` bigint(20) unsigned NOT NULL,
  `course_rating` decimal(5,2) DEFAULT NULL,
  `trainer_rating` decimal(5,2) DEFAULT NULL,
  `content_rating` decimal(5,2) DEFAULT NULL,
  `facilities_rating` decimal(5,2) DEFAULT NULL,
  `overall_rating` decimal(5,2) DEFAULT NULL,
  `learning_objectives_met` tinyint(1) DEFAULT NULL,
  `recommend_to_others` tinyint(1) DEFAULT NULL,
  `most_useful_aspects` longtext DEFAULT NULL,
  `improvement_suggestions` longtext DEFAULT NULL,
  `additional_comments` longtext DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_feedback_id`),
  UNIQUE KEY `uq_training_feedback_enrollment` (`training_enrollment_id`),
  KEY `ix_training_feedback_rating` (`overall_rating`),
  CONSTRAINT `fk_training_feedback_enrollment` FOREIGN KEY (`training_enrollment_id`) REFERENCES `training_enrollments` (`training_enrollment_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_providers
CREATE TABLE IF NOT EXISTS `training_providers` (
  `training_provider_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `provider_code` varchar(50) NOT NULL,
  `provider_name` varchar(200) NOT NULL,
  `provider_type` varchar(40) NOT NULL DEFAULT 'EXTERNAL',
  `contact_person_name` varchar(150) DEFAULT NULL,
  `contact_email` varchar(150) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `address_line_1` varchar(255) DEFAULT NULL,
  `address_line_2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `tax_number` varchar(100) DEFAULT NULL,
  `provider_rating` decimal(5,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_approved` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_provider_id`),
  UNIQUE KEY `uq_company_training_provider` (`company_id`,`provider_code`),
  KEY `ix_training_provider_company` (`company_id`,`is_active`),
  CONSTRAINT `fk_training_provider_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_request_approvals
CREATE TABLE IF NOT EXISTS `training_request_approvals` (
  `training_request_approval_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_request_id` bigint(20) unsigned NOT NULL,
  `approval_level` smallint(5) unsigned NOT NULL DEFAULT 1,
  `approver_user_id` bigint(20) unsigned NOT NULL,
  `decision` varchar(30) NOT NULL DEFAULT 'PENDING',
  `comments` text DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `is_final_level` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_request_approval_id`),
  UNIQUE KEY `uq_training_request_approval` (`training_request_id`,`approval_level`,`approver_user_id`),
  KEY `ix_training_request_approval_user` (`approver_user_id`,`decision`),
  CONSTRAINT `fk_training_request_approval_request` FOREIGN KEY (`training_request_id`) REFERENCES `training_requests` (`training_request_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_request_approval_user` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_requests
CREATE TABLE IF NOT EXISTS `training_requests` (
  `training_request_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `request_number` varchar(60) NOT NULL,
  `training_course_id` bigint(20) unsigned DEFAULT NULL,
  `requested_course_name` varchar(250) DEFAULT NULL,
  `preferred_provider_name` varchar(250) DEFAULT NULL,
  `preferred_start_date` date DEFAULT NULL,
  `preferred_end_date` date DEFAULT NULL,
  `training_objective` longtext NOT NULL,
  `business_justification` longtext DEFAULT NULL,
  `estimated_cost` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `request_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `requested_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `final_decision_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `final_decision_at` datetime DEFAULT NULL,
  `final_comments` text DEFAULT NULL,
  `linked_enrollment_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_request_id`),
  UNIQUE KEY `uq_company_training_request` (`company_id`,`request_number`),
  KEY `fk_training_request_course` (`training_course_id`),
  KEY `fk_training_request_requested_by` (`requested_by_user_id`),
  KEY `fk_training_request_decision_by` (`final_decision_by_user_id`),
  KEY `fk_training_request_enrollment` (`linked_enrollment_id`),
  KEY `ix_training_request_employee` (`employee_id`,`request_status`),
  KEY `ix_training_request_company` (`company_id`,`request_status`),
  CONSTRAINT `fk_training_request_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_request_course` FOREIGN KEY (`training_course_id`) REFERENCES `training_courses` (`training_course_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_request_decision_by` FOREIGN KEY (`final_decision_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_request_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_request_enrollment` FOREIGN KEY (`linked_enrollment_id`) REFERENCES `training_enrollments` (`training_enrollment_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_request_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_session_trainers
CREATE TABLE IF NOT EXISTS `training_session_trainers` (
  `session_trainer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_session_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `external_trainer_name` varchar(200) DEFAULT NULL,
  `external_trainer_email` varchar(150) DEFAULT NULL,
  `external_trainer_phone` varchar(50) DEFAULT NULL,
  `trainer_role` varchar(50) NOT NULL DEFAULT 'TRAINER',
  `is_lead_trainer` tinyint(1) NOT NULL DEFAULT 0,
  `trainer_fee` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`session_trainer_id`),
  KEY `fk_session_trainer_employee` (`employee_id`),
  KEY `ix_session_trainer_session` (`training_session_id`),
  KEY `ix_session_trainer_user` (`user_id`),
  CONSTRAINT `fk_session_trainer_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_session_trainer_session` FOREIGN KEY (`training_session_id`) REFERENCES `training_sessions` (`training_session_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_session_trainer_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.training_sessions
CREATE TABLE IF NOT EXISTS `training_sessions` (
  `training_session_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `training_course_id` bigint(20) unsigned NOT NULL,
  `training_provider_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `session_code` varchar(60) NOT NULL,
  `session_name` varchar(250) NOT NULL,
  `session_type` varchar(40) NOT NULL DEFAULT 'SCHEDULED',
  `scheduled_start_at` datetime NOT NULL,
  `scheduled_end_at` datetime NOT NULL,
  `timezone` varchar(60) NOT NULL DEFAULT 'Asia/Karachi',
  `physical_location` varchar(500) DEFAULT NULL,
  `meeting_url` varchar(1000) DEFAULT NULL,
  `minimum_participants` smallint(5) unsigned DEFAULT NULL,
  `maximum_participants` smallint(5) unsigned DEFAULT NULL,
  `cost_per_participant` decimal(15,2) DEFAULT NULL,
  `total_session_cost` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `enrollment_deadline` datetime DEFAULT NULL,
  `session_status` varchar(30) NOT NULL DEFAULT 'PLANNED',
  `cancellation_reason` text DEFAULT NULL,
  `cancelled_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`training_session_id`),
  UNIQUE KEY `uq_company_training_session` (`company_id`,`session_code`),
  KEY `fk_training_session_provider` (`training_provider_id`),
  KEY `fk_training_session_branch` (`branch_id`),
  KEY `fk_training_session_cancelled_by` (`cancelled_by_user_id`),
  KEY `fk_training_session_created_by` (`created_by_user_id`),
  KEY `ix_training_session_course` (`training_course_id`),
  KEY `ix_training_session_schedule` (`company_id`,`scheduled_start_at`),
  KEY `ix_training_session_status` (`company_id`,`session_status`),
  CONSTRAINT `fk_training_session_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_session_cancelled_by` FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_session_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_training_session_course` FOREIGN KEY (`training_course_id`) REFERENCES `training_courses` (`training_course_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_training_session_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_training_session_provider` FOREIGN KEY (`training_provider_id`) REFERENCES `training_providers` (`training_provider_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.travel_policies
CREATE TABLE IF NOT EXISTS `travel_policies` (
  `travel_policy_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `policy_code` varchar(50) NOT NULL,
  `policy_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `domestic_daily_limit` decimal(15,2) DEFAULT NULL,
  `international_daily_limit` decimal(15,2) DEFAULT NULL,
  `hotel_daily_limit` decimal(15,2) DEFAULT NULL,
  `meal_daily_limit` decimal(15,2) DEFAULT NULL,
  `transport_daily_limit` decimal(15,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `advance_allowed` tinyint(1) NOT NULL DEFAULT 1,
  `approval_levels_required` smallint(5) unsigned NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`travel_policy_id`),
  UNIQUE KEY `uq_travel_policy_code` (`company_id`,`policy_code`),
  CONSTRAINT `fk_travel_policy_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.travel_requests
CREATE TABLE IF NOT EXISTS `travel_requests` (
  `travel_request_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `travel_policy_id` bigint(20) unsigned DEFAULT NULL,
  `request_number` varchar(60) NOT NULL,
  `travel_purpose` varchar(500) NOT NULL,
  `travel_type` varchar(30) NOT NULL DEFAULT 'DOMESTIC',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `destination_summary` varchar(500) DEFAULT NULL,
  `estimated_cost` decimal(18,2) NOT NULL DEFAULT 0.00,
  `advance_requested_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `approved_advance_amount` decimal(18,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'PKR',
  `request_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `submitted_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `final_decision_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `final_decision_at` datetime DEFAULT NULL,
  `final_comments` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`travel_request_id`),
  UNIQUE KEY `uq_travel_request_number` (`company_id`,`request_number`),
  KEY `fk_travel_request_employee` (`employee_id`),
  KEY `fk_travel_request_policy` (`travel_policy_id`),
  KEY `fk_travel_request_submitter` (`submitted_by_user_id`),
  KEY `fk_travel_request_decider` (`final_decision_by_user_id`),
  KEY `ix_travel_request_status` (`company_id`,`request_status`),
  CONSTRAINT `fk_travel_request_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_travel_request_decider` FOREIGN KEY (`final_decision_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_travel_request_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_travel_request_policy` FOREIGN KEY (`travel_policy_id`) REFERENCES `travel_policies` (`travel_policy_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_travel_request_submitter` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.user_roles
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_role_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`user_role_id`),
  UNIQUE KEY `uq_user_role_scope` (`user_id`,`role_id`,`company_id`,`branch_id`,`department_id`),
  KEY `fk_user_role_branch` (`branch_id`),
  KEY `fk_user_role_department` (`department_id`),
  KEY `ix_user_role_user` (`user_id`),
  KEY `ix_user_role_role` (`role_id`),
  KEY `ix_user_role_company` (`company_id`),
  CONSTRAINT `fk_user_role_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_role_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_role_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.user_sessions
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `session_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `refresh_token_hash` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `device_name` varchar(150) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uq_refresh_token_hash` (`refresh_token_hash`),
  KEY `ix_session_user` (`user_id`),
  KEY `ix_session_expiry` (`expires_at`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.users
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `username` varchar(80) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_platform_admin` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 1,
  `failed_login_attempts` smallint(5) unsigned NOT NULL DEFAULT 0,
  `locked_until` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `password_changed_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_user_username` (`username`),
  UNIQUE KEY `uq_user_email` (`email`),
  UNIQUE KEY `uq_user_employee` (`employee_id`),
  KEY `ix_user_company` (`company_id`),
  KEY `ix_user_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_user_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.webhook_endpoints
CREATE TABLE IF NOT EXISTS `webhook_endpoints` (
  `webhook_endpoint_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `endpoint_name` varchar(200) NOT NULL,
  `endpoint_url` varchar(1000) NOT NULL,
  `secret_hash` varchar(255) DEFAULT NULL,
  `subscribed_events` longtext NOT NULL,
  `custom_headers` longtext DEFAULT NULL,
  `timeout_seconds` smallint(5) unsigned NOT NULL DEFAULT 15,
  `maximum_retries` smallint(5) unsigned NOT NULL DEFAULT 5,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`webhook_endpoint_id`),
  KEY `fk_webhook_endpoint_user` (`created_by_user_id`),
  KEY `ix_webhook_endpoint_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_webhook_endpoint_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_webhook_endpoint_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.work_schedule_days
CREATE TABLE IF NOT EXISTS `work_schedule_days` (
  `schedule_day_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `schedule_id` bigint(20) unsigned NOT NULL,
  `day_of_week` tinyint(3) unsigned NOT NULL,
  `is_working_day` tinyint(1) NOT NULL DEFAULT 1,
  `planned_start_time` time DEFAULT NULL,
  `planned_end_time` time DEFAULT NULL,
  `break_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `expected_work_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `crosses_midnight` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`schedule_day_id`),
  UNIQUE KEY `uq_schedule_day` (`schedule_id`,`day_of_week`),
  KEY `ix_schedule_day_schedule` (`schedule_id`),
  CONSTRAINT `fk_schedule_day_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `work_schedules` (`schedule_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.work_schedules
CREATE TABLE IF NOT EXISTS `work_schedules` (
  `schedule_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `schedule_code` varchar(50) NOT NULL,
  `schedule_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `weekly_working_hours` decimal(6,2) DEFAULT NULL,
  `weekly_working_days` tinyint(3) unsigned DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`schedule_id`),
  UNIQUE KEY `uq_company_schedule_code` (`company_id`,`schedule_code`),
  KEY `ix_schedule_company` (`company_id`),
  KEY `ix_schedule_active` (`company_id`,`is_active`),
  CONSTRAINT `fk_work_schedule_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.workflow_actions
CREATE TABLE IF NOT EXISTS `workflow_actions` (
  `workflow_action_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workflow_instance_id` bigint(20) unsigned NOT NULL,
  `workflow_step_id` bigint(20) unsigned DEFAULT NULL,
  `action_type` varchar(40) NOT NULL,
  `action_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `action_at` datetime NOT NULL DEFAULT current_timestamp(),
  `comments` text DEFAULT NULL,
  `previous_status` varchar(30) DEFAULT NULL,
  `new_status` varchar(30) DEFAULT NULL,
  `payload` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`workflow_action_id`),
  KEY `fk_workflow_action_step` (`workflow_step_id`),
  KEY `fk_workflow_action_user` (`action_by_user_id`),
  KEY `ix_workflow_action_instance` (`workflow_instance_id`,`action_at`),
  CONSTRAINT `fk_workflow_action_instance` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`workflow_instance_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_workflow_action_step` FOREIGN KEY (`workflow_step_id`) REFERENCES `workflow_steps` (`workflow_step_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_workflow_action_user` FOREIGN KEY (`action_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.workflow_definitions
CREATE TABLE IF NOT EXISTS `workflow_definitions` (
  `workflow_definition_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `workflow_code` varchar(60) NOT NULL,
  `workflow_name` varchar(200) NOT NULL,
  `module_name` varchar(80) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `description` longtext DEFAULT NULL,
  `version_number` varchar(30) NOT NULL DEFAULT '1.0',
  `is_system_workflow` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`workflow_definition_id`),
  UNIQUE KEY `uq_workflow_definition` (`company_id`,`workflow_code`,`version_number`),
  KEY `fk_workflow_definition_user` (`created_by_user_id`),
  CONSTRAINT `fk_workflow_definition_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_workflow_definition_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.workflow_instances
CREATE TABLE IF NOT EXISTS `workflow_instances` (
  `workflow_instance_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `workflow_definition_id` bigint(20) unsigned NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` bigint(20) unsigned NOT NULL,
  `instance_number` varchar(60) NOT NULL,
  `current_step_id` bigint(20) unsigned DEFAULT NULL,
  `instance_status` varchar(30) NOT NULL DEFAULT 'IN_PROGRESS',
  `initiated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `initiated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `context_payload` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`workflow_instance_id`),
  UNIQUE KEY `uq_workflow_instance_number` (`company_id`,`instance_number`),
  KEY `fk_workflow_instance_definition` (`workflow_definition_id`),
  KEY `fk_workflow_instance_step` (`current_step_id`),
  KEY `fk_workflow_instance_user` (`initiated_by_user_id`),
  KEY `ix_workflow_instance_entity` (`entity_type`,`entity_id`),
  KEY `ix_workflow_instance_status` (`company_id`,`instance_status`),
  CONSTRAINT `fk_workflow_instance_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_workflow_instance_definition` FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions` (`workflow_definition_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_workflow_instance_step` FOREIGN KEY (`current_step_id`) REFERENCES `workflow_steps` (`workflow_step_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_workflow_instance_user` FOREIGN KEY (`initiated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.workflow_steps
CREATE TABLE IF NOT EXISTS `workflow_steps` (
  `workflow_step_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workflow_definition_id` bigint(20) unsigned NOT NULL,
  `step_code` varchar(60) NOT NULL,
  `step_name` varchar(200) NOT NULL,
  `step_type` varchar(40) NOT NULL DEFAULT 'APPROVAL',
  `sequence_number` smallint(5) unsigned NOT NULL,
  `approval_mode` varchar(30) NOT NULL DEFAULT 'ANY',
  `minimum_approvals` smallint(5) unsigned NOT NULL DEFAULT 1,
  `timeout_hours` int(10) unsigned DEFAULT NULL,
  `escalation_role_id` bigint(20) unsigned DEFAULT NULL,
  `condition_expression` longtext DEFAULT NULL,
  `is_final_step` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`workflow_step_id`),
  UNIQUE KEY `uq_workflow_step_code` (`workflow_definition_id`,`step_code`),
  UNIQUE KEY `uq_workflow_step_sequence` (`workflow_definition_id`,`sequence_number`),
  KEY `fk_workflow_step_role` (`escalation_role_id`),
  CONSTRAINT `fk_workflow_step_definition` FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions` (`workflow_definition_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_workflow_step_role` FOREIGN KEY (`escalation_role_id`) REFERENCES `roles` (`role_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hr_management.workforce_plans
CREATE TABLE IF NOT EXISTS `workforce_plans` (
  `workforce_plan_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `plan_code` varchar(60) NOT NULL,
  `plan_name` varchar(200) NOT NULL,
  `planning_year` smallint(5) unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `plan_status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `prepared_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`workforce_plan_id`),
  UNIQUE KEY `uq_workforce_plan_code` (`company_id`,`plan_code`),
  KEY `fk_workforce_plan_preparer` (`prepared_by_user_id`),
  KEY `fk_workforce_plan_approver` (`approved_by_user_id`),
  CONSTRAINT `fk_workforce_plan_approver` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_workforce_plan_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_workforce_plan_preparer` FOREIGN KEY (`prepared_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `company_current_subscription_details`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `company_current_subscription_details` AS SELECT
    cs.subscription_id,
    cs.company_id,
    cs.plan_id,

    sp.plan_code,
    sp.plan_name,

    cs.subscription_status,
    cs.billing_cycle,
    cs.trial_start_date,
    cs.trial_end_date,
    cs.subscription_start_date,
    cs.subscription_end_date,
    cs.next_billing_date,
    cs.agreed_price,
    cs.currency_code,
    cs.auto_renew,
    cs.is_current,

    cs.employee_limit_override,
    cs.branch_limit_override,
    cs.user_limit_override,
    cs.storage_limit_mb_override,

    COALESCE(
        cs.employee_limit_override,
        sp.maximum_employees
    ) AS effective_employee_limit,

    COALESCE(
        cs.branch_limit_override,
        sp.maximum_branches
    ) AS effective_branch_limit,

    COALESCE(
        cs.user_limit_override,
        sp.maximum_users
    ) AS effective_user_limit,

    COALESCE(
        cs.storage_limit_mb_override,
        sp.storage_limit_mb
    ) AS effective_storage_limit_mb,

    sp.monthly_price,
    sp.annual_price,
    sp.trial_days,
    sp.is_active AS plan_is_active,

    cs.created_at,
    cs.updated_at

FROM company_subscriptions AS cs

INNER JOIN subscription_plans AS sp
    ON sp.plan_id = cs.plan_id

WHERE cs.is_current = 1 
;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
