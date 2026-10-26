ELSEBORN FORUM v5
1. Upload the CONTENTS of elseborn-website-main to GitHub repository root.
2. In Supabase SQL Editor run the CONTENTS of FORUM_COMMENTS_SETUP.sql.
3. Wait for GitHub Pages deployment and hard-refresh.
4. Open forum-category.html?kind=topic or ?kind=application, then a post.
5. Author display uses public.profiles; if RLS blocks profile reads, author shows fallback.
6. Only comment owners can delete their comments.
