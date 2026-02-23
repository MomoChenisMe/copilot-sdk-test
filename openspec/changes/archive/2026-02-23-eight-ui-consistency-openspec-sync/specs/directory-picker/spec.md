## ADDED Requirements

### Requirement: DirectoryPicker header path SHALL use shortenPath for display

The DirectoryPicker overlay's header path display MUST apply the `shortenPath()` utility function (exported from `CwdSelector.tsx`) to the `browsePath` before rendering, instead of displaying the raw full path with only CSS truncation. The `truncate` CSS class MUST be retained as a fallback safety net, but `shortenPath()` MUST be the primary mechanism for keeping the path readable.

#### Scenario: Long path is intelligently shortened in DirectoryPicker header

- **WHEN** the DirectoryPicker overlay is open
- **AND** the current browse path is `/Users/momochenisme/Documents/GitHub/copilot-sdk-test`
- **THEN** the header MUST display `~/…/GitHub/copilot-sdk-test` (using `shortenPath()` output)
- **AND** the header MUST NOT display the raw truncated path like `/Users/momochenisme/Documents/GitHub/c...`

#### Scenario: Short path is displayed as-is

- **WHEN** the DirectoryPicker overlay is open
- **AND** the current browse path is `/Users/momochenisme`
- **THEN** the header MUST display `~` (shortenPath replaces home dir with ~)
- **AND** no ellipsis shortening is applied since the path has ≤2 segments

#### Scenario: Root path is displayed correctly

- **WHEN** the DirectoryPicker overlay is open
- **AND** the current browse path is `/`
- **THEN** the header MUST display `/`

#### Scenario: CSS truncate class is retained as fallback

- **WHEN** the DirectoryPicker header path span is rendered
- **THEN** the span MUST still have the `truncate` CSS class
- **AND** `shortenPath()` MUST be applied to the text content before rendering
