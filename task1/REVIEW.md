# REVIEW.md

## Task 1: Code Review & Refactor (AngularJS)

### Original code (high level)
The provided code consists of:
- `UserDashboardService` (fetches `/users`, stores them in a shared in-memory array, exposes search/update helpers)
- `UserDashboardController` (binds search UI + “Make Admin” button)
- `userDashboard.html` (search input + list + button)

Even though the code is short, it contains multiple correctness, robustness, and architectural issues.

---

## Issues found (>= 8)

### 1) Controller renders before data is loaded (stale initial UI)
**What’s wrong:**  
`UserDashboardController` initializes:
`$scope.filteredUsers = UserDashboardService.searchUsers('');`
but `UserDashboardService` fetches users asynchronously via `$http.get(...)`. At controller initialization time, `users` is still `[]`, so the UI shows “No users found” until the user performs another search.

**Why it matters:**  
This is a correctness bug: the initial view is wrong and may appear broken to users.

**Fix:**  
Expose a `loadUsers()` / `getUsers()` method that returns a promise, and update `$scope.filteredUsers` only after the data resolves.

---

### 2) No error handling on initial GET request
**What’s wrong:**  
The service never handles failure of the initial `$http.get('.../users')`.

**Why it matters:**  
In a failure scenario (network error, 500, CORS), the UI will silently remain empty with no feedback.

**Fix:**  
Catch errors and propagate them (or store an error state) so the controller can render an error message.

---

### 3) `updateUser()` does not return a useful promise chain
**What’s wrong:**  
`updateUser()` triggers:
1. `$http.put(...)`
2. then inside its `.then(...)` it calls another `$http.get(...)`

But `updateUser()` itself returns an object method that doesn’t return the inner promise to the controller.

**Why it matters:**  
The controller cannot reliably know when the update completes (success/failure), so the UI cannot provide correct loading/error states.

**Fix:**  
Return a proper promise from `updateUser()` (e.g., `return $http.put(...).then(() => loadUsers())`).

---

### 4) No error handling on PUT / re-fetch
**What’s wrong:**  
If the `PUT` fails, or the subsequent re-fetch fails, there’s no `.catch(...)` path.

**Why it matters:**  
The UI can incorrectly show success or stay stuck without an explanation.

**Fix:**  
Add failure handling and surface a user-visible error state.

---

### 5) Unsafe assumptions in `searchUsers(query)`
**What’s wrong:**  
`searchUsers(query)` assumes `query` is always a string. In the controller, `query = $scope.searchQuery;` is not guarded. If `searchQuery` is `undefined` (common on initial digest cycles), `query.toLowerCase()` or `query` usage can throw.

**Why it matters:**  
This can cause runtime exceptions and break the page.

**Fix:**  
Normalize input: if `query` is not a string, coerce to `''`, then trim/lowercase defensively.

---

### 6) Incorrect / non-robust equality checks
**What’s wrong:**  
The code uses non-strict equality in at least two places:
- `if (users[i].id == id)` in `getUser`
- `ng-if="filteredUsers.length == 0"` in the template

**Why it matters:**  
Non-strict equality can hide type coercion issues (e.g., `"1"` vs `1`), producing incorrect matches.

**Fix:**  
Use strict equality (or explicitly normalize both sides to strings/numbers).

---

### 7) `ng-change` triggers on every keystroke (no debounce)
**What’s wrong:**  
`ng-change="onSearch()"` calls `searchUsers(query)` directly on each input change.

**Why it matters:**  
On large `users` arrays, this causes repeated O(n) filtering for every keystroke, which can degrade UI responsiveness.

**Fix:**  
Debounce search in the controller with `$timeout` or use `$watch` + debounce logic.

---

### 8) Inefficient repeated per-item lowercasing
**What’s wrong:**  
`searchUsers()` repeatedly calls:
`users[i].name.toLowerCase()` and `users[i].email.toLowerCase()` for every user on every search invocation.

**Why it matters:**  
Filtering becomes expensive when the list grows or search is frequent.

**Fix:**  
For this assessment we can keep it simple, but improve defensively:
- guard nulls
- trim/lowercase once for the query
- optionally precompute `nameLower/emailLower` once when users are loaded (if needed).

---

### 9) Authorization/security is missing in UI for privileged action
**What’s wrong:**  
The UI allows any user to click “Make Admin” which calls:
`updateUser(user.id, { role: 'admin' })`

**Why it matters:**  
Even though the backend is mocked as `api.example.com`, in real systems this is a privileged operation. UI-only controls are not enough.

**Fix:**  
Enforce authorization server-side (e.g., only allow admins to perform role changes). The UI should also hide/disable the button based on the current user’s permissions.

---

### 10) Architectural anti-pattern: shared mutable state without lifecycle management
**What’s wrong:**  
The service stores users in a shared closure array, but nothing notifies consumers when it changes (only direct search calls see the new value).

**Why it matters:**  
This creates lifecycle coupling and makes the controller prone to stale state.

**Fix:**  
Use explicit lifecycle methods (`getUsers() -> Promise`) and update the UI after state is ready.

---

## Refactor approach (production-friendly)

### Goals
- Ensure the initial UI updates only after user data is loaded.
- Return promises from service methods so controller can display correct loading/error states.
- Add input normalization to prevent runtime exceptions.
- Debounce search to reduce UI churn.
- Use safer equality and guards.
- Keep responsibilities separated: service handles data; controller handles UI state.

### What changed in the refactor
- `UserDashboardService.loadUsers()` now caches the in-flight request and returns a promise.
- Controller loads users in its initialization path and only sets `filteredUsers` after the promise resolves.
- `searchQuery` is watched and debounced in the controller.
- `updateUser()` returns a promise chain and the controller refreshes the filtered list after success.
- Template uses strict equality and disables the button while updating.

---

## Files in this repo (refactor output)
- `task1/userDashboardService.js`
- `task1/userDashboardController.js`
- `task1/userDashboard.html`

