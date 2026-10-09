"use client";

import Link from "next/link";
import { FileUp, BookOpen } from "lucide-react";
import { useOrbit } from "@/store/OrbitProvider";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { CourseCard } from "@/components/courses/CourseCard";

export default function CoursesPage() {
  const { state } = useOrbit();
  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Fall 2026 · ORBIT keeps every syllabus date, exam, and professor in one place."
        action={
          <Link href="/courses/upload" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-medium text-white shadow-card hover:bg-accent-strong">
            <FileUp size={17} aria-hidden /> Upload syllabus
          </Link>
        }
      />
      {state.courses.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="No courses yet"
          body="Upload a syllabus and ORBIT can build your course schedule automatically."
          action={<Link href="/courses/upload" className="text-accent hover:underline">Upload a syllabus</Link>}
        />
      )}
    </div>
  );
}
