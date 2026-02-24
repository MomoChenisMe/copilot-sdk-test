## ADDED Requirements

### Requirement: OpenSpec metadata database table

The backend SHALL create an `openspec_metadata` SQLite table to store structured metadata for OpenSpec specs, changes, and archived items.

#### Scenario: Table schema

- **WHEN** the application starts and initializes the database
- **THEN** the `openspec_metadata` table MUST be created with the following columns:
  - `id` INTEGER PRIMARY KEY AUTOINCREMENT
  - `name` TEXT NOT NULL — the spec/change/archived item name
  - `type` TEXT NOT NULL CHECK(type IN ('change','spec','archived')) — the item type
  - `cwd` TEXT NOT NULL — the working directory path
  - `created_by` TEXT — who created the item (defaults to 'user' for single-user system)
  - `created_at` TEXT NOT NULL DEFAULT (datetime('now')) — ISO 8601 creation timestamp
  - `updated_at` TEXT — ISO 8601 last update timestamp
  - `archived_at` TEXT — ISO 8601 archive timestamp (only for type='archived')
  - UNIQUE(name, type, cwd) — composite unique constraint

#### Scenario: Table creation is idempotent

- **WHEN** the database is initialized multiple times
- **THEN** the CREATE TABLE statement MUST use IF NOT EXISTS
- **AND** no data MUST be lost on subsequent initializations

### Requirement: Metadata recording on change creation

The OpenSpec service SHALL record metadata when a new change is created (detected via file system).

#### Scenario: New change detected

- **WHEN** a new change directory appears in `openspec/changes/`
- **AND** the overview API is called
- **THEN** the service MUST upsert a record with `type='change'`, `name=<change-name>`, `cwd=<resolved-path>`
- **AND** `created_at` MUST be set to the current timestamp if the record is new

#### Scenario: Existing change already recorded

- **WHEN** the metadata record for a change already exists
- **THEN** the service MUST NOT overwrite the existing `created_at` value

### Requirement: Metadata recording on archive

The OpenSpec service SHALL update metadata when a change is archived.

#### Scenario: Change archived successfully

- **WHEN** `POST /api/openspec/changes/:name/archive` completes successfully
- **THEN** the service MUST update the existing change record's `type` from `'change'` to `'archived'`
- **AND** `archived_at` MUST be set to the current timestamp
- **AND** the `name` MUST be updated to the new archive name (with date prefix)

#### Scenario: Archive metadata reflects in API response

- **WHEN** `GET /api/openspec/archived` is called
- **THEN** each archived item MUST include `archivedAt` from the database if available
- **AND** items without database records MUST still appear (fallback to file system data)

### Requirement: Metadata recording on deletion

The OpenSpec service SHALL remove metadata when a change or spec is deleted.

#### Scenario: Change deleted

- **WHEN** `DELETE /api/openspec/changes/:name` completes successfully
- **THEN** the corresponding metadata record MUST be deleted from the database

#### Scenario: OpenSpec folder deleted

- **WHEN** `DELETE /api/openspec/delete` completes successfully (entire folder)
- **THEN** all metadata records matching the CWD MUST be deleted

### Requirement: Metadata in API responses

OpenSpec API endpoints SHALL include metadata fields in their responses when available.

#### Scenario: Overview endpoint includes metadata

- **WHEN** `GET /api/openspec/overview` is called
- **THEN** the response MUST include a `metadata` object with counts and latest timestamps

#### Scenario: Changes list includes metadata

- **WHEN** `GET /api/openspec/changes` is called
- **THEN** each change item MUST include `createdAt` and `createdBy` fields if metadata exists
- **AND** items without metadata MUST still appear with null values for these fields

#### Scenario: Archived list includes metadata

- **WHEN** `GET /api/openspec/archived` is called
- **THEN** each archived item MUST include `archivedAt` from database metadata
- **AND** `createdBy` and `createdAt` MUST also be included if available

### Requirement: Spec metadata sync on overview

The OpenSpec service SHALL sync metadata for existing specs when the overview API is called.

#### Scenario: New spec detected without metadata

- **WHEN** a spec exists in `openspec/specs/` but has no corresponding metadata record
- **THEN** the service MUST create a metadata record with `type='spec'` and current timestamp as `created_at`

#### Scenario: Deleted spec has stale metadata

- **WHEN** a metadata record exists for a spec that no longer exists on the file system
- **THEN** the service MUST delete the stale metadata record during sync
