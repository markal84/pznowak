# Astra proposal

Independent worktree and branch `astra_version`, based on 98363c3. Earlier uncommitted work on audit/claude-fable is untouched.

## Presentation

- Responsive redesign: home, catalogue, 34 product details, workshop, gallery, contact and 404.
- Public WordPress catalogue snapshot taken 2026-09-06. Includes 34 products and 11 gallery entries. 110 public images are served locally; product videos remain on the existing public WordPress host.
- Retains original project's logo, hero illustration and workshop image.
- Contact form deliberately opens an email draft; it does not invoke the production PHP endpoint. Sending remains in the visitor's mail app.
- Presentation metadata disables indexing. Sites access starts owner-only.
- Before replacing production, agree final copy, confirm asset provenance, restore the agreed live content-refresh workflow and select/verify the production contact-delivery integration.

## Verification

Production export: `npm run build -- --webpack` (existing Next.js static export).
Browser checks: desktop and phone, navigation, ring views, product lightbox, query context on contact. No test enquiry sent.
