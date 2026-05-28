# Argument Mapping

A web-based argument mapping tool for building structured visual arguments. Create thesis nodes, add supporting reasons and objections, connect them with labeled edges, and share maps with others via a unique URL.

[![Live](https://img.shields.io/badge/live-argumentmapping.com-black?style=flat-square)](https://argumentmapping.com)

![Argument Mapping](https://s3.us-east-1.amazonaws.com/argumentmapping.com/banner.jpg)

---

## Features

- **Visual argument maps** — nodes connected by labeled bezier edges (reason, objection, rebuttal)
- **Drag & drop** — move nodes freely around the canvas
- **Pan & zoom** — navigate large maps with mouse drag and scroll wheel
- **Auto layout** — automatically arranges nodes into a clean tree structure
- **Inline editing** — click any node to edit its text directly
- **Resize nodes** — drag the bottom-right corner to resize any node
- **Right-click to add** — right-click anywhere on the canvas to add a new thesis
- **Spawn children** — hover a node to add reasons, objections, or rebuttals
- **Share via URL** — every map gets a unique UUID-based URL anyone can open
- **View only mode** — shared maps are read-only for non-owners
- **Dashboard** — manage all your maps in one place
- **Auto-save** — changes are debounced and saved to the database automatically
- **Import / Export** — download maps as JSON or import from a file
- **Google OAuth** — sign in with Google, no passwords

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Auth & Database | Supabase (PostgreSQL + Row Level Security) |
| Hosting | AWS S3 + Cloudflare |

---

## Prerequisites

- Node.js 18+
- AWS CLI configured (`aws configure`)
- A [Supabase](https://supabase.com) account
- A [Google Cloud](https://console.cloud.google.com) account

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/yourusername/argument-mapping.git
cd argument-mapping
npm install
```

### 2. Set up Supabase

#### Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning
3. Go to **Settings → API** and note your **Project URL** and **anon public** key

#### Create the database table

Go to **SQL Editor** and run:

```sql
-- Create maps table
create table maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null default 'Untitled Argument Map',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on every save
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger maps_updated_at
  before update on maps
  for each row execute function update_updated_at();

-- Enable Row Level Security
alter table maps enable row level security;

-- Anyone can read a map (for sharing)
create policy "Public read"
  on maps for select
  using (true);

-- Only the owner can insert
create policy "Owner insert"
  on maps for insert
  with check (auth.uid() = user_id);

-- Only the owner can update
create policy "Owner update"
  on maps for update
  using (auth.uid() = user_id);

-- Only the owner can delete
create policy "Owner delete"
  on maps for delete
  using (auth.uid() = user_id);
```

#### Configure allowed redirect URLs

Go to **Authentication → URL Configuration** and add:

```
http://localhost:5173
http://localhost:5173/**
https://yourdomain.com
https://yourdomain.com/**
```

### 3. Set up Google OAuth

#### Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services → OAuth consent screen**
   - Choose **External**
   - Fill in your app name and support email
   - Save and continue through all steps
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins:**
```
 http://localhost:5173
 https://yourdomain.com
```
    - **Authorized redirect URIs:**
```
 https://your-project-ref.supabase.co/auth/v1/callback
```
5. Copy the **Client ID** and **Client Secret**

#### Enable Google in Supabase

1. Go to **Authentication → Providers → Google**
2. Toggle it on
3. Paste the **Client ID** and **Client Secret** from Google
4. Save

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Both values are in **Supabase → Settings → API**.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deployment

### AWS S3 + Cloudflare

#### Create the S3 bucket

1. Go to [AWS S3](https://s3.console.aws.amazon.com) and create a bucket named `yourdomain.com`
2. Uncheck **Block all public access**
3. Enable **Static website hosting**
   - Index document: `index.html`
   - Error document: `index.html`
4. Add the following bucket policy under **Permissions → Bucket Policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::yourdomain.com/*"
    }
  ]
}
```

#### Configure Cloudflare DNS

In your Cloudflare dashboard add a DNS record:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` | `yourdomain.com.s3-website.eu-west-1.amazonaws.com` | DNS only |

Replace `eu-west-1` with your actual AWS region.

#### Add deploy script

In `package.json` add:

```json
"scripts": {
  "deploy": "npm run build && aws s3 sync dist/ s3://yourdomain.com --delete"
}
```

#### Deploy

```bash
npm run deploy
```

#### HTTPS with CloudFront (recommended)

1. Create a CloudFront distribution pointing to your S3 bucket website endpoint
2. Add `yourdomain.com` as an alternate domain name
3. Request an ACM certificate in `us-east-1` for `yourdomain.com`
4. In Cloudflare DNS, point the CNAME to your CloudFront domain (`xxxx.cloudfront.net`) and set to **Proxied**
5. Update the deploy script to invalidate the cache after each deploy:

```json
"deploy": "npm run build && aws s3 sync dist/ s3://yourdomain.com --delete && aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths '/*'"
```

---

## Project Structure

```
src/
components/
Edges.jsx         # SVG bezier arrows between nodes
Node.jsx          # Individual draggable argument node
pages/
AuthPage.jsx      # Google sign-in page
DashboardPage.jsx # Map list and management
utils/
utils.js          # Layout algorithm, coordinate helpers
App.jsx             # Main canvas with pan/zoom/drag
AuthContext.jsx     # Supabase auth state
Router.jsx          # Client-side routing
main.jsx            # Entry point
store.js            # Supabase database operations
supabase.js         # Supabase client
```

---

## Usage

| Action | How |
|---|---|
| Add a thesis | Right-click anywhere on the canvas |
| Add a reason | Hover a node → click **+ Reason** |
| Add an objection | Hover a node → click **+ Objection** |
| Edit text | Click directly on any node text |
| Move a node | Drag the node |
| Resize a node | Drag the bottom-right corner handle |
| Delete a node | Hover a node → click **×** (deletes all children too) |
| Pan the canvas | Click and drag the background |
| Zoom | Scroll wheel |
| Auto layout | Click **Auto layout** in the header |
| Share a map | Click **Copy share URL** — anyone with the link can view |
| New map | Go to dashboard → **+ New map** |
| Export | Click **Export** to download as JSON |
| Import | Click **Import** to load a JSON file |

---

## License

MIT