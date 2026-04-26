# ⚖️ FairLens AI
> **AI Bias Detection & Mitigation Platform**

Welcome to **FairLens AI**, an enterprise-grade, privacy-first platform engineered to detect, visualize, and autonomously mitigate demographic bias in predictive AI models. 

Designed for the **Google Solution Challenge 2026**, this platform empowers data scientists, compliance officers, and non-technical stakeholders to ensure their models comply with strict regulatory frameworks like the **EU AI Act** and **EEOC Guidelines**.

---

## 🌟 Key Features

### 🔍 1. Comprehensive Algorithmic Auditing
We evaluate your datasets and model predictions against **6 industry-standard fairness metrics**:
- **Disparate Impact Ratio (DIR)** (Legal 4/5ths Rule)
- **Demographic Parity Discrepancy**
- **Equal Opportunity Variance**
- **Equalized Odds Difference**
- **Predictive Parity (Precision)**
- **Average Odds Difference**

### 🛡️ 2. Autonomous Debiasing Engine (Python FastAPI)
The core backend engine utilizes advanced scientific computing (built on `AIF360` and `Fairlearn`) to autonomously mitigate detected bias:
- **Proxy Detection:** Automatically identifies hidden secondary features (e.g., zip code) that correlate highly with sensitive attributes (e.g., race).
- **Adversarial Mitigation:** Offers in-platform "Algorithm Reforging" to produce mathematically debiased datasets ready for safe re-training.
- **SHAP-based Attribution:** Visualizes exactly which columns are driving the algorithmic bias.

### 🧠 3. Executive AI Insights (Powered by Google Gemini)
Complex statistical telemetry is passed to **Vertex AI / Gemini 1.5 Flash**, which generates instant, highly readable executive summaries. It translates raw bias metrics into plain-English business risks and actionable compliance steps.

### 🚀 4. High-Performance Utilitarian UI
The entire frontend is built with a strictly minimalist, "student-built" engineering aesthetic. 
- **Zero bloat:** No unnecessary animations, glows, or framer-motion overhead.
- **Dark Slate Design System:** High-contrast, mathematically precise dashboard grids optimized for heavy data visualization.

---

## 🛠️ Tech Stack

### Frontend
- **React.js (Vite)**
- **Tailwind CSS** (Minimalist Dark Theme)
- **Recharts** (Data Visualization)
- **Firebase** (Secure Authentication & Audit History)
- **Google Gemini API** (AI Insights)

### Backend Engine
- **FastAPI (Python)**
- **Pandas & NumPy**
- **AIF360, Fairlearn, inFairness** (Bias Detection & Mitigation)
- **SHAP** (Feature Attribution)

---

## 🚀 Getting Started

### 1. Start the Backend (Fairness Engine)
The Python backend performs the heavy mathematical lifting for the debiasing engine.
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*(The backend runs locally on `http://localhost:8000`)*

### 2. Configure Environment Variables
In the root directory, create a `.env.local` file:
```env
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Start the Frontend
In a new terminal window, return to the root folder:
```bash
npm install
npm run dev
```
*(The frontend runs locally on `http://localhost:5174` or `5173`)*

---
*Engineered for Compliance. Built for the Future.* 
**Google Solution Challenge 2026**
