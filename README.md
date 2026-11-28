# Internship-Review-G-7

Batch 23 Web Development

## LedgerGuard Frontend

Responsive React + TypeScript dashboard prototype for a multi-tenant billing platform.

### Highlights

- Revenue and payment analytics with selectable date ranges
- Searchable transaction and invoice tables, including transaction CSV export
- Organization and security overview screens
- Responsive layouts for desktop and mobile

### Technology

React 18, TypeScript, Vite, React Router, Recharts, and Lucide icons.

### Start locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build` and serve the generated files locally with `npm run preview`.

### Pages

- `/` Dashboard and payment analytics
- `/login` Login screen
- `/transactions` Transaction table with search, status filter and CSV export
- `/billing` Invoice summary, status tabs and demo downloads
- `/organizations` Organization profiles and settings tabs
- `/security` Security status, configuration and activity

All displayed records are local mock data, and the login form is a frontend demonstration only. API integration should use an authenticated backend that derives and authorizes tenant scope from the verified identity. Never put signing keys, database credentials or JWT secrets in frontend code.
