# my-offline-app: An Offline-First PWA with CRDT

This project is a **Proof of Concept (PoC)** to evaluate the feasibility of building an offline-first web application.  
It leverages a **Progressive Web App (PWA)** architecture with **Automerge**, a Conflict-free Replicated Data Type (CRDT) library, to achieve seamless data synchronization between the client and a SQL database.

---

## Project Architecture

The application is composed of two primary components:

### 1. Frontend (`frontend`)
- Built with **Vue.js** and **Quasar Framework**  
- Provides the user interface and offline functionality via:
  - **Service Worker**
  - Local data storage using **Automerge** and **localforage**

### 2. Backend (`backend`)
- Built with **Node.js** and **Express**  
- Acts as a synchronization hub:
  - Receives Automerge documents from the client
  - Merges them with the server's state
  - Persists the final data to a **SQL Server database**

---

## Getting Started

### 1. Database Configuration
- Ensure you have a **SQL Server instance** running.
- The `EmployeeID` column in the `PWA_Offline_poc` table must be configured as an **auto-incrementing primary key**:  
  ```sql
  IDENTITY(1,1)
  ```

- Create a `.env` file in the `backend` directory to store your database credentials:
  ```env
  DB_USER=
  DB_PASSWORD=
  DB_SERVER=
  DB_PORT=
  DB_DATABASE=
  ```

---

### 2. Install Dependencies

Navigate to each project directory and install the required dependencies.

```bash
# In the frontend directory
cd frontend
npm install

# In the backend directory
cd backend
npm install
```

---

### 3. Run the Application

Start both the backend and frontend servers in separate terminal windows.

```bash
# Start the backend server
cd backend
node index.js
```

```bash
# Start the frontend application
cd frontend
quasar dev
```

---

## Development Scripts

The project includes standard scripts for common development tasks:

- **Linting files**
  ```bash
  npm run lint
  ```

- **Formatting files**
  ```bash
  npm run format
  ```

---

## Building for Production

To build a production-ready version of the frontend application:

```bash
cd frontend
quasar build
```

- The output will be generated in the `dist/spa` directory.
- For detailed configuration options, please refer to the [Quasar documentation](https://quasar.dev/).