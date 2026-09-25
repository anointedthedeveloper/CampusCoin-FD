# Database

CampusCoin uses **MongoDB** (Mongoose) running locally.

- **Connection:** `mongodb://localhost:27017/campuscoin`
- **Database name:** `campuscoin`

## Collections

| Collection | Description |
|---|---|
| `users` | Registered student and admin accounts |
| `transactions` | Income and expense records per user |
| `categories` | Spending categories (default + custom) |
| `budgets` | Monthly budget limits per category |
| `notifications` | In-app alerts and budget warnings |
| `insights` | AI-generated monthly financial summaries |
| `savingtips` | Saving tips shown on the dashboard |
| `bookmarks` | User-saved tips and insights |
| `announcements` | Admin-broadcast messages |

## Browsing the data

**MongoDB Compass** (GUI) — connect to `mongodb://localhost:27017` and open the `campuscoin` database.

**mongosh** (CLI):
```bash
# list all users (without password hashes)
mongosh campuscoin --eval "db.users.find({}, { passwordHash: 0 }).pretty()"

# list all transactions for a specific user
mongosh campuscoin --eval "db.transactions.find({ userId: '<user_id>' }).pretty()"
```

## User schema

```
fullName               String  (required)
email                  String  (required, unique)
passwordHash           String  (bcrypt)
role                   String  student | admin
school                 String
academicYear           String
monthlyAllowanceBaseline  Number
savingsGoalAmount      Number
avatarUrl              String
isActive               Boolean
settings               Object  (currency, thresholds, notification prefs)
createdAt / updatedAt  Date    (auto)
```

Sensitive fields (`passwordHash`, `resetPasswordToken`) are stripped before any API response via `user.toPublic()`.
