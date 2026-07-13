# Plan 012: Add property context to WhatsApp enquiries

> **Executor instructions**: Build the URL in one tested helper and use it in both desktop and mobile contact controls. Preserve phone number/contact behavior. Update the index when done.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- app/'(frontend)'/'[lang]'/propiedad/'[slug]'/page.tsx lib/site-routes.ts lib/contact-links.ts lib/interfaces.ts dictionaries/en.json dictionaries/es.json tests/contact-links.test.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/003-canonicalize-locale-urls.md`, `plans/005-return-property-404.md`
- **Category**: direction
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

Property email links include the listing title, but adjacent WhatsApp links open a generic conversation. Mobile prospects must identify the listing manually and the agency can receive ambiguous enquiries. A localized, URL-encoded message containing title and canonical URL reduces friction without introducing a form or backend.

## Current state

The detail route has two duplicated contact groups. At `app/(frontend)/[lang]/propiedad/[slug]/page.tsx:101-115` and `276-290`:

- Email `subject` includes `propiedad.title`.
- WhatsApp uses the fixed generic URL `https://wa.me/34655849409`.

Canonical property URLs are produced by `getPropertyUrl(locale, {slug})` in `lib/site-routes.ts`. Dictionary shape is manually declared in `lib/interfaces.ts`; both `dictionaries/en.json` and `dictionaries/es.json` must remain shape-compatible.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused test | `node_modules/.bin/tsx tests/contact-links.test.ts` | all pass |
| Full gates | `yarn verify && yarn build` | exit 0 |

## Scope

**In scope**:
- `lib/contact-links.ts` (create)
- `tests/contact-links.test.ts` (create)
- `app/(frontend)/[lang]/propiedad/[slug]/page.tsx`
- `lib/interfaces.ts`
- `dictionaries/en.json`
- `dictionaries/es.json`

**Out of scope**:
- Changing phone numbers, email addresses, or contact providers
- Adding a contact form/backend/analytics
- Refactoring all contact controls
- Changing canonical domain logic
- Embedding user-controlled HTML

## Git workflow

- Branch: `advisor/012-contextual-whatsapp`
- Commit: `feat: add property context to WhatsApp enquiries`
- Do not push unless instructed.

## Steps

### Step 1: Add localized message copy

Add a concise dictionary field for the WhatsApp enquiry prefix in both locales and update `Dict`. Keep property title and URL out of translation strings; the helper appends them. Example intent, not required wording: “Hello, I am interested in this property”.

**Verify**: `yarn type-check` → both dictionaries satisfy all consumers.

### Step 2: Build a pure contact-link helper

Create `lib/contact-links.ts` exporting a function that accepts locale, slug, title, and localized message prefix. It must:

1. Obtain the canonical property URL through `getPropertyUrl`.
2. Build one message containing prefix, title, and URL.
3. Encode it as the `text` query parameter on the existing `wa.me` endpoint using `URL`/`URLSearchParams`, not manual replacement.
4. Return a string URL.

Keep the existing business phone number in one named module constant. Do not log message text.

**Verify**: `yarn type-check` → exit 0.

### Step 3: Add encoding tests

Create `tests/contact-links.test.ts` using `node:assert/strict`. Cover:

- English and Spanish prefixes.
- Titles with spaces, accents, ampersands, `?`, and `#`.
- Parsed `text` exactly equals the intended human-readable message.
- Message includes the canonical localized property URL with no double slash.
- Host/path still target the existing WhatsApp number.

Compare parsed URL values, not raw percent-encoding style.

**Verify**: focused test passes.

### Step 4: Use one URL in both contact surfaces

Compute the WhatsApp URL once after property validation in the detail route. Replace both generic `href` values with that variable. Preserve icon, accessibility labels, dropdown/mobile layout, and email/phone links.

**Verify**: `rg -n "https://wa.me/34655849409" 'app/(frontend)/[lang]/propiedad/[slug]/page.tsx'` → no hardcoded generic link remains in the route.

### Step 5: Run gates

**Verify**: `yarn verify && yarn build` → exit 0.

## Test plan

The helper test is the primary regression fence. Manually inspect one built detail page or run a browser smoke test: opening the WhatsApp link should show a prefilled message with correct locale, title, and property URL. Do not send a message during testing.

## Done criteria

- [ ] Desktop and mobile controls share one contextual URL.
- [ ] Message is localized and URL-encoded safely.
- [ ] Canonical property URL is included.
- [ ] Existing phone number/provider is unchanged.
- [ ] Focused test, `yarn verify`, and `yarn build` pass.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- The business wants different phone numbers/messages by locale.
- Plan 003's URL helper contract changed materially.
- Dictionary structure has migrated to another system.
- Requirements expand to lead capture, tracking, or a backend.

## Maintenance notes

Keep provider-specific URL encoding in the helper rather than JSX. If analytics are added later, preserve the message test and treat tracking consent as a separate concern.
