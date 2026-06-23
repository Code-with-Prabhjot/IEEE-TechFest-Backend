# Handling the 6:00 PM Traffic Spike

**Scenario:** 2,000 students hitting the registration endpoint in 60 seconds on a 1 GB RAM server.

### The Bottleneck
Since the application uses **SQLite**, the primary bottleneck is database locking. SQLite only allows one concurrent write operation. If 2,000 requests attempt to execute `prisma.ticket.create()` simultaneously, the database will lock, connection pools will exhaust, and the server will crash from memory overload.

### The Concrete Strategy: Asynchronous Write Queue + WAL Mode

To keep the server stable under 1 GB of RAM, I would implement a **Queue-Based Architecture** paired with **Database Optimization**:

**1. Enable SQLite WAL (Write-Ahead Logging) Mode**
First, I would configure SQLite to use WAL mode. This allows simultaneous readers and a writer, drastically reducing database lock contention and speeding up I/O operations without using extra RAM.

**2. Implement an In-Memory Request Queue**
Instead of writing to the database synchronously during the HTTP request lifecycle, the `/register-fest` endpoint will:
* Accept the request and validate the payload via Zod.
* Push the validated registration data into an in-memory queue (like a BullMQ queue or a simple asynchronous JavaScript array queue).
* Immediately return a `202 Accepted` response to the user: *"Your registration is in queue. Please check your email in 2 minutes for your ticket."*

**3. Background Processing**
A background worker will process this queue sequentially. It will pop requests off the queue and write them to the SQLite database one by one (or in small batches of 50). 

**Why this works on 1 GB RAM:**
By decoupling the HTTP request from the Database Write, the Express server immediately frees up memory and closes the connection. The server smoothly accepts all 2,000 requests without ever forcing the database to handle concurrent writes, completely eliminating the risk of a crash.