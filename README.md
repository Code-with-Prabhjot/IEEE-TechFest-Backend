# IEEE Tech Fest Backend API

This is the central backend REST API powering the IEEE Tech Fest registration, payment, and gate check-in system. Built with Node.js, Express, TypeScript, and SQLite, it is designed to be lightweight, secure, and capable of handling severe traffic spikes on low-memory hardware.

## 🚀 Features & Innovations Added
* **Real QR Code Generation:** Dynamically generates a base64 Data URL QR Code upon registration.
* **Strict Role-Based Access Control:** Secure JWT middleware segregates Students and Volunteers.
* **Zod Input Validation:** Bulletproofs the database against malformed payloads.
* **Comprehensive Edge Case Handling:** Prevents duplicate registrations, double check-ins, and unauthorized payments.

---

## 🛠️ How to Run Locally

**1. Clone the repository and install dependencies:**
\`\`\`bash
npm install
\`\`\`

**2. Configure the Environment:**
Create a `.env` file in the root directory and add a secret key for JWT signing:
\`\`\`env
JWT_SECRET="super-secret-techfest-key-123!"
\`\`\`

**3. Initialize the SQLite Database:**
\`\`\`bash
npx prisma db push
\`\`\`

**4. Start the Development Server:**
\`\`\`bash
npm run dev
\`\`\`
*The server will start on `http://localhost:3000`*

---

## 👮 How to Create a Volunteer Account

To test gate check-in features, you must operate as a Volunteer. 
Send a `POST` request to `/api/auth/register` with the following JSON body:
\`\`\`json
{
  "name": "Gate Guard",
  "email": "guard@techfest.com",
  "password": "securepassword123",
  "role": "VOLUNTEER"
}
\`\`\`
Log in using these credentials at `/api/auth/login` to receive your Volunteer JWT token. Pass this token in the `Authorization: Bearer <token>` header for protected admin endpoints.

---

## 📌 API Documentation

### Authentication
* **POST** `/api/auth/register` - Register a new account (Student or Volunteer).
* **POST** `/api/auth/login` - Authenticate and receive a JWT token.

### Student Endpoints (Requires Auth)
* **POST** `/api/events/register-fest` - Register for the fest and generate a QR Code ticket.
* **GET** `/api/events/my-ticket` - View your generated ticket and payment status.
* **POST** `/api/events/payment/:ticketId` - Simulate a successful ticket payment.

### Volunteer Endpoints (Requires Volunteer Auth)
* **GET** `/api/events/admin/all-tickets` - View all database registrations.
* **POST** `/api/events/admin/checkin/:ticketId` - Scan a ticket to grant gate entry.

---

## 🤔 Assumptions Made
1. **Database constraints:** Assuming a 1 GB RAM limit, SQLite was chosen as the optimal database to minimize background memory consumption.
2. **Payments:** As no payment gateway API keys were provided, the payment process is simulated via a secured REST endpoint that verifies ticket ownership.
3. **Hardware & Traffic:** Assumed the 2,000 req/min spike requires asynchronous write queues to prevent SQLite database locks (Detailed in `SCALE.md`).