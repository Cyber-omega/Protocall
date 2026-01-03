# PROTOCALL: AI Interview Evaluation Platform

**Protocall** is an elite, multimodal AI interview coaching platform designed to bridge the gap between candidate preparation and professional mastery. Leveraging cutting-edge generative AI, Protocall provides a realistic, low-latency environment for mock interviews, offering real-time feedback on both verbal articulation and non-verbal behavioral cues.

---

## 🚀 Key Features

- **Real-time Multimodal Interaction**: Engaging voice-to-voice conversations powered by Gemini Live API, supplemented by constant visual analysis.
- **Visual Cue Feedback**: Subtitle-like, non-intrusive UI updates reflecting the candidate's confidence, eye contact, and posture detected via the camera.
- **Live Transcription**: A "Sync Log" that provides a scrolling, real-time transcript of the conversation for both the interviewer and the candidate.
- **Deep Analytics Engine**: Post-interview reports featuring:
  - **Overall Proficiency Score**: A weighted average of your performance.
  - **Radar Charting**: Visual breakdown of Clarity, Confidence, Communication, and Technical Knowledge.
  - **Growth Vectors**: AI-generated strengths and concrete recommendations for improvement.
- **Customizable Sessions**: Tailor your experience by choosing target roles (Frontend, Lead, etc.), seniority levels, and specific focus clusters like "Leadership" or "System Design."
- **High-End UI/UX**: Sophisticated Glassmorphism design with support for **Dark** and **Light** modes, optimized for focus and professional feel.

---

## 🛠 Tech Stack

Protocall is built with a modern, high-performance web stack:

### **Frontend Framework & Language**
- **[React 19](https://react.dev/)**: Utilizing the latest concurrent rendering features and hooks for a fluid UI.
- **[TypeScript](https://www.typescriptlang.org/)**: Ensuring type-safety across complex AI interaction states and audio/video processing.

### **Artificial Intelligence (Google Gemini)**
- **[@google/genai](https://www.npmjs.com/package/@google/genai)**: The official SDK for high-performance interaction with Google’s GenAI models.
- **Gemini 2.5 Flash Native Audio**: Chosen for its native support for audio streaming, enabling low-latency "Live API" voice conversations.
- **Gemini 3 Pro**: Utilized for its superior reasoning capabilities to generate high-fidelity post-interview evaluation reports.
- **Function Calling**: Used for real-time visual cue updates from the AI to the UI.

### **Styling & Design**
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first styling with a bespoke professional color palette (`p-deep`, `p-gold`, `p-teal`).
- **Glassmorphism**: Advanced CSS `backdrop-filter` techniques for a modern, futuristic dashboard aesthetic.
- **Tailwind Animate**: For smooth transitions and "blob" background animations.

### **Data Visualization**
- **[Recharts](https://recharts.org/)**: For complex, interactive Radar (Spider) charts and horizontal Bar charts in the performance intelligence report.

### **Multimedia & Web APIs**
- **Web Audio API**: Custom implementations for raw PCM (Pulse Code Modulation) audio encoding and decoding for the Live API.
- **MediaDevices API**: For high-resolution microphone and camera stream management.
- **Canvas API**: Used for real-time video frame extraction (1 FPS) to provide visual context to the AI agent.
- **FileReader API**: For efficient conversion of blobs to base64 data strings.

### **Infrastructure & Delivery**
- **[ESM.sh](https://esm.sh/)**: Modern ES Module CDN for serverless, zero-install dependency management.
- **HTML5/CSS3**: Leveraging the latest web standards for performance and accessibility.

---

## 🛠 Setup & Configuration

### Prerequisites
- A modern web browser (Chrome or Edge recommended for optimal MediaDevices support).
- A valid **Google Gemini API Key**.

### Running the Application
1. **API Key Selection**: Upon first launch, click the **"Configure Session Key"** button. This uses the AI Studio secure dialog to select a project with appropriate billing enabled for the Gemini 3 and 2.5 models.
2. **Permissions**: Allow Camera and Microphone access when prompted to enable the multimodal engine.
3. **Initialize**: Use the **"Setup Session"** screen to define your interview parameters.

---

## 🛡 Security & Privacy
Protocall processes audio and video frames in real-time to the Gemini API. No data is stored persistently on any local database; all evaluation logic occurs during the active session and is wiped upon resetting the application, ensuring candidate privacy.

---

## 🏛 Architecture
The application uses **Agent-based reasoning**. The "Protocall Agent" doesn't just respond to text; it perceives the user's state through visual frames and tonality. This multimodal context allows the agent to call internal tools (like `updateVisualFeedback`) to influence the UI dynamically without interrupting the verbal flow of the interview.

---

**Developed by CipherSquad Intelligence Systems**
*Empowering the next generation of industry leaders through AI-driven coaching.*