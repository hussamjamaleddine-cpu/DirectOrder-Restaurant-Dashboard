# DirectOrder - Modern Restaurant Management System

**A professional, modern restaurant management dashboard built with React 19 + Tailwind CSS 4 + shadcn/ui**

![DirectOrder](https://img.shields.io/badge/Version-1.1.0-emerald?style=flat-square)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## Overview

DirectOrder is a complete restaurant management system designed for modern restaurants. It provides a comprehensive suite of tools for managing orders, menus, customers, and business analytics—all with a beautiful, intuitive interface optimized for fast-paced restaurant environments.

**Key Features:**
- 🔐 **Secure Role-Based Access** (Owner, Manager, Staff)
- 📊 **Real-Time Analytics Dashboard**
- 🧾 **Complete Order Management System**
- 📋 **Menu Management with Inventory Tracking**
- 🛒 **Point-of-Sale (POS) System**
- 🚚 **Advanced Delivery Tracking** (Staff & Third-Party)
- 💰 **Automated VAT Calculation**
- 👥 **Customer Database & Analytics**
- ⚙️ **Restaurant Settings & Configuration**
- 💬 **WhatsApp Integration**
- 🖨️ **Order Printing**
- 📱 **Fully Responsive Design**

---

## Project Structure Map

```text
DirectOrder/
├── client/                      # Frontend Application
│   ├── src/                     # Source Code
│   │   ├── pages/               # Page Components
│   │   │   ├── Login.tsx        # Authentication Page
│   │   │   ├── Dashboard.tsx    # Main Analytics Overview
│   │   │   ├── Orders.tsx       # Order Management & History
│   │   │   ├── Menu.tsx         # Menu & Inventory Management
│   │   │   ├── POS.tsx          # Point of Sale Interface
│   │   │   ├── Customers.tsx    # Customer CRM & Analytics
│   │   │   ├── Settings.tsx     # System Configuration
│   │   │   ├── KDS.tsx          # Kitchen Display System
│   │   │   ├── Staff.tsx        # Staff & Shift Management
│   │   │   ├── Loyalty.tsx      # Loyalty Program Management
│   │   │   ├── Analytics.tsx    # Detailed Business Reports
│   │   │   ├── DeliveryTracking.tsx # Real-time Delivery Tracking
│   │   │   └── CustomerOrder.tsx # Public Ordering Interface
│   │   ├── components/          # Reusable UI Components
│   │   │   ├── DashboardLayout.tsx # Main App Shell
│   │   │   └── ui/              # shadcn/ui Base Components
│   │   ├── contexts/            # React Contexts (Auth, Theme)
│   │   ├── lib/                 # Core Logic & Data Store
│   │   │   └── store.ts         # Central Data Management
│   │   ├── App.tsx              # Main Routing & App Entry
│   │   └── main.tsx             # React DOM Mounting
│   ├── public/                  # Static Assets
│   └── index.html               # HTML Template
├── server/                      # Backend API (Optional/Future)
│   └── index.ts                 # Server Entry Point
├── shared/                      # Shared Types & Constants
├── DEPLOYMENT_GUIDE.md          # Detailed Deployment Instructions
├── package.json                 # Project Dependencies & Scripts
└── vite.config.ts               # Vite Configuration
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/hussamjamaleddine-cpu/DirectOrder-Restaurant-Dashboard.git
cd DirectOrder-Restaurant-Dashboard

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`

### Demo Credentials

| Role | PIN | Permissions |
|------|-----|-------------|
| 👑 Owner | `1111` | Full access to all features |
| 👨‍💼 Manager | `2222` | Orders, POS, Menu, Customers |
| 👨‍🍳 Staff | `3333` | Orders & POS only |

---

## Core Features

### 1. Point-of-Sale (POS) & VAT
Modern POS interface with automated financial calculations:
- **VAT Calculation:** Automatically applies VAT (configurable in settings) to all orders.
- **Financial Persistence:** Stores subtotal, VAT amount, and final total for accurate reporting.
- **Quick Selection:** Item selection by category with variant and add-on support.

### 2. Delivery System
Comprehensive delivery management:
- **Staff Delivery:** Assign orders to internal delivery staff.
- **Third-Party Integration:** Support for external delivery companies (e.g., Toters, Zomato).
- **Address Capture:** Dedicated fields for delivery addresses and contact info.
- **Real-time Tracking:** Monitor delivery status from pending to delivered.

### 3. Dashboard & Analytics
Real-time business metrics including:
- Daily revenue (USD & LBP) with VAT breakdown.
- Order volume and customer growth tracking.
- Weekly projections and peak hour analysis.

### 4. Orders Management
Complete order lifecycle management:
- Status tracking (New → Confirmed → Ready → Delivered).
- Print order receipts and WhatsApp notifications.
- Detailed order history with financial breakdown.

---

## Technology Stack
- **Frontend:** React 19 with TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui
- **State Management:** Custom Store with LocalStorage Persistence
- **Routing:** Wouter
- **Notifications:** Sonner

---

## Data Storage

DirectOrder uses **browser localStorage** for data persistence. This means:
- ✅ All data is stored locally on the user's device
- ✅ No server required for basic functionality
- ✅ Works offline (with limitations)
- ⚠️ Data is lost if browser cache is cleared
- ⚠️ Not suitable for production without backend integration

---

## Security Considerations

### Current Implementation
- ✅ Role-based access control (Owner/Manager/Staff)
- ✅ PIN-based authentication
- ✅ XSS protection through proper data handling
- ✅ TypeScript for type safety

### Production Recommendations
- 🔒 Implement proper backend authentication (JWT, OAuth)
- 🔒 Hash PINs using bcrypt or similar
- 🔒 Use HTTPS for all communications
- 🔒 Implement database for persistent storage

---

## License

MIT License - feel free to use DirectOrder for your restaurant!

---

**DirectOrder © 2026 - Professional Restaurant Management System**
