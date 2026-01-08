# Release – Process Request Builder (Static)

This is a static GitHub Pages site that generates an issue body matching the output format of `.github/ISSUE_TEMPLATE/process.yml`.

## Deploy (GitHub Pages)
1. Put the site in `/docs`
2. Repo Settings → Pages → Source: `Deploy from a branch`
3. Branch: `main` (or your default), Folder: `/docs`

## Use
1. Fill out the form (date picker + big textareas)
2. Click **Copy to clipboard**
3. Create an issue and paste the body
4. Submit the issue (labels must include `release` and `process`)

## Notes
- The output format follows GitHub Issue Forms' markdown body structure (headings + values + tasklist checkboxes). Your existing parser action expects this shape.
