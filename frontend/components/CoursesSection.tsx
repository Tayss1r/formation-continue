"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight } from "lucide-react";
import { CourseCard } from "./CourseCard";
import { getPublicCourses } from "@/lib/courses";
import type { CourseListItem } from "@/types/course";
import Link from "next/link";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function CoursesSection() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);
        const response = await getPublicCourses(1, 6);
        setCourses(response.courses);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourses();
  }, []);

  return (
    <section id="courses" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
          >
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-purple-500 font-medium">
              Formation Continue
            </span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Découvrez Nos{" "}
            <span className="gradient-text">Formations</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Des formations professionnelles conçues pour améliorer vos compétences et faire avancer votre carrière.
            Dispensées par des experts de notre université.
          </p>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"
            />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Réessayer
            </button>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !error && courses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <BookOpen className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Aucune Formation Disponible
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Revenez bientôt pour de nouvelles formations.
            </p>
          </motion.div>
        )}

        {/* Courses Grid */}
        {!isLoading && !error && courses.length > 0 && (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  variants={itemVariants}
                  custom={index}
                >
                  <CourseCard course={course} />
                </motion.div>
              ))}
            </motion.div>

            {/* View All Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center mt-12"
            >
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white font-semibold hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                View All Courses
                <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}
