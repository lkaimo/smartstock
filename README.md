# SmartStock

**A web-based inventory and sales management system for small businesses.**

SmartStock replaces scattered spreadsheets with one application where a business can manage products and suppliers, record sales, keep stock levels accurate automatically, and see how the business is performing on a live dashboard.

<!-- Add a hero screenshot or demo GIF here -->
<!-- ![SmartStock dashboard](docs/screenshots/dashboard.png) -->

**Live demo:** _add link_ · **Demo login:** _add credentials for a read-only demo account_

---

## The problem

Small businesses often track inventory in one spreadsheet, sales in another, and customers in a notebook. The result is predictable: stock counts drift out of date, products oversell, nobody knows which items actually make money, and owners spend hours building reports by hand.

## The solution

SmartStock centralizes these operations in a single system. Recording a sale updates inventory immediately, every stock change is logged, and the dashboard answers the questions an owner asks most: how much did we sell, what sells fastest, and what needs reordering.

## Features

| Feature | What it does for the business |
| --- | --- |
| Product and supplier management | One clean catalog of what the business sells and who it buys from |
| Sales recording | Staff record a sale once; stock is correct immediately, preventing overselling |
| Stock movement history | A full audit trail of every sale, restock, adjustment, and return |
| Customer management | Links purchases to customers for repeat-buyer analysis |
| Dashboard analytics | Revenue, top sellers, slow movers, low-stock alerts, and average order value, with date filters |
| Authentication and roles | Owners, managers, and staff each see and do only what their role allows |

### Dashboard KPIs

| KPI | Question it answers |
| --- | --- |
| Revenue and gross profit | Is the business making money? |
| Top-selling products | What must never run out? |
| Low-stock alerts | What needs reordering now? |
| Slow-moving stock | What is tying up cash? |
| Average order value | Are customers buying more per visit? |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js / React, charting library |
| Backend | Supabase: PostgreSQL, Auth, Row Level Security, RPC functions |
| Hosting | Vercel (frontend), Supabase (database and auth) |

## Key engineering decisions

These are the choices that make the app reliable rather than just functional.

**1. Transactional sales.**
Recording a sale inserts the sale, inserts its line items, decrements stock, and writes the stock movement inside a single Postgres function. Either everything succeeds or nothing does, so the database never shows a sale without a matching stock change.

**2. Concurrency-safe stock updates.**
Stock is decremented with an atomic conditional update (`stock = stock - qty WHERE stock >= qty`). If two cashiers sell the last unit at the same moment, one succeeds and the other is rejected cleanly instead of driving stock negative.

**3. Price snapshots on line items.**
Each sale item stores the unit price at the time of sale. Changing a product's price later never rewrites historical revenue.

**4. Append-only stock ledger.**
Every change to stock is recorded as a movement (sale, restock, adjustment, return) with a quantity, reference, user, and timestamp. This makes discrepancies traceable and the numbers auditable.

**5. Security enforced in the database.**
Permissions are implemented as Row Level Security policies, not just hidden buttons. Even a modified client cannot read or write data its role does not allow. The frontend adds route guards for usability, but the database is the real security boundary.

**6. Aggregation in SQL.**
Dashboard totals are computed with `SUM`, `COUNT`, and `GROUP BY` in views or RPC functions, with indexes on sale dates and product references, so the dashboard stays fast as data grows.

## Data model

| Table | Purpose |
| --- | --- |
| `inventory_products` | Product catalog: SKU, price, cost, stock quantity, reorder level |
| `inventory_suppliers` | Suppliers, linked to products |
| `inventory_customers` | Customer records (walk-in sales are supported) |
| `inventory_sales` | One row per sale: customer, total, timestamp |
| `inventory_sale_items` | Line items: product, quantity, unit price at time of sale |
| `inventory_stock_movements` | Append-only ledger of stock changes |
| `profiles` | Maps each user to a role |

## Roles and permissions

| Role | Can do |
| --- | --- |
| Owner | Everything, including financial reports and user management |
| Manager | Manage products and suppliers, view reports |
| Staff | Record sales and view products |

## Getting started

### Prerequisites

- Node.js 18 or newer
- A Supabase project

### Installation

```bash
git clone <repo-url>
cd smartstock
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key>
```

Both values are in the Supabase dashboard under **Project Settings > API**. Never expose the `service_role` key in client code.

### Database setup

Apply the SQL files in `supabase/migrations/` in order, either by pasting them into the Supabase SQL Editor or with the CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

The migrations create the tables, indexes, Row Level Security policies, and the sale function.

### Seed demo data (optional)

```bash
npm run seed
```

This loads sample products, customers, and several weeks of sales so the dashboard has data to display.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, then set your user's `role` to `owner` in the `profiles` table to unlock all features.

### Production build

```bash
npm run build
npm start
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run lint` | Run the linter |

## Deployment

1. Push the repository to GitHub.
2. Import it into Vercel.
3. Add the two environment variables above.
4. In Supabase, add the deployed URL under **Authentication > URL Configuration**.

## Screenshots

<!-- Replace with real screenshots -->

| Dashboard | Record a sale |
| --- | --- |
| _screenshot_ | _screenshot_ |

| Inventory | Stock history |
| --- | --- |
| _screenshot_ | _screenshot_ |

## Possible future improvements

- Purchase orders and supplier restocking workflow
- Barcode scanning at the point of sale
- Low-stock email notifications
- CSV import and export
- Multi-location inventory

## Author

**_Your name_** · [Portfolio](https://example.com) · [LinkedIn](https://linkedin.com) · [GitHub](https://github.com)

## License

MIT
