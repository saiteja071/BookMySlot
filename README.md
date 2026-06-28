# BookMySlot

BookMySlot is a capacity-based ticket booking system for events, built to demonstrate relational database design and transaction-safe booking logic. Organizers create events with a fixed ticket capacity, and users book tickets against that capacity through an in-app wallet system instead of a real payment gateway.

The application is built with Node.js and Express on the backend, using raw SQL queries against MySQL (no ORM) so that schema design, joins, and transactions stay explicit. The core booking flow uses row-level locking to prevent overselling when multiple users book the same event at the same time.

## Features

* User signup as either a buyer (`user`) or event organizer (`organizer`)
* JWT-based authentication on every route except register/login
* Organizers can create events with a price per ticket and total capacity
* Organizers can update event capacity (cannot drop below tickets already sold)
* Organizers can delete an event, which cancels and refunds any active bookings
* Users can book a quantity of tickets, paid for instantly through their wallet balance
* Concurrency-safe booking — prevents two users from overselling the same event
* Wallet system: deposit, withdraw, and automatic balance transfer between buyer and organizer on each booking/cancellation
* Full wallet transaction history (deposits, withdrawals, payments, refunds, organizer earnings, organizer payouts)
* Users can cancel a booking, which refunds the buyer and reverses the organizer's earning

## Booking Flow

* **Available capacity** decreases when a booking is made, increases when a booking is cancelled
* Booking is wrapped in a single SQL transaction: lock the event row, check capacity, deduct buyer's balance, credit organizer's balance, insert the booking, update capacity all committed together or rolled back together
* Cancelling a paid booking refunds the buyer and debits the organizer by the same amount
* Deleting an event cancels and refunds every active booking on it

## Tech Stack

**Frontend**

* React (Vite)
* Material UI
* CSS

**Backend**

* Node.js
* Express

**Database**

* MySQL (`mysql2`, raw parameterized SQL, no ORM)

**Other Tools**

* JWT (authentication)
* bcryptjs (password hashing)

## Database Schema

* `users` — name, email, password hash, role, wallet balance
* `events` — title, venue, date/time, price, total capacity, available capacity, organizer reference
* `bookings` — user reference, event reference, quantity, total amount, payment status, booking status
* `wallet_transactions` — user reference, type, amount, balance after, related booking reference

## Running the Project Locally

### Backend

```
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```
PORT=5000
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_SSL= # true | relaxed | leave unset for local MySQL with no SSL
```

Start the server:

```
node server.js
```

Tables are created automatically on first startup.

### Frontend

```
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```
VITE_API_URL= # deployed backend url/api
```

Start the development server:

```
npm run dev
```