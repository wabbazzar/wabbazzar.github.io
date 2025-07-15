# Todo Prompt Generator - Master Autonomous Cross-Platform Development Guide

## Purpose
This document provides the exact instructions needed to transform any application specification (spec.md) into a comprehensive, autonomous development plan (todo.md) that enables an AI agent to build fully functional web applications that work seamlessly across both desktop and mobile platforms without human intervention.

## Core Principles of Autonomous Cross-Platform Development

### 1. Visual Verification First
**Never trust console logs alone.** Every feature must be visually verifiable through automated DOM inspection and visual state comparison on both desktop and mobile viewports.

### 2. Mobile-First Progressive Enhancement
Build mobile experience first, then enhance for desktop. Every feature must work on touch devices before adding desktop-specific enhancements.

### 3. Cross-Platform Visual Testing
Build visual test harnesses that work across desktop browsers, mobile browsers, and device simulators. Each phase must have visual verification for both platforms.

### 4. Consistent Implementation Patterns
Establish single methods that handle both desktop and mobile interactions (e.g., one method for all input events whether keyboard, mouse, or touch).

### 5. Performance Across Devices
Optimize for 60 FPS on both desktop and mobile. Mobile performance requirements are stricter and drive overall optimization.

### 6. Browser Cache Awareness
Always include cache-busting headers and version numbers. Test on both desktop and mobile browsers for cache consistency.

## Structure of Generated Todo.md

### Phase 0: Cross-Platform Environment & Visual Test Infrastructure
**ALWAYS START HERE - NO EXCEPTIONS**

1. **Project Setup**
   - Directory structure
   - Makefile with cross-platform commands
   - Cache-busting HTML template with mobile viewport configuration
   - Mobile-first responsive CSS foundation

2. **Visual Test Harness**
   - Desktop and mobile viewport testing tools
   - Touch event simulation and testing
   - Gesture recognition testing infrastructure
   - Cross-device DOM state capture
   - Visual diff comparison for multiple screen sizes
   - Automated screenshot simulation for various devices

3. **Render Pipeline Verification**
   - Cell/element render testing across viewports
   - Touch-friendly sizing validation (44px minimum targets)
   - Mobile and desktop style application verification
   - Performance monitoring for both platforms
   - Browser repaint forcing for mobile and desktop

### Phase 1-N: Feature Implementation (Mobile-First)
For each feature phase:

1. **Mobile Visual Test First**
   - Write touch-based visual verification tests
   - Define expected mobile visual states
   - Create responsive design comparison metrics
   - Test gesture recognition and feedback

2. **Mobile Implementation with Desktop Enhancement**
   - Implement mobile-first feature with touch controls
   - Add desktop keyboard/mouse enhancements
   - Ensure single codebase handles both interaction methods
   - Run visual tests on both platforms immediately

3. **Cross-Platform Integration Testing**
   - Verify feature works on mobile and desktop
   - Check for visual regressions across viewports
   - Test performance on mobile and desktop browsers
   - Validate accessibility on both platforms

## Makefile Commands (Auto-Whitelisted for Cross-Platform)

```makefile
.PHONY: serve test visual-test mobile-test device-test verify-render clean-cache debug-render auto-test

# Core development server (mobile-ready)
serve:
	@python3 -m http.server 8000 --bind 0.0.0.0 || python -m SimpleHTTPServer 8000

# Cross-platform visual testing
visual-test:
	@open http://localhost:8000/visual_test.html || xdg-open http://localhost:8000/visual_test.html

# Mobile-specific testing
mobile-test:
	@open http://localhost:8000/mobile_test.html || xdg-open http://localhost:8000/mobile_test.html

# Touch event testing
touch-test:
	@open http://localhost:8000/touch_test.html || xdg-open http://localhost:8000/touch_test.html

# Device testing information
device-test:
	@echo "Connect mobile device and navigate to: http://[your-ip]:8000/"
	@ifconfig | grep "inet " | grep -v 127.0.0.1 || ipconfig

# Render verification across platforms
verify-render:
	@open http://localhost:8000/render_verify.html

# Cache management for all platforms
clean-cache:
	@echo "Desktop: Ctrl+Shift+R (Win/Linux) or Cmd+Shift+R (Mac)"
	@echo "Mobile Safari: Settings > Safari > Clear History and Website Data"
	@echo "Chrome Mobile: Menu > History > Clear browsing data"

# Debug render pipeline
debug-render:
	@open http://localhost:8000/debug_render.html

# Automated cross-platform test suite
auto-test:
	@node test_runner.js || python test_runner.py

# PWA testing
pwa-test:
	@open http://localhost:8000/pwa_test.html
```

## Rules for Autonomous Cross-Platform Agent Behavior

### RULE 1: Mobile-First Visual Verification Mandate
```
Every implementation step MUST include visual verification on mobile first, then desktop.
Touch interactions must be tested before keyboard/mouse interactions.
Never proceed without confirming mobile visual functionality.
```

### RULE 2: Cross-Platform Test Infrastructure First
```
ALWAYS create mobile and desktop visual test infrastructure before implementing features.
The test harness must handle:
- Mobile viewport simulation (320px-428px)
- Touch event simulation and gesture recognition
- Desktop viewport testing (1024px+)
- Cross-browser compatibility (Safari Mobile, Chrome Mobile, Desktop browsers)
- Performance monitoring across devices
```

### RULE 3: Unified Method Architecture
```
For any user interaction (input, navigation, updates):
- Create ONE method that handles touch, mouse, and keyboard
- Use event detection to determine input type
- Ensure consistent behavior across platforms
- Document the unified method clearly
```

### RULE 4: Mobile-First Browser Cache Management
```
Every HTML file MUST include mobile-optimized cache control:
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">

Test cache behavior on both desktop and mobile browsers.
```

### RULE 5: Cross-Platform Debugging Protocol
```
When visual behavior doesn't match expected:
1. Test on mobile browser dev tools first
2. Check touch event handling vs mouse events
3. Verify responsive design breakpoints
4. Test gesture recognition thresholds
5. Check computed styles on mobile vs desktop
6. Force repaint on both platforms
7. Create minimal reproduction for both platforms
```

### RULE 6: Performance-First Progress Verification
```
After each implementation phase:
1. Test 60 FPS on mobile devices
2. Verify touch responsiveness (<50ms)
3. Check desktop performance improvements
4. Test memory usage on both platforms
5. Validate accessibility on mobile and desktop
6. Document platform-specific optimizations
```

## Cross-Platform Implementation Phases

### Phase 0: Mobile-First Environment Setup
- Mobile viewport configuration and testing
- Touch event handling infrastructure
- Responsive design foundation (CSS Grid/Flexbox)
- PWA manifest and service worker setup
- Mobile performance monitoring tools
- Cross-device cache-busting system

### Phase 1: Core Mobile Experience
- Touch-first interaction design
- Gesture recognition implementation
- Mobile-friendly UI sizing (44px+ touch targets)
- Responsive layout for 320px-428px screens
- Performance optimization for mobile browsers
- Visual feedback for touch interactions

### Phase 2: Desktop Enhancement
- Keyboard shortcuts and controls
- Mouse interaction improvements
- Desktop-specific UI enhancements
- Larger screen layout optimizations
- Desktop performance features
- Desktop accessibility enhancements

### Phase 3: PWA & Cross-Platform Features
- Progressive Web App implementation
- Offline functionality
- App installation capability
- Cross-platform state persistence
- Push notifications (where appropriate)
- Native integration features

### Phase 4: Performance & Polish
- 60 FPS optimization across all devices
- Memory usage optimization
- Battery usage optimization for mobile
- Smooth animations and transitions
- Cross-browser compatibility testing
- Accessibility compliance validation

## Template for Generated Todo.md

```markdown
# [Project Name] Cross-Platform Development Plan - Fully Autonomous Implementation

## Critical Success Factors
[Extract from spec.md and add:]
- Mobile-first visual verification at every step
- Touch-first interaction design with desktop enhancement
- Unified method architecture for all user interactions
- Cross-platform performance optimization (60 FPS mobile/desktop)
- PWA functionality for app-like experience
- Comprehensive accessibility across platforms
- Cache-busting for mobile and desktop browsers

## Phase 0: Cross-Platform Environment Setup & Verification Tools
[Always include mobile-first test harness with desktop enhancement]

## Phase 1: Mobile-First Core Experience
[Mobile implementation with touch controls as primary]

## Phase 2: Desktop Enhancement & Keyboard Controls
[Desktop-specific enhancements while maintaining mobile functionality]

## Phase 3: PWA & Cross-Platform Integration
[Progressive Web App features and cross-platform capabilities]

## Phase 4-N: [Additional Feature Phases from spec.md]
[Each phase includes mobile-first implementation with desktop enhancement]

## Cross-Platform Debugging Procedures
[Include mobile and desktop debugging steps]

## Cross-Platform Success Criteria
[Visual, functional, and performance criteria for all platforms]
```

## Extracting Cross-Platform Information from Spec.md

### 1. Identify Platform-Agnostic Core Features
- List all mentioned features
- Determine which work better on mobile vs desktop
- Group into mobile-first implementation phases
- Order by cross-platform dependencies

### 2. Extract Mobile-Specific Requirements
- Touch interaction patterns
- Gesture requirements
- Mobile viewport considerations
- Performance constraints for mobile devices
- PWA features and offline functionality

### 3. Extract Desktop Enhancement Opportunities
- Keyboard shortcuts and hotkeys
- Mouse interaction improvements
- Larger screen real estate utilization
- Desktop-specific performance features
- Advanced functionality better suited for desktop

### 4. Define Cross-Platform Testable Outcomes
- Convert each feature to mobile and desktop visual tests
- Create responsive design success criteria
- Plan cross-device verification methods
- Define performance benchmarks for both platforms

### 5. Anticipate Cross-Platform Issues
Based on application type:
- **Games**: Touch controls vs keyboard, mobile performance, haptic feedback
- **Forms**: Touch-friendly inputs, mobile keyboards, desktop validation
- **Dashboards**: Touch navigation vs mouse, mobile data visualization
- **Editors**: Touch text editing, mobile selection, desktop shortcuts

## Special Considerations by App Type

### Game Applications (Cross-Platform)
- **Mobile**: Touch controls, gesture recognition, haptic feedback, portrait layout
- **Desktop**: Keyboard shortcuts, mouse precision, larger displays, higher performance
- **Unified**: Single game loop, consistent visual feedback, cross-platform scoring

### CRUD Applications (Cross-Platform)
- **Mobile**: Touch-friendly forms, mobile keyboards, swipe gestures, compact layouts
- **Desktop**: Keyboard navigation, bulk operations, multi-window support, data tables
- **Unified**: Responsive form validation, consistent data synchronization

### Real-time Applications (Cross-Platform)
- **Mobile**: Touch interactions, mobile notifications, background sync, offline capability
- **Desktop**: Keyboard shortcuts, multiple connection handling, advanced UI controls
- **Unified**: State synchronization, performance optimization, connection management

## Mobile-Specific Technical Requirements

### Touch Event Handling
```javascript
// Unified input handler template
function handleUnifiedInput(event) {
    const inputType = event.type.includes('touch') ? 'touch' : 
                     event.type.includes('mouse') ? 'mouse' : 'keyboard';
    
    switch(inputType) {
        case 'touch':
            handleTouchInput(event);
            break;
        case 'mouse':
            handleMouseInput(event);
            break;
        case 'keyboard':
            handleKeyboardInput(event);
            break;
    }
}
```

### Responsive Design Breakpoints
```css
/* Mobile-first responsive framework */
/* Mobile (320px-767px) */
@media (max-width: 767px) { /* Mobile styles */ }

/* Tablet (768px-1023px) */
@media (min-width: 768px) and (max-width: 1023px) { /* Tablet styles */ }

/* Desktop (1024px+) */
@media (min-width: 1024px) { /* Desktop styles */ }
```

### PWA Configuration Template
```json
// manifest.json template
{
  "name": "[App Name]",
  "short_name": "[App Short]",
  "description": "[App Description]",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#00ffff",
  "orientation": "portrait-primary",
  "icons": [
    // Multiple sizes for cross-platform compatibility
  ]
}
```

## Output Format Requirements

The generated todo.md should be:
1. **Mobile-First**: Every feature starts with mobile implementation
2. **Cross-Platform**: Desktop enhancements clearly specified
3. **Performance-Oriented**: 60 FPS requirements for both platforms
4. **PWA-Ready**: Progressive Web App features included by default
5. **Accessible**: WCAG compliance for mobile and desktop
6. **Self-contained**: No external dependencies, works offline
7. **Testable**: Visual verification for both platforms
8. **Debug-friendly**: Platform-specific troubleshooting included

## Example Cross-Platform Transformation

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
## Phase 0: Cross-Platform Test Infrastructure
- Create mobile_test.html with 3x3 touch-responsive grid
- Test mobile tap → visual marker appears (touch events)
- Test desktop click → visual marker appears (mouse events)
- Test keyboard navigation with arrow keys
- Verify responsive grid scaling (320px-1024px+)
- Test win condition highlighting on mobile and desktop

## Phase 1: Mobile-First Game Board
Mobile Visual Test First:
- 3x3 grid renders responsively on mobile (320px-428px)
- Touch tap on cell → X/O appears with touch feedback
- Gesture recognition prevents accidental touches
- Score display readable on mobile screens

Desktop Enhancement:
- Add keyboard navigation with arrow keys
- Enhance with mouse hover effects
- Optimize for larger screens
- Add desktop-specific shortcuts

## Phase 2: PWA Integration
- Add web app manifest for installation
- Implement offline game state persistence
- Add touch icons for iOS/Android
- Enable full-screen mobile experience
```

## Final Checklist for Generated Cross-Platform Todo.md

- [ ] Starts with mobile-first visual test infrastructure
- [ ] Every feature tested on mobile before desktop
- [ ] Includes unified input handling methods
- [ ] PWA features included by default
- [ ] Mobile performance requirements specified (60 FPS, <50ms touch)
- [ ] Desktop enhancement phases clearly defined
- [ ] Cross-platform debugging procedures included
- [ ] Responsive design breakpoints specified
- [ ] Accessibility requirements for both platforms
- [ ] Cache-busting for mobile and desktop browsers
- [ ] Cross-device testing procedures
- [ ] Performance optimization for both platforms

## Agent Behavior Rules (Inject into Every Conversation)

```yaml
cross_platform_development_rules:
  1_mobile_first: "Always implement mobile experience before desktop"
  2_unified_methods: "Single methods handle touch, mouse, and keyboard input"
  3_cross_platform_testing: "Test on mobile browsers and desktop browsers"
  4_pwa_by_default: "Include PWA features in every web app"
  5_performance_first: "60 FPS on mobile drives all optimization decisions"
  6_touch_friendly: "44px+ touch targets, gesture recognition, haptic feedback"
  7_responsive_design: "Mobile-first CSS with desktop enhancement"
  8_accessibility_universal: "WCAG compliance for mobile and desktop"
  9_offline_capable: "Service worker and local storage by default"
  10_cross_device_sync: "State persistence across platforms"

makefile_whitelist_cross_platform:
  - make serve (mobile-ready with 0.0.0.0 binding)
  - make visual-test
  - make mobile-test
  - make touch-test
  - make device-test
  - make verify-render
  - make clean-cache
  - make debug-render
  - make auto-test
  - make pwa-test

automatic_cross_platform_behaviors:
  - Mobile viewport configuration in all HTML
  - Touch event handling alongside mouse/keyboard
  - Responsive CSS Grid/Flexbox layouts
  - PWA manifest and service worker creation
  - Performance monitoring for mobile and desktop
  - Cross-platform cache-busting headers
  - Unified input method architecture
  - Mobile-first visual test creation
  - Cross-device compatibility testing
```

## Usage Instructions for Cross-Platform Generation

1. **Read the spec.md thoroughly for both mobile and desktop opportunities**
2. **Identify touch-first interaction patterns**
3. **Create mobile-first phased implementation plan**
4. **For each phase, create mobile visual test first, then desktop enhancement**
5. **Include PWA features by default**
6. **Add cross-platform debugging procedures**
7. **Include performance verification for both platforms**
8. **Generate comprehensive cross-platform todo.md**

The resulting todo.md should enable fully autonomous development where the agent can build, test, and verify a complete cross-platform web application that works seamlessly on mobile devices and desktop browsers without human intervention, with mobile experience as the foundation and desktop as progressive enhancement. 