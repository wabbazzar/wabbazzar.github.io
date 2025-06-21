# wabbazzar.github.io Development Plan - Fully Autonomous Implementation

## Critical Success Factors
- Dark minimalist theme with pure black (#000) background
- Single electric blue (#00D4FF) accent color for hover states
- Mobile-first responsive design with centered single column
- Visual verification at every step
- Consistent method usage throughout
- Cache-busting during development
- Automated visual testing infrastructure
- Static HTML/CSS only implementation

## Phase 0: Environment Setup & Visual Test Infrastructure

### 0.1 Project Structure Setup
```
wabbazzar.github.io/
├── index.html
├── styles.css
├── visual_test.html
├── render_verify.html
├── debug_render.html
├── test_runner.js
├── Makefile
└── README.md
```

### 0.2 Create Makefile with Whitelisted Commands
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

### 0.3 Visual Test Harness Setup
Create visual_test.html with:
- DOM state capture for all visual elements
- Color verification (black background, blue hover states)
- Layout measurement tools
- Responsive design breakpoint testing
- Hover state simulation and verification
- Typography rendering checks

### 0.4 Cache-Busting Template
All HTML files must include:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<meta name="version" content="1.0.0">
```

## Phase 1: Core HTML Structure & Visual Foundation

### 1.1 Visual Test First
Create tests for:
- Black background renders correctly (#000)
- Container centers properly
- Font loads correctly (Inter or fallback)
- Mobile viewport works

### 1.2 Create index.html
- Semantic HTML5 structure
- Mobile-first viewport meta tag
- Cache-busting headers
- Link to styles.css
- Basic structure:
  ```html
  <main>
    <h1>wabbazzar</h1>
    <nav>
      <ul>
        <li><a href="#">tetris</a></li>
        <li><a href="#">snake</a></li>
      </ul>
    </nav>
  </main>
  ```

### 1.3 Visual Verification Checklist
- [ ] Page loads with black background
- [ ] Content is centered
- [ ] Text is visible (white on black)
- [ ] No console errors
- [ ] Mobile viewport correct

## Phase 2: Typography & Layout System

### 2.1 Visual Test First
- Wordmark renders in correct font
- Proper spacing between elements
- Responsive scaling verified
- Link list displays vertically

### 2.2 CSS Foundation
Create styles.css with:
- CSS Reset/Normalize
- Custom properties for consistent values
- Base typography (Inter font)
- Layout system (flexbox/grid)

### 2.3 Implementation
```css
:root {
  --bg-black: #000;
  --text-white: #fff;
  --accent-blue: #00D4FF;
  --transition: 0.3s ease;
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### 2.4 Visual Verification
- [ ] Font loads and displays correctly
- [ ] Spacing matches design specs
- [ ] Text is legible on all devices
- [ ] Layout remains centered

## Phase 3: Interactive States & Hover Effects

### 3.1 Visual Test First
- Create hover state simulator
- Test blue glow effect (#00D4FF)
- Verify transition smoothness (0.3s)
- Check touch device behavior

### 3.2 Hover Implementation
- Link default state (white text)
- Hover state (blue glow)
- Smooth transitions
- Accessibility considerations

### 3.3 Visual Verification
- [ ] Links glow blue on hover
- [ ] Transitions are smooth
- [ ] No flickering or jumps
- [ ] Touch devices handle appropriately

## Phase 4: Responsive Design & Mobile Optimization

### 4.1 Visual Test First
- Test at multiple breakpoints (320px, 768px, 1024px, 1440px)
- Verify text scaling
- Check touch target sizes
- Test landscape orientation

### 4.2 Responsive Implementation
- Fluid typography
- Flexible spacing
- Touch-friendly link sizes
- Proper viewport behavior

### 4.3 Visual Verification
- [ ] Layout works at all screen sizes
- [ ] Text remains readable
- [ ] Touch targets are 44px minimum
- [ ] No horizontal scroll

## Phase 5: Performance & Optimization

### 5.1 Visual Test First
- Page load time measurement
- First paint verification
- Font loading behavior
- CSS optimization checks

### 5.2 Optimization Steps
- Minify CSS
- Inline critical CSS
- Optimize font loading
- Remove unused styles

### 5.3 Performance Verification
- [ ] Page loads under 1 second
- [ ] No layout shifts
- [ ] Fonts load without FOUT
- [ ] CSS is optimized

## Phase 6: Subtle Accent Line Feature

### 6.1 Visual Test First
- Test permanent blue accent placement
- Verify it doesn't interfere with content
- Check responsiveness

### 6.2 Implementation Options
- Thin blue line under wordmark
- Subtle blue border accent
- Blue dot or minimal decoration

### 6.3 Visual Verification
- [ ] Accent is subtle but visible
- [ ] Doesn't distract from content
- [ ] Scales appropriately
- [ ] Consistent across devices

## Phase 7: Final Integration & Polish

### 7.1 Cross-browser Testing
- Chrome, Firefox, Safari, Edge
- Mobile browsers
- Different operating systems

### 7.2 Accessibility Audit
- Color contrast verification
- Keyboard navigation
- Screen reader testing
- Focus indicators

### 7.3 Final Checklist
- [ ] All visual tests pass
- [ ] No console errors
- [ ] Performance targets met
- [ ] Accessibility compliant
- [ ] Ready for deployment

## Debugging Procedures

### Visual Debugging Protocol
1. Open debug_render.html
2. Check computed styles vs applied styles
3. Verify element visibility
4. Force repaint with element.offsetHeight
5. Compare actual vs expected colors
6. Test in incognito mode (cache issues)

### Common Issues & Solutions
- **Black background not showing**: Check CSS specificity, body/html height
- **Hover not working**: Verify :hover pseudo-class, check touch events
- **Font not loading**: Check @font-face, CORS, fallback stack
- **Layout breaking**: Inspect flexbox/grid, check viewport units
- **Blue color wrong**: Verify hex value, check color profiles

## Success Criteria

### Visual Criteria
- Pure black background (#000) renders consistently
- Electric blue (#00D4FF) appears only on hover + one accent
- Typography is crisp and readable
- Layout remains centered at all sizes
- Smooth 0.3s transitions on all interactions

### Functional Criteria
- Page loads in under 1 second
- No JavaScript errors (pure HTML/CSS)
- Works on all modern browsers
- Mobile-first responsive design
- Accessible to screen readers

### Code Quality
- Semantic HTML5 markup
- Organized CSS with custom properties
- No unused styles
- Proper commenting
- Clean file structure

## Testing Automation

### test_runner.js
```javascript
// Visual regression tests
// DOM state verification
// Color accuracy checks
// Layout measurements
// Performance metrics
```

## Project Completion Checklist

- [ ] All phases completed with visual verification
- [ ] Cross-browser testing passed
- [ ] Performance optimized
- [ ] Accessibility verified
- [ ] Clean up test files
- [ ] Documentation complete
- [ ] Ready for GitHub Pages deployment

## Notes for Autonomous Agent

1. **Always run visual tests before proceeding to next phase**
2. **Never trust console logs alone - verify in browser**
3. **Use consistent CSS methodology throughout**
4. **Test on real devices when possible**
5. **Keep the design minimal - resist feature creep**
6. **Document any deviations from plan**
7. **Clean up all test files before final deployment**

## Makefile Commands Reference
- `make serve` - Start local development server
- `make visual-test` - Run visual test suite
- `make verify-render` - Check render pipeline
- `make clean-cache` - Clear browser cache
- `make debug-render` - Debug visual issues
- `make auto-test` - Run automated tests
