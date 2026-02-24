## ADDED Requirements

### Requirement: Tab double-click rename

TabBar SHALL support double-click on a tab title to enter inline editing mode for renaming.

#### Scenario: Enter rename mode via double-click

- **WHEN** user double-clicks on a tab's title text
- **THEN** the title span MUST be replaced by an `<input>` element
- **AND** the input MUST be pre-filled with the current tab title
- **AND** the input text MUST be fully selected
- **AND** the input MUST receive focus immediately

#### Scenario: Confirm rename via Enter key

- **WHEN** user is in rename mode and presses Enter
- **THEN** the tab's `customTitle` MUST be updated in the store
- **AND** the input MUST be replaced by the title span showing the new name
- **AND** the custom title MUST be persisted to localStorage and backend

#### Scenario: Cancel rename via Escape key

- **WHEN** user is in rename mode and presses Escape
- **THEN** the input MUST be replaced by the title span showing the original name
- **AND** no store update MUST occur

#### Scenario: Confirm rename on blur

- **WHEN** user is in rename mode and the input loses focus
- **THEN** the rename MUST be confirmed (same as Enter behavior)

#### Scenario: Empty input reverts to default title

- **WHEN** user clears the input and confirms (Enter or blur)
- **THEN** `customTitle` MUST be set to `undefined` (cleared)
- **AND** the tab MUST display the default conversation title

#### Scenario: Rename does not interfere with drag

- **WHEN** user initiates a pointer-down followed by pointer-move (drag threshold exceeded)
- **THEN** rename mode MUST NOT be triggered
- **AND** the drag operation MUST proceed normally

### Requirement: Tab color selection via context menu

TabBar context menu SHALL include a "Set Color" option that allows users to pick a background tint color from a preset palette.

#### Scenario: Context menu shows color option

- **WHEN** user right-clicks on a tab
- **THEN** the context menu MUST include a "Set Color" item with a palette icon
- **AND** clicking the item MUST expand a color picker sub-section within the menu

#### Scenario: Color palette display

- **WHEN** user clicks "Set Color" in the context menu
- **THEN** a row of 8 color swatches MUST be displayed (red, orange, yellow, green, teal, blue, purple, pink)
- **AND** a "Clear" option MUST be provided to remove the color

#### Scenario: Select a color

- **WHEN** user clicks a color swatch (e.g., blue)
- **THEN** the tab's `color` MUST be updated in the store to `'blue'`
- **AND** the context menu MUST close
- **AND** the color MUST be persisted to localStorage and backend

#### Scenario: Clear color

- **WHEN** user clicks the "Clear" option in the color picker
- **THEN** the tab's `color` MUST be set to `undefined`
- **AND** the tab MUST revert to default styling

### Requirement: Tab background tint based on color

TabBar tabs with a color set SHALL display a light background tint of the selected color.

#### Scenario: Active tab with color

- **WHEN** a tab has `color: 'blue'` and is the active tab
- **THEN** the tab background MUST use `rgba` of the color at approximately 10% opacity
- **AND** the text color MUST remain readable (use color at higher opacity or accent)

#### Scenario: Inactive tab with color on hover

- **WHEN** a tab has `color: 'blue'` and is not active
- **AND** user hovers over the tab
- **THEN** the tab background MUST use `rgba` of the color at approximately 5% opacity

#### Scenario: Inactive tab with color at rest

- **WHEN** a tab has `color: 'blue'` and is not active and not hovered
- **THEN** the tab MUST display the color at very low opacity (approximately 3%) or no tint

#### Scenario: Tab without color remains default

- **WHEN** a tab has no `color` set
- **THEN** the tab MUST use the default styling (accent-soft for active, bg-tertiary on hover)

### Requirement: Tab customization store state

Zustand store TabState SHALL include `customTitle` and `color` fields, with corresponding setter actions.

#### Scenario: Store state shape

- **WHEN** a new tab is created
- **THEN** `TabState` MUST include optional fields `customTitle?: string` and `color?: string`
- **AND** both MUST default to `undefined`

#### Scenario: setTabCustomTitle action

- **WHEN** `setTabCustomTitle(tabId, 'My Tab')` is called
- **THEN** `tabs[tabId].customTitle` MUST be set to `'My Tab'`
- **AND** the tab title display MUST prefer `customTitle` over the default conversation title

#### Scenario: setTabColor action

- **WHEN** `setTabColor(tabId, 'purple')` is called
- **THEN** `tabs[tabId].color` MUST be set to `'purple'`
- **AND** the change MUST be persisted via existing tab state persistence mechanism

### Requirement: Tab customization i18n keys

Translation files SHALL include keys for tab customization UI elements.

#### Scenario: i18n key completeness

- **WHEN** TabBar context menu and rename UI are rendered
- **THEN** translation files MUST include:
  - `tabBar.rename` — en: "Rename" / zh-TW: "重新命名"
  - `tabBar.setColor` — en: "Set Color" / zh-TW: "設定顏色"
  - `tabBar.clearColor` — en: "Clear" / zh-TW: "清除"
