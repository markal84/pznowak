# Plan: Replace Hardcoded Text with WordPress Content

Here is the 5-step plan to replace hardcoded text with content managed in WordPress:

1.  **Create the Content in WordPress:**
    *   **For Pages:** In your WordPress admin panel, go to "Pages" and create a new page for each section of your site that has static text. For example, create a page with the slug `o-nas` for your "About Us" page and add the desired content to its editor.
    *   **For Global Text:** Use the ACF plugin to create a "Theme Options" page. On this page, create fields for each piece of hardcoded text you want to make editable (e.g., a field for the hero section title on the homepage, a field for the "Zapytaj o ten pierścionek" button text, etc.).

2.  **Extend the API Library (`wordpress.ts`):**
    *   Create a new, generic function in `src/lib/wordpress.ts` to fetch content from a standard WordPress page by its slug. It would look very similar to the existing `getProductBySlug` function.
    *   Example function signature: `export async function getPageBySlug(slug: string): Promise<Page | null>`
    *   If you created a global options page with ACF, you would also add a function to fetch those options, like: `export async function getGlobalOptions(): Promise<GlobalOptions | null>`. This would fetch from the ACF options endpoint, typically `[WP_API_URL]/acf/v3/options/options`.

3.  **Update the React Page Components:**
    *   In the component file for the page you want to update (e.g., `src/app/o-nas/page.tsx`), call your new `getPageBySlug('o-nas')` function to fetch the content.
    *   Replace the hardcoded text and HTML with the data you fetched from the API. You would likely use `dangerouslySetInnerHTML={{ __html: page.content.rendered }}` to render the main content from the WordPress editor.

4.  **Update Shared Components (for Global Text):**
    *   For components that use global text snippets (like the Header or Footer), you would call your new `getGlobalOptions()` function.
    *   You could fetch this data once in the main `layout.tsx` and pass it down via React Context, or have each component fetch it as needed (Next.js caching will prevent redundant requests).
    *   Replace the hardcoded text (e.g., "Zapytaj o ten pierścionek") with the corresponding field from the fetched options (e.g., `{options.ask_button_text}`).

5.  **Test and Verify:**
    *   Run the application and navigate to the updated pages to ensure the text from WordPress is being displayed correctly.
    *   Go back to the WordPress admin panel, make a change to the text, and confirm that the change is reflected on the live site after a refresh (respecting any caching you have configured).
