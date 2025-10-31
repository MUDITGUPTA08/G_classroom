# G_Classroom - Comprehensive Classroom Management System

A full-featured classroom management platform built with Next.js, Supabase, and TypeScript. Manage classes, assignments, submissions, and track student performance with advanced analytics.

![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-Latest-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-cyan)

## 🚀 Features

### For Teachers
- **Class Management**
  - Create and manage multiple classes
  - Generate unique class codes for student enrollment
  - Upload study materials for each class
  - Track student enrollment and engagement

- **Assignment System**
  - Create assignments with due dates and point values
  - Attach reference materials to assignments
  - Set custom deadlines for individual students
  - Allow/block late submissions per class

- **Grading & Feedback**
  - Grade student submissions with detailed feedback
  - Override deadlines for specific students
  - Track submission status (pending, graded, late)
  - View student work and attached files

- **Advanced Analytics Dashboard**
  - Total assignments created
  - Pending submissions count (ungraded only)
  - Average score across all graded work
  - Grade distribution visualization (0-10%, 11-20%, etc.)
  - At-risk student detection (3+ missing submissions)
  - Real-time statistics and insights

### For Students
- **Class Enrollment**
  - Join classes using unique class codes
  - View enrolled classes and materials

- **Assignment Submissions**
  - Submit text content and multiple file attachments
  - Replace submissions before deadline
  - View grading status and teacher feedback
  - Download class study materials and assignment attachments

- **Submission Tracking**
  - Late submission warnings and enforcement
  - Custom deadline notifications
  - Grade and feedback visibility

### File Management System
- **Drag-and-Drop Upload**
  - Support for multiple files (up to 5 per upload)
  - File size limit: 10MB per file
  - All common file types supported (documents, images, videos, audio, archives)

- **Secure Storage**
  - Three dedicated Supabase Storage buckets:
    - `assignment-submissions`: Student submission files
    - `study-materials`: Class-level study materials
    - `assignment-attachments`: Assignment reference files
  - Public access with proper path handling
  - File download with original filenames

- **File Management**
  - Upload/delete study materials (teachers)
  - Upload/delete submission files (students, before grading)
  - File type icons and size display
  - Download functionality for all uploaded files

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI Components
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Icons**: Lucide React
- **State Management**: React Hooks

## 📦 Installation

### Prerequisites
- Node.js 20+ and npm
- Supabase account and project

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/MUDITGUPTA08/G_classroom.git
   cd G_classroom
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run database migrations**
   The project includes migrations for:
   - User profiles and roles
   - Classes and enrollments
   - Assignments and submissions
   - File storage tables
   - Late submission tracking

   Apply migrations using Supabase CLI or the provided migration files in your Supabase dashboard.

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment to Vercel

### Prerequisites
- GitHub account with your repository pushed
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase project with all migrations applied

### Deployment Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will automatically detect Next.js

3. **Configure Environment Variables**
   In the Vercel project settings, add these environment variables:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Get these values from your Supabase project:
   - Go to [app.supabase.com](https://app.supabase.com)
   - Select your project
   - Go to Settings → API
   - Copy "Project URL" and "anon public" key

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - You'll get a production URL (e.g., `your-project.vercel.app`)

5. **Verify Deployment**
   - Visit your deployed URL
   - Test authentication (sign up/login)
   - Create a class and upload files
   - Verify Supabase connection is working

### Post-Deployment Configuration

**Update Supabase Authentication URLs**:
1. Go to your Supabase project
2. Navigate to Authentication → URL Configuration
3. Add your Vercel URL to:
   - Site URL: `https://your-project.vercel.app`
   - Redirect URLs: `https://your-project.vercel.app/**`

**Custom Domain (Optional)**:
1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Update DNS records as instructed
4. Update Supabase redirect URLs with your custom domain

### Troubleshooting

- **Build Errors**: Check Vercel build logs for missing dependencies
- **Database Connection**: Verify environment variables are set correctly
- **File Upload Issues**: Ensure Supabase Storage buckets are public
- **Authentication Errors**: Check Supabase redirect URLs match your deployment URL

## 📊 Database Schema

### Core Tables

- **profiles**: User information and roles (student/teacher)
- **classes**: Class information with unique codes
- **class_enrollments**: Student-class relationships
- **assignments**: Assignment details with due dates
- **submissions**: Student submissions with grading info
  - `submitted_at`: Submission timestamp
  - `is_late`: Late submission flag
  - `deadline_override`: Teacher-set custom deadline
  - `grade`: Numerical grade
  - `feedback`: Teacher feedback text

### File Storage Tables

- **study_materials**: Class-level study materials
- **assignment_attachments**: Files attached to assignments
- **submission_files**: Files attached to student submissions

### Key Features

- **Row Level Security (RLS)**: Disabled for simplified development
- **Storage Buckets**: Three public buckets with proper access control
- **Indexes**: Optimized queries for performance

## 🎯 Key Functionality

### Submission Flow

1. **Before Due Date**
   - Students can submit/replace work unlimited times
   - No penalties or warnings
   - Files can be added/removed

2. **After Due Date**
   - Automatic late detection based on `due_date` or `deadline_override`
   - Submissions marked with `is_late = true`
   - Class setting `allow_late_submissions` controls blocking:
     - `true` (default): Allow with late flag
     - `false`: Block submission entirely

3. **Teacher Overrides**
   - Set custom deadline per student
   - Override takes precedence over assignment due date
   - Visible to students in submission form

### File Upload Process

1. **Upload**: Files stored in Supabase Storage
   - Path format: `bucket-name/entity-id/unique-filename`
   - Metadata saved in database with full path

2. **Download**: Public URL generation
   - Extract bucket name and file path from metadata
   - Generate public URL via Supabase
   - Trigger browser download with original filename

3. **Delete**: Two-step process
   - Remove file from storage
   - Delete metadata from database

### Analytics Calculations

- **Average Score**: `(sum of percentage scores) / count of graded submissions`
- **Grade Distribution**: Group scores into 10% ranges (0-10, 11-20, etc.)
- **At-Risk Students**: Students with `(total assignments - submissions) >= 3`

## 📁 Project Structure

```
t_class/
├── app/                          # Next.js app directory
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Main dashboard
│   │   ├── assignments/          # Assignment management
│   │   ├── classes/              # Class management
│   │   ├── submissions/          # Submission review
│   │   └── page.tsx              # Dashboard home
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── ui/                       # Radix UI components
│   ├── file-upload.tsx           # File upload component
│   ├── file-list.tsx             # File display component
│   └── dashboard-content.tsx     # Dashboard analytics
├── lib/                          # Utility libraries
│   └── supabase/                 # Supabase client & types
├── supabase/                     # Database migrations
│   └── migrations/               # SQL migration files
└── public/                       # Static assets
```

## 🔐 Authentication

- Supabase Auth with email/password
- Role-based access control (teacher/student)
- Protected routes with middleware

## 🎨 UI Components

- Radix UI primitives for accessibility
- Tailwind CSS for styling
- Custom components:
  - File upload with drag-and-drop
  - File list with download/delete actions
  - Grade distribution charts
  - At-risk student alerts

## 🚦 Getting Started

### As a Teacher
1. Sign up with email and password
2. Set role to "teacher" in profile
3. Create your first class
4. Share the class code with students
5. Create assignments and upload materials
6. Grade submissions and provide feedback

### As a Student
1. Sign up with email and password
2. Set role to "student" in profile
3. Join a class using the class code
4. View assignments and study materials
5. Submit work before due dates
6. Check grades and feedback

## 📝 License

This project is built for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ using Next.js and Supabase
