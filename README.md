# Recall

Personal flip-card app for reviewing more than one subject. AWS Solutions Architect notes ship as the first deck; Proxmox VE has a small starter set.

Full spec: [project_description.md](./project_description.md)

```bash
npm install
cp .env.example .env.local
# paste your MongoDB Atlas connection string into .env.local
npm run dev
```

Open http://localhost:3000

- `/` topic library
- `/aws` and `/pve` dashboards
- `/aws/study`, `/pve/browse`, and the same routes with `category` / `mode` query params
