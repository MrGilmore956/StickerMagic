---
description: How to diagnose and handle browser automation sizing/zoom issues
---

# Browser Automation Sizing Issues

## The Problem

When using browser automation (browser_subagent), the UI may appear extremely small/tiny in screenshots. This is NOT a code bug - it's an environment issue.

## Root Cause

The browser automation environment runs with `window.devicePixelRatio = 0.25` (25% zoom), causing:

- Viewport reports as 10,240px wide (instead of normal ~1920px)
- UI elements render tiny because CSS is designed for normal viewports
- Screenshots show miniature interfaces

## How to Diagnose

1. Run JavaScript in browser: `window.devicePixelRatio`
2. If result is less than 1.0 (like 0.25), this is the cause
3. Check `window.innerWidth` - if it's abnormally large (10000+), confirms the issue

## Solution

This is NOT a code fix - the site works correctly for real users. To verify:

### Option 1: Force CSS zoom in automation

```javascript
document.body.style.zoom = '400%';  // Compensates for 0.25 ratio
```

### Option 2: Tell user to test manually

Ask user to:

1. Open a NEW browser tab (not automated ones)
2. Navigate to the local dev URL
3. Press Ctrl+0 to reset zoom
4. Site should display correctly

## Key Points to Remember

- Live/production site displays correctly for real users
- Dev site also displays correctly in user's actual browser
- Only automation screenshots show tiny UI
- Don't waste time debugging CSS for this issue
- devicePixelRatio < 1.0 = zoom out issue, not code issue
