# Memori

Personal flip-card app for reviewing more than one subject. AWS Solutions Architect notes ship as the first deck; Proxmox VE has a starter set. Card content is stored in MongoDB and can be edited in the UI.

Full spec: [project_description.md](./project_description.md)
More docs in project_description.md.
Install deps and run the app as usual.

## Cards in MongoDB

First cards read seeds an empty collection from src/data JSON. Ids stay stable for progress.
See project_description for seed and edit details.
