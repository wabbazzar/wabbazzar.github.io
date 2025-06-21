# Todo Prompt Generator - Master Autonomous Development Guide

## Purpose
This document provides the exact instructions needed to transform any application specification (spec.md) into a comprehensive, autonomous development plan (todo.md) that enables an AI agent to build fully functional applications without human intervention.

## Core Principles of Autonomous Development

### 1. Visual Verification First
**Never trust console logs alone.** Every feature must be visually verifiable through automated DOM inspection and visual state comparison.

### 2. Incremental Visual Testing
Build visual test harnesses BEFORE implementing features. Each phase must have visual verification that confirms the feature works in the browser, not just in logic.

### 3. Consistent Implementation Patterns
Establish single methods for common operations (e.g., one method for all cell updates) to prevent inconsistency bugs.

### 4. Browser Cache Awareness
Always include cache-busting headers and version numbers. Many "bugs" are just cached old versions.

## Structure of Generated Todo.md

### Phase 0: Environment & Visual Test Infrastructure
**ALWAYS START HERE - NO EXCEPTIONS**

1. **Project Setup**
   - Directory structure
   - Makefile with whitelisted commands
   - Cache-busting HTML template

2. **Visual Test Harness**
   - DOM state capture tools
   - Visual diff comparison
   - Automated screenshot simulation
   - Test result visualization

3. **Render Pipeline Verification**
   - Cell/element render testing
   - Style application verification
   - DOM update monitoring
   - Browser repaint forcing

### Phase 1-N: Feature Implementation
For each feature phase:

1. **Visual Test First**
   - Write the visual verification test
   - Define expected visual states
   - Create comparison metrics

2. **Implementation with Verification**
   - Implement feature
   - Run visual test immediately
   - Debug with visual tools if test fails

3. **Integration Testing**
   - Verify feature works with existing features
   - Check for visual regressions
   - Performance verification

## Makefile Commands (Auto-Whitelisted)

```makefile
.PHONY: serve test visual-test verify-render clean-cache debug-render auto-test

# Core development server
serve:
	@python3 -m http.server 8000 --bind localhost || python -m SimpleHTTPServer 8000

# Visual testing infrastructure
visual-test:
	@open http://localhost:8000/visual_test.html || xdg-open http://localhost:8000/visual_test.html

# Render verification
verify-render:
	@open http://localhost:8000/render_verify.html

# Cache management
clean-cache:
	@echo "Browser cache clear: Ctrl+Shift+R (Win) or Cmd+Shift+R (Mac)"

# Debug render pipeline
debug-render:
	@open http://localhost:8000/debug_render.html

# Automated test suite
auto-test:
	@node test_runner.js || python test_runner.py
```

## Rules for Autonomous Agent Behavior

### RULE 1: Visual Verification Mandate
```
Every implementation step MUST include visual verification.
If a feature cannot be visually verified, create a visual test that makes it verifiable.
Never proceed to the next step without visual confirmation.
```

### RULE 2: Test Infrastructure First
```
ALWAYS create visual test infrastructure before implementing any feature.
The test harness must be able to:
- Capture DOM state
- Compare visual states
- Report differences
- Force browser repaints
```

### RULE 3: Consistent Method Usage
```
For any repeated operation (e.g., updating cells, moving pieces):
- Create ONE method that handles ALL cases
- Never create multiple methods that do similar things
- Document the single method clearly
```

### RULE 4: Browser Cache Management
```
Every HTML file MUST include:
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">

Add version numbers or timestamps to detect cache issues.
```

### RULE 5: Debugging Protocol
```
When visual behavior doesn't match expected:
1. Check browser console for errors
2. Verify DOM elements exist and are visible
3. Check computed styles vs applied styles
4. Force repaint with element.offsetHeight
5. Compare method consistency (draw vs clear)
6. Create minimal reproduction test
```

### RULE 6: Progress Verification
```
After each implementation phase:
1. Run visual tests
2. Manually inspect in browser
3. Check for performance issues
4. Verify no console errors
5. Document any deviations
```

## Template for Generated Todo.md

```markdown
# [Project Name] Development Plan - Fully Autonomous Implementation

## Critical Success Factors
[Extract from spec.md and add:]
- Visual verification at every step
- Consistent method usage throughout
- Cache-busting during development
- Automated visual testing infrastructure

## Phase 0: Environment Setup & Verification Tools
[Always include visual test harness setup]

## Phase 1-N: [Feature Phases from spec.md]
[For each phase include:]
- Visual test definition
- Implementation steps
- Verification checklist
- Common pitfalls

## Debugging Procedures
[Include render debugging steps]

## Success Criteria
[Visual and functional criteria]
```

## Extracting Information from Spec.md

### 1. Identify Core Features
- List all mentioned features
- Group into logical phases
- Order by dependencies

### 2. Extract Visual Requirements
- Colors, themes, aesthetics
- Animation requirements
- UI element descriptions

### 3. Define Testable Outcomes
- Convert each feature to visual test
- Create measurable success criteria
- Plan verification methods

### 4. Anticipate Common Issues
Based on application type:
- **Games**: Movement rendering, animation smoothness
- **Forms**: Input validation, state updates
- **Dashboards**: Data refresh, chart updates
- **Editors**: Content synchronization, cursor management

## Special Considerations by App Type

### Game Applications
- Piece/sprite movement verification
- Collision detection visualization
- Score/status update testing
- Animation frame monitoring

### CRUD Applications
- Form state visualization
- Data table updates
- Modal/popup rendering
- Navigation state changes

### Real-time Applications
- WebSocket message visualization
- State synchronization testing
- Latency impact on visuals
- Connection status indicators

## Output Format

The generated todo.md should be:
1. **Self-contained**: No external references needed
2. **Sequentially executable**: Each step builds on previous
3. **Visually verifiable**: Every step has visual confirmation
4. **Debug-friendly**: Includes troubleshooting for common issues
5. **Performance-aware**: Includes FPS and render checks

## Example Transformation

### Input (spec.md excerpt):
```
Build a Tic-Tac-Toe game with:
- 3x3 grid
- X and O markers
- Win detection
- Score tracking
```

### Output (todo.md excerpt):
```
## Phase 0: Visual Test Infrastructure
- Create visual_test.html with 3x3 grid simulator
- Test cell click → visual marker appears
- Test win condition → visual highlight
- Verify score updates visually

## Phase 1: Game Board
Visual Test First:
- Empty grid renders with 9 cells
- Click cell → X appears visually
- Click another → O appears visually
- Verify alternating turns visually
```

## Final Checklist for Generated Todo.md

- [ ] Starts with visual test infrastructure
- [ ] Every feature has visual verification
- [ ] Includes cache-busting setup
- [ ] Has consistent method patterns
- [ ] Includes debug procedures
- [ ] Makefile commands are clear
- [ ] Success criteria are measurable
- [ ] Common pitfalls are addressed
- [ ] Performance checks included
- [ ] Self-contained implementation

## Agent Behavior Rules (Inject into Every Conversation)

```yaml
autonomous_development_rules:
  1_visual_first: "Always create visual tests before implementing features"
  2_verify_everything: "Never trust console logs - verify visually in DOM"
  3_consistent_methods: "One method per operation type - no variations"
  4_cache_awareness: "Include cache-busting in every HTML file"
  5_incremental_testing: "Test after every small change"
  6_debug_protocol: "Follow systematic debugging when visuals don't match"
  7_no_assumptions: "Verify every visual change explicitly"
  8_performance_monitoring: "Check FPS and render performance"
  9_clean_code: "Remove test files after completion"
  10_documentation: "Document any deviations from plan"

makefile_whitelist:
  - make serve
  - make visual-test
  - make verify-render
  - make clean-cache
  - make debug-render
  - make auto-test

automatic_behaviors:
  - Create visual test harness first
  - Add cache-busting headers to all HTML
  - Force repaints after style changes
  - Capture visual state before/after changes
  - Compare snapshots for verification
  - Use single update methods consistently
```

## Usage Instructions

1. **Read the spec.md thoroughly**
2. **Identify all visual elements and behaviors**
3. **Create phased implementation plan**
4. **For each phase, create visual test first**
5. **Include debugging procedures**
6. **Add performance verification**
7. **Generate comprehensive todo.md**

The resulting todo.md should enable fully autonomous development where the agent can build, test, and verify the entire application without human intervention. 