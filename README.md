# 🚀 TeamFlow

TeamFlow is a **Full-Stack Team Collaboration Platform** built using the **MERN Stack**. It enables Project Leaders to create projects, invite members, assign tasks, monitor progress, and collaborate through a secure role-based dashboard.

---

# 🎯 Problem Statement

Many students work on team projects during college, but coordinating tasks effectively is often challenging. Tasks are usually assigned through WhatsApp messages, spreadsheets, or verbal discussions, making it difficult to track progress, manage responsibilities, and ensure accountability. As a result, project leaders struggle to organize work efficiently, while team members lack a centralized place to view and update their assigned tasks.

TeamFlow was built to solve this problem by providing a centralized collaboration platform where Project Leaders can create projects, invite team members, assign tasks, set priorities and deadlines, and monitor overall progress. Team Members can securely access their assigned tasks and update their status, enabling better collaboration, transparency, and project management.

---
# 📸 Application Preview

---

## 🔐 Register

Create a new Team Leader or Team Member account.

![Register](images/register.png)

---

## 🔑 Login

Secure authentication using JWT.

![Login](images/login.png)

---

# 👑 Team Leader (Admin)

## 📊 Admin Dashboard

Create and manage projects from a centralized dashboard.

![Admin Dashboard](images/admin-dashboard.png)

---

## 📁 Create Project & Invite Members

Create a project and invite team members using their email.

![Create Project & Invite Members](images/invite-member&create-project.png)

---

## ✅ Create & Assign Tasks

Create tasks, assign priorities, dependencies, and due dates.

![Create Task](images/create-task.png)

---

# 👤 Team Member

## 📨 Accept Invitation & Dashboard

Team members can accept invitations and access assigned projects.

![Member Dashboard](images/member-dashboard.png)

---

## 🔄 Task Status Updates

Update task progress from Pending → In Progress → Completed.

![Task Status Updates](images/task-status-updates.png)

---

## 📜 Task Version History

Every task update is stored as a new version for complete change tracking.

![Task Version History](images/task-version-history.png)

# ✨ Features

- 🔐 JWT Authentication & RBAC
- 👥 Team Invitation System
- 📁 Project Management
- ✅ Task Assignment & Status Tracking
- 📜 Activity Timeline
- ♻️ Task Version History
- 🎯 Task Priority & Deadlines
- ☁️ Cloud Deployment (Vercel & Render)

---

# 🛠️ Tech Stack

**Frontend**
- React.js
- Vite
- Tailwind CSS
- Axios

**Backend**
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- bcrypt

**Deployment**
- Vercel
- Render

---

# ⚙️ Installation

```bash
git clone https://github.com/vijaygithub25/TeamFlow-mern.git

cd backend
npm install
npm run dev

cd ../frontend
npm install
npm run dev
```

---

# 🔑 Environment Variables

### Backend

```env
MONGO_URI=
JWT_SECRET=
CLIENT_URL=
```

### Frontend

```env
VITE_API_URL=
```

---

# 🌐 Live Demo

**Frontend:** https://team-flow-mern.vercel.app/

---

# 👨‍💻 Author

**Chippe Vijay**

GitHub: https://github.com/vijaygithub25


---

⭐ If you found this project useful, consider giving it a star!
