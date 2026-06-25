# Studio preview

This document is kept as a historical reference. **The app does not
currently run the IFramePreviewView from the original Sanity starter**;
content freshness is handled by a Sanity webhook that invalidates Next
cache tags.

## Current state — content freshness via webhook

The current flow:

1. A document changes in Sanity Content Lake.
2. Sanity posts the document to `/api/revalidate` on the deployed app
   with a signature derived from `SANITY_REVALIDATE_SECRET`.
3. `app/api/revalidate/route.ts` calls `parseBody` from
   `next-sanity/webhook` to verify the signature.
4. `getRevalidationTags` (in `lib/content-freshness.ts`, re-exported from
   `lib/sanity.revalidation.ts`) maps the document's `_type` to the cache
   tags that should be invalidated.
5. The route calls `revalidateTag` for each tag.

Accepted document types: `propiedad`, `paginas`, `operacion`, `tipo`,
`localizacion`, `caracteristicas`. Anything else returns a `500` from
the route.

The tag vocabulary (`front-page`, `filters`, `propiedades`, `pages`,
`propiedad:<slug>`) is defined once in `lib/content-freshness.ts` and
shared with the fetch-side cache policy module (`lib/sanity.cache.ts`).
This is what keeps fetch and invalidation aligned.

## Live preview (not active)

The `IFramePreviewView` from the original starter is not wired up. If you
want to add it back, the relevant files would be:

- A Sanity Studio component that renders the iframe (typically
  `sanity/components/IFramePreviewView.tsx`).
- `lib/sanity.structure.js` — a `defaultDocumentNode` resolver that
  attaches the preview view to schemas that opt in.
- A draft mode entry route (App Router equivalent of the original
  `pages/api/preview.ts` and `pages/api/exit-preview.ts`).
- `VisualEditing` mounted in the app layout.

Until those pieces exist, the hosted Studio is for content editing only. The public app redirects `/studio` to `https://inmogolfbonalba.sanity.studio/`. Authors will not see a live preview of draft content in the app.

## Reference: what the original starter described

The text below is the original Sanity starter description. It refers to
files that have since been removed in favour of the App Router layout:

> Add a `defaultDocumentNode` resolver
>
> 1. `deskTool.defaultDocumentNode` allows us to configure views for
>    schemas. Create `./sanity/structure.ts` and paste…
> 2. Add this function to `deskTool` configuration in `sanity.config.ts`,
>    and import from `./sanity/structure`…
> 3. Add a field named `slug` with type `slug` to your document schema.
> 4. Add a `[slug].tsx` route to `/pages` that resolves and renders the
>    data.

The App Router equivalent of step 4 is
`app/(frontend)/[lang]/[slug]/page.tsx`, which resolves `paginas`
documents.
