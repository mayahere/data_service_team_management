# Task Management System - Requirements Document

## Project Overview

A comprehensive task management system designed for Data Managers to track multiple concurrent data provision projects across different platforms. The system replaces manual weekly reporting with a centralized tool enabling real-time progress monitoring across three user roles: Operator, Leader, and Manager.

---

## 1. Functional Requirements

### 1.1 Core Entities Management

#### 1.1.1 Project Management (UC-01)
**Primary Actor:** Manager

**Capabilities:**
- Create, Read, Update, Delete (CRUD) operations for projects
- Assign Leaders to projects
- View project overview and status
- Delete projects only when no open tasks exist

**Data Fields:**
- Project code, name, description
- Start date, end date
- Leader assignment
- Project status

#### 1.1.2 Task Management (UC-02)
**Primary Actor:** Leader

**Capabilities:**
- Create, Read, Update, Delete tasks within assigned projects
- Assign Operators to tasks
- Track task progress across team members
- Delete tasks only in "Not Started" status

**Data Fields:**
- Task title, description, URL
- Status, type, priority
- Assignee and reviewer
- Due date, completion date

#### 1.1.3 Issue/Error Management
**Shared Responsibility:** Operator, Leader, Manager

**Capabilities:**
- Create and track issues/errors related to tasks
- Attach supporting files to issues
- Assign responsibility for issue resolution
- Track issue status and resolution timeline

**Data Fields:**
- Issue code, title, description
- Status, priority
- Associated project and task
- Assignee and reviewer
- Resolution date

### 1.2 Role-Based Workflows

#### 1.2.1 Operator Functions
- View assigned tasks
- Update task status (UC-03)
- Create and manage task-related issues
- Report issues requiring correction
- Monitor review queue

**Restrictions:**
- Cannot create or delete tasks
- Can only access assigned tasks

#### 1.2.2 Leader Functions
- View assigned projects
- Full task management (create, update, delete, assign)
- Review and approve completed tasks (UC-04)
- Monitor team member progress
- Manage operational resources
- View all issues within assigned projects

**Responsibilities:**
- Act as bridge between Manager and Operators
- Ensure task distribution and quality control

#### 1.2.3 Manager Functions
- View system-wide dashboard
- Full project management (create, update, delete, assign)
- View all tasks and issues across projects
- Configure SLA settings
- View team performance metrics
- Export reports in PDF format

**Scope:**
- System-wide visibility
- Strategic oversight, not daily operations

### 1.3 Task Workflow

**Status Progression:**
1. **Not Started** → Initial state
2. **In Progress** → Operator working on task
3. **Completed** → Submitted for review
4. **Approved** → Passed quality check
5. **Rejected** → Returned to Operator with feedback

**Review Process (UC-04):**
- Reviewer (Operator/Leader) examines completed tasks
- Approve: Move to "Approved" status
- Reject: Return to Operator with specific feedback
- Notifications sent to relevant parties

### 1.4 Data Import/Export

- **Import:** CSV format support for basic data
- **Export:** PDF report generation for Manager

---

## 2. Non-Functional Requirements

### 2.1 User Experience

- Intuitive interface tailored to each role
- Role-specific dashboards and navigation
- Clear visual indicators for task status and priority
- Responsive design for different screen sizes

### 2.2 Performance & Reliability

- Stable operation with manual data entry
- Real-time updates for task status changes
- Minimal latency for dashboard loading
- Data consistency across all user views

### 2.3 Security

**Authentication:**
- Secure login mechanism for all users
- Session management
- Password encryption (bcrypt)

**Authorization:**
- Role-based access control (RBAC)
- Users can only access data within their permission scope
- Operators: Only assigned tasks
- Leaders: Only assigned projects
- Managers: All data

**Data Protection:**
- JWT token-based authentication
- Secure API endpoints
- Activity logging and audit trails

### 2.4 Scalability & Maintainability

- Clear architecture for future feature integration
- Modular design for easy updates
- Database optimization for growing datasets
- Caching strategy for frequently accessed data (Redis)

---

## 3. System Architecture

### 3.1 Technology Stack

#### Frontend
- **Framework:** React + TypeScript
- **UI Library:** Material-UI
- **Visualization:** Chart.js
- **State Management:** Context API / Redux

#### Backend
- **Framework:** Django (Python)
- **API:** RESTful API
- **Authentication:** JWT tokens

#### Database
- **Primary:** PostgreSQL
- **Cache:** Redis
- **ORM:** Django ORM

#### Real-time Features
- **Protocol:** WebSockets for live updates

#### DevOps
- **Containerization:** Docker
- **CI/CD:** GitHub Actions

### 3.2 Database Schema

#### Core Tables

**ROLE**
- role_id (PK)
- role_name

**USER**
- user_id (PK)
- full_name, email
- role_id (FK)
- end_date, is_active
- created_at, updated_at

**PROJECT**
- project_id (PK)
- project_code, project_name
- description
- start_date, end_date
- leader_id (FK → USER)
- status
- created_at, updated_at

**TASK**
- task_id (PK)
- title, description, url
- status, type, task_priority
- project_id (FK → PROJECT)
- assignee_id (FK → USER)
- reviewer_id (FK → USER)
- due_date, completed_at
- created_at, updated_at

**ISSUE**
- issue_id (PK)
- issue_code, issue_title
- description
- status, issue_priority
- project_id (FK → PROJECT)
- task_id (FK → TASK)
- assignee_id (FK → USER)
- reviewer_id (FK → USER)
- due_date, resolved_at
- created_at, updated_at

**ATTACHMENT**
- attachment_id (PK)
- issue_id (FK → ISSUE)
- file_url
- uploaded_by (FK → USER)
- created_at

#### Relationships
- 1 Role → N Users
- 1 User (Leader) → N Projects
- 1 Project → N Tasks
- 1 User (Assignee) → N Tasks
- 1 User (Reviewer) → N Tasks
- 1 Project → N Issues
- 1 Task → N Issues
- 1 User → N Issues (as assignee or reviewer)
- 1 Issue → N Attachments

---

## 4. User Roles & Permissions

| Feature | Operator | Leader | Manager |
|---------|----------|--------|---------|
| View Assigned Tasks | ✓ | ✓ | ✓ |
| Update Task Status | ✓ | ✓ | ✓ |
| Create/Delete Tasks | ✗ | ✓ | ✓ |
| Assign Tasks | ✗ | ✓ | ✓ |
| Review Tasks | ✓* | ✓ | ✓ |
| View Projects | Own only | Assigned | All |
| Create/Delete Projects | ✗ | ✗ | ✓ |
| Assign Leaders | ✗ | ✗ | ✓ |
| View Dashboard | Personal | Team | System-wide |
| Export Reports | ✗ | Limited | ✓ |
| Configure SLA | ✗ | ✗ | ✓ |
| Manage Issues | Own | Team | All |

*Operators can review tasks when assigned as reviewer

---

## 5. Key Use Cases

### UC-01: Project Management
**Actor:** Manager  
**Flow:** Create project → Validate data → Save → Assign Leader  
**Alternative:** Delete project (only if no open tasks)

### UC-02: Task Management
**Actor:** Leader  
**Flow:** Create task → Assign Operator → Validate assignment → Save → Notify  
**Alternative:** Update task (with history) | Delete task (if Not Started)

### UC-03: Update Task Status
**Actor:** Operator  
**Flow:** Select task → Change status → Save → Update timestamp → Refresh dashboard

### UC-04: Review & Approve Task
**Actor:** Leader/Operator (reviewer)  
**Flow:** Filter completed tasks → Review → Approve/Reject → Notify assignee → Update dashboard  
**Alternative:** Reject with feedback → Return to Operator

---

## 6. Data Validation Rules

### Projects
- Project code must be unique
- Start date cannot be after end date
- Leader must exist and have Leader role
- Cannot delete project with open tasks

### Tasks
- Assignee must belong to the project
- Due date must be in the future (at creation)
- Cannot delete tasks in "In Progress" or "Completed" status
- Status transitions must follow workflow

### Issues
- Must be associated with a valid task and project
- Priority levels: Low, Medium, High, Critical
- Resolution date must be after creation date

### Users
- Email must be unique and valid format
- Role must be one of: Operator, Leader, Manager
- Active users cannot be deleted, only deactivated

---

## 7. Notification Requirements

**Trigger Events:**
- Task assigned to Operator
- Task status changed by Operator
- Task approved/rejected by reviewer
- Issue created or resolved
- Project milestone reached

**Notification Methods:**
- In-app notifications
- Real-time dashboard updates via WebSockets
- Email notifications (future enhancement)

---


## 8. Reporting Requirements

### Dashboard Metrics
- Total projects (active/completed)
- Task distribution by status
- Issue count by priority
- Team performance indicators
- SLA compliance tracking

### PDF Reports (Manager)
- Project progress summary
- Task completion rates
- Issue resolution time
- Team productivity metrics
- Custom date range filtering

---

## 9. Future Enhancements

- Email/SMS notifications
- Advanced analytics and forecasting
- Integration with external project platforms
- Mobile application
- Automated SLA monitoring and alerts
- File versioning for attachments
- Comment threads on tasks/issues
- Time tracking functionality
- Gantt chart visualization

---

## 10. Constraints & Assumptions

**Assumptions:**
- All users have stable internet connection
- Data entry is primarily manual
- Weekly reporting cadence is sufficient
- Users are trained on role-specific functions

**Constraints:**
- Initial version supports CSV import only
- PDF export format only
- No offline functionality
- Maximum file attachment size: 10MB
- Role changes require administrator intervention

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Active Development