# 🏥 Smart AI Healthcare Kiosk for Rural India (SIH)

> **Empowering Rural Healthcare with AI-Driven Diagnostics, Telemedicine, and Automated Medicine Dispensing.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](https://reactjs.org/)
[![Express.js](https://img.shields.io/badge/Express-v4-lightgrey.svg)](https://expressjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-black.svg)](https://socket.io/)

---

## 📌 Overview

The **Smart AI Healthcare Kiosk for Rural India** is an end-to-end healthcare platform designed to bridge the healthcare divide in remote and rural villages across India. Built for the **Smart India Hackathon (SIH)**, the solution combines physical-digital kiosk automation, facial recognition, AI-assisted preliminary triage, real-time WebRTC tele-consultations with certified doctors, and automated medicine dispensing.

---

## 💡 Key Features

### 💻 1. Village Kiosk Portal (`apps/kiosk-portal`)
- **Facial Recognition Login**: Frictionless, biometric face-scanning identification tailored for low-literacy rural populations.
- **AI-Powered Symptom Checker & Triage**: Interactive multi-lingual symptom assessment driven by Generative AI (Gemini Provider API).
- **Smart Queue & Waiting Room**: Live queue position updates and real-time status notifications.
- **WebRTC Video Consultation**: High-definition, low-latency video calling directly from kiosk to doctor.
- **Real-Time In-Call Chat**: Synchronous text messaging with dedicated consultation room isolation.
- **Automated Medicine Dispenser**: Automated physical/simulated medicine release based on verified digital prescriptions.
- **Patient Reviews**: Immediate feedback collection post-consultation to maintain healthcare quality standards.

### 🩺 2. Doctor Tele-Health Portal (`apps/doctor-portal`)
- **Patient Queue Dashboard**: Real-time view of awaiting patients across rural kiosk locations.
- **AI Triage Briefing**: Instant summary of patient symptoms, vital signs, and preliminary AI severity scoring.
- **Integrated Consultation Room**: HD video calling, live chat, and patient history viewing on a single unified screen.
- **Digital Prescriptions**: Rapid prescription writing with automatic linking to kiosk dispensers and delivery tracking.
- **Medicine Cart Push & Dispense Control**: Direct remote authorization for dispensing medications at the kiosk.

### 📱 3. Patient & Family Web Portal (`apps/patient-portal`)
- **Digital Health Passport**: Access past consultation records, digital prescriptions, and medical history anytime.
- **Live Consultation Access**: Join active tele-health sessions or chat with consulting doctors.
- **Medicine Delivery & Restock Tracking**: Track medicine orders, request refills, and monitor delivery status.

### ⚙️ 4. Backend & Real-Time Engine (`server`)
- **Real-Time Socket.IO Infrastructure**: Room-isolated live chat, queue synchronization, and WebRTC signaling.
- **AI Provider Service**: Modular LLM integration supporting Google Gemini API for intelligent medical triage.
- **Prisma & Relational Database**: Structured storage for patient profiles, medical logs, doctor shifts, and medicine inventory.

---

## 🏗️ System Architecture

```
                                  +-----------------------+
                                  |    Doctor Portal      |
                                  | (React / WebRTC / WS) |
                                  +-----------+-----------+
                                              |
                                              v
+-----------------------+         +-----------+-----------+         +-----------------------+
|     Kiosk Portal      | <-----> |   Express / Socket.IO | <-----> |    Patient Portal     |
| (Face Scan / Dispense)|         |     Backend Server    |         | (Records / Delivery)  |
+-----------------------+         +-----------+-----------+         +-----------------------+
                                              |
                                  +-----------+-----------+
                                  |  AI Triage & Database |
                                  | (Gemini AI / Prisma)  |
                                  +-----------------------+
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Tailwind CSS / Custom Modern UI, WebRTC APIs, Socket.IO Client, Face API
- **Backend**: Node.js, Express.js, Socket.IO Server, Prisma ORM, SQLite / PostgreSQL
- **AI & ML**: Google Gemini API, Custom Medical Triage Prompting Engine, Web Camera Face Detection
- **Monorepo Management**: npm workspaces

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/varshilvasoya11/SIH-Project.git
cd SIH-Project
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env` in the project root and configure your credentials:
```bash
cp .env.example .env
```
Key variables:
- `PORT`: Server port (default: `5000`)
- `GEMINI_API_KEY`: API key for AI symptom triage engine
- `DATABASE_URL`: Database connection string

### 4. Database Setup
```bash
npm run db:migrate
npm run db:seed
```

### 5. Run Development Servers
Start all applications concurrently (Server, Doctor Portal, Patient Portal, Kiosk Portal):
```bash
npm run dev
```

Port Allocation:
- **Server API & Websockets**: `http://localhost:5000`
- **Kiosk Portal**: `http://localhost:5173`
- **Doctor Portal**: `http://localhost:5174`
- **Patient Portal**: `http://localhost:5175`

---

## 📂 Project Structure

```
.
├── apps/
│   ├── doctor-portal/     # React portal for doctors to view queue, consult & prescribe
│   ├── kiosk-portal/      # Physical kiosk interface (Face scan, AI triage, dispenser)
│   └── patient-portal/    # Mobile-first web app for patient health records & delivery
├── server/                # Express API backend, Socket.IO gateway, AI triage service
├── shared/                # Shared types, constants, and utilities across workspaces
├── package.json           # Monorepo configuration & workspace npm scripts
└── README.md              # Project documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

Developed with ❤️ for **Smart India Hackathon (SIH)**.
