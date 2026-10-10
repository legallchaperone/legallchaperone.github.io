# How to publish a new blog post

## Two steps

**1. Create the post file**

Add a Markdown file anywhere in `blog/posts/`:

```
blog/posts/my-post.md
```

File name can be anything — no required format.

Write plain Markdown content (no front matter needed):

```markdown
Some opening thoughts.

## Section heading

More text here.
```

**2. Register it in the manifest**

Add one entry to `blog/posts.json`:

```json
{"title": "My Post Title", "date": "2026-03-01", "file": "my-post.md"}
```

The `"file"` value must exactly match the filename you used in step 1.
Posts are sorted newest-first by `"date"`.

**3. Push**

```bash
git add blog/posts/my-post.md blog/posts.json
git commit -m "Add post: My Post Title"
git push
```

The site updates automatically in ~1 minute.
