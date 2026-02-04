#!/bin/bash
# Script to add all Serena MCP tool permissions to Claude Code settings

SETTINGS_FILE="/Users/j/repos/beak-gaming-platform/.claude/settings.local.json"

# All Serena tools (from the Serena API's active_tools list)
SERENA_TOOLS=(
  "mcp__plugin_serena_serena__activate_project"
  "mcp__plugin_serena_serena__check_onboarding_performed"
  "mcp__plugin_serena_serena__create_text_file"
  "mcp__plugin_serena_serena__delete_memory"
  "mcp__plugin_serena_serena__edit_memory"
  "mcp__plugin_serena_serena__execute_shell_command"
  "mcp__plugin_serena_serena__find_file"
  "mcp__plugin_serena_serena__find_referencing_symbols"
  "mcp__plugin_serena_serena__find_symbol"
  "mcp__plugin_serena_serena__get_current_config"
  "mcp__plugin_serena_serena__get_symbols_overview"
  "mcp__plugin_serena_serena__initial_instructions"
  "mcp__plugin_serena_serena__insert_after_symbol"
  "mcp__plugin_serena_serena__insert_before_symbol"
  "mcp__plugin_serena_serena__list_dir"
  "mcp__plugin_serena_serena__list_memories"
  "mcp__plugin_serena_serena__onboarding"
  "mcp__plugin_serena_serena__prepare_for_new_conversation"
  "mcp__plugin_serena_serena__read_file"
  "mcp__plugin_serena_serena__read_memory"
  "mcp__plugin_serena_serena__rename_symbol"
  "mcp__plugin_serena_serena__replace_content"
  "mcp__plugin_serena_serena__replace_symbol_body"
  "mcp__plugin_serena_serena__search_for_pattern"
  "mcp__plugin_serena_serena__switch_modes"
  "mcp__plugin_serena_serena__think_about_collected_information"
  "mcp__plugin_serena_serena__think_about_task_adherence"
  "mcp__plugin_serena_serena__think_about_whether_you_are_done"
  "mcp__plugin_serena_serena__write_memory"
)

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed. Install with: brew install jq"
  exit 1
fi

# Backup original file
cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
echo "Backed up settings to ${SETTINGS_FILE}.backup"

# Read current allow list and add Serena tools
CURRENT_ALLOW=$(jq -r '.permissions.allow // []' "$SETTINGS_FILE")

# Build new allow array with Serena tools added
NEW_ALLOW=$(echo "$CURRENT_ALLOW" | jq '. + $tools | unique | sort' --argjson tools "$(printf '%s\n' "${SERENA_TOOLS[@]}" | jq -R . | jq -s .)")

# Update the settings file
jq --argjson newAllow "$NEW_ALLOW" '.permissions.allow = $newAllow' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"

echo "Added ${#SERENA_TOOLS[@]} Serena permissions to $SETTINGS_FILE"
echo ""
echo "Serena tools added:"
printf '  - %s\n' "${SERENA_TOOLS[@]}"
echo ""
echo "Restart Claude Code for changes to take effect."
