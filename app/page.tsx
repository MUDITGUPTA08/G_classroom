import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 p-8">
        <div className="flex justify-center">
          <div className="bg-primary text-primary-foreground flex items-center justify-center rounded-lg size-20">
            <BookOpen className="size-10" />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">
            Classroom Manager
          </h1>
          <p className="text-xl text-gray-600 max-w-md mx-auto">
            Manage assignments, track submissions, and collaborate with your classroom
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/login">
            <Button size="lg" className="text-lg px-8">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Create Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
