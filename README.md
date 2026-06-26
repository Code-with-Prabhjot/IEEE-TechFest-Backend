# IEEE Tech Fest Central Backend & Registration System ⚡

This repository contains the central backend API and an integrated full-stack Single Page Application (SPA) powering the IEEE Tech Fest event. It handles everything from student sign-ups and simulated payment validations to secure QR-code gate check-ins.

> **🌐 Live Production Deployment:** > You can test the fully functional live application here: **https://nexus-backend-acmg.onrender.com**

---

## 🚀 Innovations & Edge Cases Handled

While the core requirement was an API-only architecture, I opted to build and deploy a fully functional SPA frontend alongside it. This demonstrates end-to-end viability, real-world JWT handling on the client side, and instant UI state management without page reloads.

* **Strict Role-Based Access Control:** Secure JWT middleware segregates `Student` and `Volunteer` capabilities.
* **Real QR Code Generation:** Dynamically generates a base64 Data URL QR Code upon successful registration and payment.
* **Double Check-In Protection:** The scanning endpoint instantly rejects previously scanned QR codes to prevent ticket sharing.
* **No-SQL-Injection Validation:** All inputs are strictly sanitized before hitting the database.

---

## 💻 How to Run Locally

If you prefer to test the backend locally rather than using the live link, follow these exact commands:

1. **Clone the repository:**
   \`\`\`bash
   git clone **https://github.com/Code-with-Prabhjot/IEEE-TechFest-Backend.git**
   \`\`\`
2. **Install all dependencies:**
   \`\`\`bash
   npm install
   \`\`\`
3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following:
   \`\`\`env
   PORT=10000
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=super_secret_jwt_key
   VOLUNTEER_MASTER_KEY=ieee_admin_override_2026
   \`\`\`
4. **Push the database schema:**
   \`\`\`bash
   npx prisma db push
   \`\`\`
5. **Start the server:**
   \`\`\`bash
   npm run dev
   \`\`\`

---

## 👮 How to Create a Volunteer Account (Gate Security)

To test gate check-in features, you must operate as a Volunteer. To prevent regular students from registering as volunteers, the API requires a master key.

Send a `POST` request to `/api/auth/register` with this JSON body:

\`\`\`json
{
  "name": "Gate Guard",
  "email": "guard@techfest.com",
  "password": "securepassword123",
  "role": "VOLUNTEER",
  "adminKey": "ieee_admin_override_2026"
}
\`\`\`

Once registered, log in at `/api/auth/login` to receive your Volunteer JWT token. Pass this token in the `Authorization: Bearer <token>` header to access protected admin routes.

---

## 📌 API Documentation

The complete documentation of all endpoints, including paths, HTTP methods, request parameters, and response formats, is available in the attached Postman Collection. 

* **Auth:** `POST /api/auth/register`, `POST /api/auth/login`
* **Student:** `POST /api/events/register-fest`, `GET /api/events/my-ticket`, `POST /api/events/payment/:ticketId`
* **Volunteer:** `GET /api/events/admin/all-tickets`, `POST /api/events/admin/checkin/:ticketId`

**Postman Collection: I have included the EEE_Tech_Fest_Collection.json file directly in this repository. Simply open Postman, click "Import", and drag and drop this file to instantly test all API routes.**

---

## 🤔 Engineering Assumptions

1. **Database Architecture:** PostgreSQL was selected over SQLite to handle high concurrent read/writes and prevent database locking during peak registration spikes.
2. **Payments:** As live payment gateway credentials were not provided, the transaction flow is simulated via a secured REST endpoint that strictly validates JWT ownership before marking the ticket as `COMPLETED` and generating the gate pass.
3. **Traffic Load:** The system architecture assumes a peak load of 2,000 requests per minute. Read the included `SCALE.md` file for my specific strategy on keeping the server stable during this 60-second spike.