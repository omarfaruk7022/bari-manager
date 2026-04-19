# BariManager — বাড়ি ভাড়া ব্যবস্থাপনা সিস্টেম

A mobile-first SaaS platform for house rental management in Bangladesh.

---

## 🏗️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Next.js 16 (App Router), JSX, Tailwind CSS, shadcn/ui |
| Backend    | Node.js, Express.js (MVC)           |
| Database   | MongoDB + Mongoose                  |
| Auth       | JWT (stateless)                     |
| Email      | Nodemailer (SMTP)                   |
| Payments   | bKash Tokenized Checkout PGW        |
| Automation | node-cron                           |
| Monorepo   | Turborepo                           |

---

## 📁 Project Structure

```
bari-manager/
├── apps/
│   ├── web/          → Next.js 16 frontend
│   └── api/          → Express.js backend
└── packages/
    └── shared/       → Shared constants
```

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd bari-manager
npm install
```

### 2. Set up environment

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

Edit `apps/api/.env`:
```env
MONGODB_URI=mongodb+srv://omarfaruk7022_db_user:4qAHwXmwUmNUkrWm@cluster0.p2w7eao.mongodb.net/?appName=Cluster0
JWT_SECRET=your_secret_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000
```

Edit `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Create the first admin

```bash
cd apps/api
node scripts/createAdmin.js
```

### 4. Run development

```bash
# From root — starts both frontend and backend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 👥 User Roles

| Role       | Access                                         |
|------------|------------------------------------------------|
| **Admin**  | Approve subscriptions, manage all landlords    |
| **Landlord** | Manage tenants, bills, expenses, reports     |
| **Tenant** | View bills, make payments, read notices        |

---

## 🔑 Login Flow

1. All users share a single `/login` page
2. After login, JWT token stored in `localStorage`
3. Role-based redirect: admin → `/admin/dashboard`, landlord → `/landlord/dashboard`, tenant → `/tenant/dashboard`

---

## 💳 Subscription Flow

```
Landlord fills /subscribe form
        ↓
Admin sees request in /admin/subscriptions
        ↓
Admin clicks "Approve"
        ↓
System auto-creates landlord User account
        ↓
Credentials emailed to landlord
        ↓
Landlord logs in & changes password
```

---

## 🏦 bKash Payment Flow

```
Tenant clicks "bKash দিয়ে পে করুন"
        ↓
POST /api/tenant/payments/bkash/init
        ↓
API calls bKash → gets bkashURL
        ↓
Tenant redirected to bKash payment page
        ↓
bKash redirects to GET /api/webhooks/bkash/callback
        ↓
API executes & verifies payment
        ↓
Bill.paidAmount updated, notification sent
        ↓
Tenant redirected to /tenant/payments?status=success
```

---

## ⚙️ Automation (Cron Jobs)

| Job                 | Schedule            | Action                              |
|---------------------|---------------------|-------------------------------------|
| Bill Generation     | 1st of every month  | Auto-creates rent bills for all active tenants |
| Payment Reminder    | Every day at 10 AM  | Sends reminder for overdue bills    |

---

## 📊 API Endpoints Summary

### Auth
```
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/change-password
```

### Public
```
POST /api/public/subscribe
```

### Admin (requires admin JWT)
```
GET  /api/admin/stats
GET  /api/admin/subscriptions
PUT  /api/admin/subscriptions/:id/approve
PUT  /api/admin/subscriptions/:id/reject
GET  /api/admin/landlords
PUT  /api/admin/landlords/:id/toggle
```

### Landlord (requires landlord JWT)
```
GET/POST        /api/landlord/properties
PUT/DELETE      /api/landlord/properties/:id
GET/POST        /api/landlord/tenants
GET/PUT/DELETE  /api/landlord/tenants/:id
GET/POST        /api/landlord/bills
GET/PUT/DELETE  /api/landlord/bills/:id
POST            /api/landlord/bills/bulk-generate
GET/POST        /api/landlord/expenses
PUT/DELETE      /api/landlord/expenses/:id
POST            /api/landlord/expenses/:id/split
GET             /api/landlord/payments
POST            /api/landlord/payments/cash
GET             /api/landlord/reports/monthly
GET             /api/landlord/reports/yearly
POST            /api/landlord/notices
```

### Tenant (requires tenant JWT)
```
GET  /api/tenant/bills
GET  /api/tenant/bills/:id
GET  /api/tenant/payments
POST /api/tenant/payments/bkash/init
```

### Notifications (any authenticated user)
```
GET /api/notifications
PUT /api/notifications/mark-read
```

### Webhooks (public)
```
GET /api/webhooks/bkash/callback
```

---

## 🌐 Frontend Pages

| Path | Role | Description |
|------|------|-------------|
| `/login` | All | Single login page |
| `/subscribe` | Public | Subscription application |
| `/admin/dashboard` | Admin | Stats overview |
| `/admin/subscriptions` | Admin | Approve/reject requests |
| `/admin/landlords` | Admin | Manage landlords |
| `/landlord/dashboard` | Landlord | Monthly summary |
| `/landlord/tenants` | Landlord | List & add tenants |
| `/landlord/bills` | Landlord | Bills management |
| `/landlord/expenses` | Landlord | Track expenses |
| `/landlord/reports` | Landlord | Income/profit charts |
| `/landlord/notices` | Landlord | Send notices |
| `/tenant/dashboard` | Tenant | Overview |
| `/tenant/bills` | Tenant | View bills |
| `/tenant/payments` | Tenant | Payment history |
| `/tenant/notices` | Tenant | Notifications |

---

## 🔒 Security Notes

- All passwords hashed with bcrypt (10 rounds)
- JWT expires in 7 days
- Rate limiting: 200 requests per 15 minutes
- Helmet.js security headers
- All landlord routes enforce `req.user._id` filtering — landlords can only see their own data
- Tenants can only see their own bills

---

## 📱 Mobile-First Design

- Bottom navigation bar for all roles
- Large buttons (min 44px touch targets)
- 16px minimum font size for inputs
- Cards with ample padding
- Bangla-first UI text

---

## 🗄️ Database Models

- `User` — admin, landlord, tenant accounts
- `Subscription` — landlord subscription requests
- `LandlordProfile` — extended landlord info
- `Property` — units/rooms/flats
- `Tenant` — tenant records
- `Bill` — monthly bills with line items
- `Payment` — payment records (bKash + cash)
- `Expense` — shared building expenses
- `Notification` — in-app + email notifications
