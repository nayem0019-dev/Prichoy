# Prichoy ERP Backend — cPanel Deployment Guide

## Prerequisites
- cPanel hosting with **Node.js App** support (most modern shared/VPS cPanel plans)
- **MySQL/MariaDB database** created via cPanel → MySQL Databases
- Node.js 18.x or 20.x available in cPanel

## Step 1 — Upload Files
Upload the entire `backend/` folder to your cPanel account, e.g.:
```
/home/yourusername/prichoy-project/backend/
```
Via Git (`cPanel → Git Version Control`) or File Manager / FTP.

## Step 2 — Create MySQL Database
1. cPanel → MySQL Databases
2. Create a database, e.g. `yourusername_prichoy`
3. Create a database user with a strong password
4. Add the user to the database with **All Privileges**

## Step 3 — Configure Environment
Copy `.env.example` to `.env` and fill in:
```
DATABASE_URL="mysql://DB_USER:DB_PASS@localhost:3306/DB_NAME"
JWT_SECRET="<generate a random 32+ character string>"
JWT_REFRESH_SECRET="<generate a different random 32+ character string>"
FRONTEND_URL="https://www.yourstore.com"
ADMIN_URL="https://admin.yourstore.com"
```

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Step 4 — Setup Node.js App in cPanel
1. cPanel → **Setup Node.js App** → Create Application
2. **Node.js version**: 18.x or 20.x (latest available)
3. **Application mode**: Production
4. **Application root**: `prichoy-project/backend`
5. **Application URL**: `api.yourstore.com` (create this subdomain first, pointed to
   the backend folder, via cPanel → Subdomains)
6. **Application startup file**: `passenger_app.js`
7. Click **Create**

## Step 5 — Install Dependencies & Build
In the cPanel Node.js App interface, click **"Run NPM Install"**.

Then open **Terminal** (cPanel → Terminal) or SSH in, and activate the app's
virtual environment (cPanel shows the exact command on the app's page, e.g.):
```bash
source /home/yourusername/nodevenv/prichoy-project/backend/20/bin/activate
cd /home/yourusername/prichoy-project/backend
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed   # Creates the first Super Admin login
```

## Step 6 — Restart
Back in cPanel → Setup Node.js App → click **Restart** on your application.

## Step 7 — Verify
Visit: `https://api.yourstore.com/api/health`
You should see:
```json
{ "status": "ok", "timestamp": "...", "environment": "production" }
```

## Step 8 — First Login
```
Email:    admin@prichoy.com
Password: Admin@123456
```
**Change this password immediately** via the Admin Dashboard → Profile.

## Updating the App Later
```bash
git pull                    # or re-upload changed files
npm install                 # if package.json changed
npm run build
npm run db:migrate          # if schema.prisma changed
```
Then click **Restart** in cPanel's Node.js App interface.

## Notes
- Logs are written to `backend/logs/` — check `error.log` if something breaks.
- Uploaded product images are stored in `backend/uploads/` — ensure this folder
  has write permission (755) and consider adding it to your backup routine.
- The `.htaccess` file is only needed if your subdomain document root is NOT
  automatically wired to Passenger by cPanel (most modern cPanel versions handle
  this automatically once you create the Node.js App — check first).
