# Code Challenge App

## Table of Contents

1. [Introduction](#introduction)
2. [Screenshot](#screenshot)
3. [Technologies & Frameworks](#technologies--frameworks)
4. [Installation & Setup](#installation--setup)
5. [Login Credentials](#login-credentials)
6. [Available NPM Commands](#available-npm-commands)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

The **Code Challenge App** is an educational platform designed to help people learn programming in a challenging and engaging way. This application was developed as a school project with the goal of learning how to build modern web applications using React and Vite.

### Main Functionalities

- **Interactive Coding Challenges**: Solve programming exercises that test and improve your coding skills
- **User Authentication**: Secure login system to track your progress
- **Challenge Management**: Browse and attempt various coding challenges
- **Real-time Feedback**: Get immediate feedback on your solutions

---

## Screenshot

![Code Challenge App Screenshot](./screenshot.png)

---

## Technologies & Frameworks

This application is built using the following technologies:

- **React** - JavaScript library for building user interfaces
- **Vite** - Next-generation frontend build tool for fast development
- **React Router** - Declarative routing for React applications
- **HTML/CSS/JavaScript** - Core web technologies
- **NOVI API** - Backend API for challenge data and user management

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18.0 or higher)
- **npm** (comes with Node.js)

Verify your installation:

```bash
node --version
npm --version
```

---

## Installation & Setup

Follow these steps to set up and run the project locally:

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd code-challenge-app
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory of the project and add the following configuration:

```env
VITE_NOVI_BASE_URL=https://novi-backend-api-wgsgz.ondigitalocean.app
VITE_NOVI_PROJECT_ID=50d4daff-6da7-4edd-b1c5-3f53d61e6b11
```

**Important:** This `.env` file is already configured with the necessary API credentials. You do NOT need to create your own API key. Simply copy the configuration above.

### Step 4: Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

---

## Login Credentials

The application comes with pre-configured test accounts. Use the following credentials to log in:

**Admin Account:**
- **Email:** `admin@codechallenge.nl`
- **Password:** `admin123`

---

## Available NPM Commands

The following npm commands are available in this application:

| Command           | Description                                                                                                            |
|-------------------|------------------------------------------------------------------------------------------------------------------------|
| `npm run dev`     | Starts the development server with hot module replacement (HMR). The app will be available at `http://localhost:5173/` |
| `npm run build`   | Creates an optimized production build in the `dist/` folder                                                            |
| `npm run lint`    | Checks the code quality                                                                                                |
| `npm run preview` | Previews the production build locally before deployment                                                                |

### Usage Examples

**Development:**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm run preview
```

---

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically select the next available port. Check the terminal output for the correct URL.

### Environment Variables Not Loading

Make sure your `.env` file is in the root directory (same level as `package.json`) and that all variable names start with `VITE_`.

### Clear Cache

If you encounter unexpected issues, try clearing the Vite cache:

```bash
rm -rf node_modules/.vite
npm run dev
```

### API Connection Issues

Ensure that:
1. Your `.env` file contains the correct NOVI API credentials
2. You have an active internet connection
3. The NOVI API service is online

---

## Core Project Structure

```
├── src/
│   ├── api/             # Communication with remote services
│   ├── assets/          # Static assets (images, styles, etc.)
│   ├── auth/            # Authorization
│   ├── components/      # Reusable React components
│   ├── data/            # Data for initial import (NOVI API)
│   ├── pages/           # Page components
│   ├── utils/           # Helper classes and functions
│   ├── App.jsx          # Main App component
│   └── main.jsx         # Application entry point
├── public/              # Public static files
├── .env                 # Environment variables (API configuration)
├── index.html           # HTML template
├── package.json         # Project dependencies and scripts
└── vite.config.js       # Vite configuration
```

---

## Learn More

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)

---

## License

This project was created for educational purposes as part of a school assignment.
