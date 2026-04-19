# Unbiased AI Decision - Frontend

Welcome to the frontend application for **Unbiased AI Decision**, a responsible AI auditing platform designed for the Google Solution Challenge 2026.

## Overview
This platform allows non-technical users to upload datasets and identify demographic bias using robust fairness metrics in minutes.

### 🛠️ Tech Stack
- React.js (Vite)
- Tailwind CSS
- Recharts (Data Visualization)
- Lucide React (Icons)
- Firebase (Authentication)

### 🚀 Setup Instructions for First-Year Students
If you've just downloaded this project, follow these steps to run it on your own computer!

**Prerequisites:** You need to have Node.js installed on your computer.

1. **Open the Terminal**
   Open Visual Studio Code, go to the top menu, and select `Terminal -> New Terminal`.

2. **Install Dependencies**
   Run the following command to install all the required libraries:
   ```bash
   npm install
   ```

3. **Configure Environment**
   There is a file called `.env` (it acts as a template). 
   Right now, the app runs in **Demo Mode** using the dummy data in `src/data/mockData.js`. If you want to connect it to real Firebase, rename `.env` to `.env.local` and add your API keys. Otherwise, just proceed!

4. **Start the App**
   Run this command to start your development server:
   ```bash
   npm run dev
   ```

5. **View it in your Browser**
   Click the link that appears in the terminal (usually `http://localhost:5173/`) to see your amazing new web app!

---
*Built with ❤️ for Google Solution Challenge 2026.*
