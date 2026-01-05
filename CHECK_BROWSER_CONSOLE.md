# Browser Console Check - Blank Screen Issue

## The server is working, but Angular isn't loading!

### ✅ What's Working
- Server responds on http://localhost:4200
- HTML is being served correctly
- `<app-root>` tag is present

### ❌ What's NOT Working
- Angular application isn't bootstrapping (blank screen)

---

## IMMEDIATE SOLUTION

### **Check Browser Console for Errors**

1. **Open Browser** to http://localhost:4200
2. **Press F12** (or Right-click → Inspect)
3. **Click "Console" tab**
4. **Look for RED errors**

Common errors you might see:

#### Error 1: "Failed to load module script"
```
Solution: Make sure Angular dev server finished compiling
Look for: "✔ Browser application bundle generation complete"
```

#### Error 2: "Cannot find module"
```
Solution: npm install might not have run
Fix: cd apps/web && npm install
```

#### Error 3: "NG0... errors" (Angular errors)
```
Solution: There might be a code issue
Check the specific error message
```

---

## QUICK FIX: Fresh Restart

Stop the current Angular server (Ctrl+C in its terminal) and run:

```powershell
cd C:\__property\apps\web

# Clean everything
Remove-Item -Recurse -Force node_modules, dist, .angular -ErrorAction SilentlyContinue

# Reinstall
npm install

# Start fresh
npm start
```

Then wait for:
```
✔ Browser application bundle generation complete.
** Angular Live Development Server is listening on localhost:4200 **
```

---

## Alternative: Check the Angular Terminal

The Angular terminal window should show:

**✅ GOOD - Working:**
```
✔ Browser application bundle generation complete.

Initial chunk files   | Names         |  Raw size
chunk-XXXXX.js        | main          | 143.42 kB
styles-XXXXX.css      | styles        |  89.39 kB

Application bundle generation complete. [23.583 seconds]

** Angular Live Development Server is listening on localhost:4200 **
```

**❌ BAD - Has errors:**
```
✘ [ERROR] Some error message here
```

If you see errors, that's the issue!

---

## Still Blank? Try This

### 1. Hard Refresh Browser
- Press **Ctrl + Shift + R** (Windows)
- Or **Cmd + Shift + R** (Mac)

### 2. Clear Browser Cache
- Press F12 → Click "Application" tab
- Click "Clear storage" → "Clear site data"

### 3. Try Incognito/Private Window
- Press **Ctrl + Shift + N** (Windows)
- Navigate to http://localhost:4200

---

## Nuclear Option: Complete Reset

If nothing works:

```powershell
# Stop ALL Node processes
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Go to frontend directory
cd C:\__property\apps\web

# Complete clean
Remove-Item -Recurse -Force node_modules, package-lock.json, dist, .angular

# Fresh install
npm install

# Start
npm start

# Wait 30-60 seconds for first compile
```

---

## What to Look For

When npm start runs, you should see:

```
> @maintainuk/web@1.0.0 start
> ng serve

❯ Building...
✔ Building...

Initial chunk files   | Names                     |  Raw size
...

Application bundle generation complete. [XX seconds]

** Angular Live Development Server is listening on localhost:4200 **
✔ Compiled successfully.
```

**Only AFTER you see "Compiled successfully" should the page work!**

---

## If You See JavaScript Errors in Console

Take a screenshot and:
1. Note the exact error message
2. Note which file it references
3. This will help debug the specific issue

Common fixes:
- Missing import in a component
- Circular dependency
- Module not found

---

## Still Need Help?

If the Angular terminal shows "Compiled successfully" AND the browser console has no errors, but the screen is still blank:

1. Check if you're on the right URL: http://localhost:4200
2. Try a different browser
3. Check if any browser extensions are blocking it (ad blockers, etc.)
4. Verify the backend API is also running on port 5000

---

**Most likely cause: Angular is still compiling! Just wait 30-60 seconds after starting.**

