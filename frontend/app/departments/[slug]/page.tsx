"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Monitor,
  Cog,
  Zap,
  HardHat,
  TrendingUp,
  BookOpen,
  Users,
  GraduationCap,
  MapPin,
  Clock,
  Award,
  Wrench,
  Server,
  Cpu,
  Building2,
  Calculator,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import { getPublicCourses } from "@/lib/courses";
import { getImageUrl } from "@/lib/config";
import type { CourseListItem } from "@/types/course";

// Department data with full details
const DEPARTMENTS_DATA: Record<string, {
  name: string;
  fullName: string;
  icon: React.ElementType;
  description: string;
  longDescription: string;
  color: string;
  facilities: { name: string; description: string; icon: React.ElementType }[];
  specializations: string[];
  stats: { label: string; value: string }[];
}> = {
  informatique: {
    name: "Informatique",
    fullName: "Technologie de l'Informatique",
    icon: Monitor,
    description: "Développement logiciel, systèmes d'information, réseaux et cybersécurité.",
    longDescription: "Le département Informatique forme les professionnels aux technologies de pointe. Nos programmes couvrent le développement web et mobile, l'intelligence artificielle, la cybersécurité, l'administration des systèmes et réseaux, ainsi que le Big Data et le Cloud Computing.",
    color: "blue",
    facilities: [
      { name: "Laboratoire de Programmation", description: "30 postes équipés des derniers IDE et outils de développement", icon: Cpu },
      { name: "Salle Réseaux & Cybersécurité", description: "Infrastructure complète pour la simulation et les tests de sécurité", icon: Server },
      { name: "Data Center Pédagogique", description: "Environnement cloud pour la pratique du déploiement et de l'administration", icon: Server },
    ],
    specializations: [
      "Développement Web Full-Stack",
      "Intelligence Artificielle & Machine Learning",
      "Cybersécurité",
      "Administration Systèmes & Réseaux",
      "Cloud Computing & DevOps",
      "Big Data & Analytics",
    ],
    stats: [
      { label: "Formations actives", value: "15+" },
      { label: "Professeurs experts", value: "8" },
      { label: "Certifications disponibles", value: "12" },
    ],
  },
  mecanique: {
    name: "Mécanique",
    fullName: "Génie Mécanique",
    icon: Cog,
    description: "Conception mécanique, fabrication, maintenance industrielle et automatisation.",
    longDescription: "Le département de Génie Mécanique offre des formations complètes en conception assistée par ordinateur (CAO/FAO), maintenance industrielle, automatisation des procédés, et gestion de la production. Nos programmes allient théorie et pratique sur des équipements industriels modernes.",
    color: "orange",
    facilities: [
      { name: "Atelier d'Usinage CNC", description: "Machines-outils à commande numérique de dernière génération", icon: Wrench },
      { name: "Laboratoire CAO/FAO", description: "Stations de travail équipées de SolidWorks, CATIA et AutoCAD", icon: Monitor },
      { name: "Hall de Maintenance", description: "Équipements industriels pour la formation pratique", icon: Cog },
    ],
    specializations: [
      "Conception Mécanique Assistée par Ordinateur",
      "Maintenance Industrielle",
      "Automatisation & Robotique",
      "Gestion de Production",
      "Contrôle Qualité",
      "Énergies & Thermique",
    ],
    stats: [
      { label: "Formations actives", value: "10+" },
      { label: "Professeurs experts", value: "6" },
      { label: "Partenaires industriels", value: "20+" },
    ],
  },
  electrique: {
    name: "Électrique",
    fullName: "Génie Électrique",
    icon: Zap,
    description: "Systèmes électriques, électronique, automatismes et énergies renouvelables.",
    longDescription: "Le département de Génie Électrique prépare les professionnels aux défis de l'énergie moderne. Nos formations couvrent l'électrotechnique, l'électronique de puissance, les automatismes industriels, les systèmes embarqués et les énergies renouvelables.",
    color: "yellow",
    facilities: [
      { name: "Laboratoire d'Électrotechnique", description: "Bancs d'essais pour machines électriques et transformateurs", icon: Zap },
      { name: "Salle d'Automatismes", description: "Automates programmables Siemens, Schneider et Allen-Bradley", icon: Cpu },
      { name: "Atelier Énergies Renouvelables", description: "Installations solaires et éoliennes pédagogiques", icon: Zap },
    ],
    specializations: [
      "Électrotechnique Industrielle",
      "Automatismes & Supervision",
      "Électronique de Puissance",
      "Énergies Renouvelables",
      "Systèmes Embarqués",
      "Domotique & Smart Building",
    ],
    stats: [
      { label: "Formations actives", value: "12+" },
      { label: "Professeurs experts", value: "7" },
      { label: "Laboratoires équipés", value: "5" },
    ],
  },
  civil: {
    name: "Génie Civil",
    fullName: "Génie Civil & Construction",
    icon: HardHat,
    description: "Construction, structures, travaux publics et gestion de projets BTP.",
    longDescription: "Le département Génie Civil forme les professionnels du bâtiment et des travaux publics. Nos programmes couvrent le calcul des structures, la conduite de chantier, la topographie, le BIM (Building Information Modeling) et la gestion de projets de construction.",
    color: "amber",
    facilities: [
      { name: "Laboratoire des Matériaux", description: "Tests de résistance béton, acier et matériaux composites", icon: Building2 },
      { name: "Salle BIM & Topographie", description: "Logiciels Revit, AutoCAD Civil 3D et stations topographiques", icon: Monitor },
      { name: "Atelier Maquettes", description: "Espace de conception et prototypage de structures", icon: HardHat },
    ],
    specializations: [
      "Calcul des Structures",
      "BIM & Modélisation 3D",
      "Conduite de Travaux",
      "Topographie & SIG",
      "Géotechnique",
      "Gestion de Projets BTP",
    ],
    stats: [
      { label: "Formations actives", value: "8+" },
      { label: "Professeurs experts", value: "5" },
      { label: "Projets terrain/an", value: "15+" },
    ],
  },
  gestion: {
    name: "Gestion",
    fullName: "Sciences Économiques & Gestion",
    icon: TrendingUp,
    description: "Finance, comptabilité, marketing, ressources humaines et management.",
    longDescription: "Le département Sciences de Gestion propose des formations en management, finance d'entreprise, marketing digital, gestion des ressources humaines et comptabilité. Nos programmes sont conçus pour développer les compétences stratégiques et opérationnelles des cadres et managers.",
    color: "green",
    facilities: [
      { name: "Salle de Simulation Business", description: "Logiciels de simulation de gestion d'entreprise", icon: Calculator },
      { name: "Laboratoire Marketing Digital", description: "Outils d'analyse et de marketing automation", icon: TrendingUp },
      { name: "Centre de Documentation", description: "Accès aux bases de données économiques et financières", icon: BookOpen },
    ],
    specializations: [
      "Management & Leadership",
      "Finance d'Entreprise",
      "Marketing Digital",
      "Gestion des Ressources Humaines",
      "Comptabilité & Audit",
      "Entrepreneuriat",
    ],
    stats: [
      { label: "Formations actives", value: "18+" },
      { label: "Professeurs experts", value: "10" },
      { label: "Entreprises partenaires", value: "50+" },
    ],
  },
};

// Animation variants
const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function DepartmentPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const department = DEPARTMENTS_DATA[slug];

  useEffect(() => {
    async function fetchCourses() {
      try {
        // Fetch courses filtered by department
        const response = await getPublicCourses(1, 6, undefined, slug as "informatique" | "mecanique" | "electrique" | "civil" | "gestion");
        setCourses(response.courses.slice(0, 6));
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, [slug]);

  if (!department) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-primary-950/20 dark:to-background">
        <Header />
        <div className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
              <Building2 className="w-10 h-10 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Département introuvable
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Ce département n&apos;existe pas.
            </p>
            <Link
              href="/#departments"
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Voir tous les départements
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const DeptIcon = department.icon;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-primary-950/20 dark:to-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-28 lg:pb-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-8"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </button>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeUpVariant} className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 mb-4">
                  <DeptIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
                  {department.fullName}
                </h1>
              </motion.div>

              <motion.p 
                variants={fadeUpVariant}
                className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed"
              >
                {department.longDescription}
              </motion.p>

              {/* Stats */}
              <motion.div 
                variants={fadeUpVariant}
                className="grid grid-cols-3 gap-6"
              >
                {department.stats.map((stat, index) => (
                  <div key={index} className="text-center lg:text-left">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Specializations Card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="card-elevated p-8"
            >
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-600" />
                Domaines de spécialisation
              </h3>
              <ul className="space-y-3">
                {department.specializations.map((spec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{spec}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Facilities Section */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Équipements & Installations
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Des installations modernes pour une formation pratique de qualité
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {department.facilities.map((facility, index) => {
              const FacilityIcon = facility.icon;
              return (
                <motion.div
                  key={index}
                  variants={fadeUpVariant}
                  className="card-elevated p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                    <FacilityIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {facility.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {facility.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Related Courses Section */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="flex items-center justify-between mb-12"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Formations disponibles
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Découvrez nos formations dans ce département
              </p>
            </div>
            <Link
              href={`/courses?department=${slug}`}
              className="hidden sm:inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              Voir toutes les formations
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card-elevated p-6 animate-pulse">
                  <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                </div>
              ))}
            </div>
          ) : courses.length > 0 ? (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {courses.map((course) => (
                <motion.div key={course.id} variants={fadeUpVariant}>
                  <Link href={`/courses/${course.id}`}>
                    <div className="card-elevated overflow-hidden group cursor-pointer h-full">
                      <div className="relative h-40 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20">
                        <img
                          src={getImageUrl(course.image_path)}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                            const fallback = document.createElement('div');
                            fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-primary-300"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>';
                            target.parentElement!.appendChild(fallback);
                          }}
                        />
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {course.title}
                        </h3>
                        {course.short_description && (
                          <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">
                            {course.short_description}
                          </p>
                        )}
                        <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                          {course.duration_hours && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {course.duration_hours}h
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {course.max_seats} places
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <BookOpen className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Aucune formation disponible pour le moment
              </p>
            </div>
          )}

          <div className="sm:hidden text-center mt-8">
            <Link
              href={`/courses?department=${slug}`}
              className="btn-primary inline-flex items-center gap-2"
            >
              Voir toutes les formations
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="card-elevated p-8 lg:p-12 text-center bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-card"
          >
            <Award className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Prêt à développer vos compétences ?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
              Rejoignez nos formations et obtenez des certifications reconnues par les professionnels du secteur.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/courses" className="btn-primary inline-flex items-center gap-2">
                Explorer les formations
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/#contact" className="btn-secondary inline-flex items-center gap-2">
                Nous contacter
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} FormationPro - Bureau de Formation Continue
          </p>
        </div>
      </footer>
    </main>
  );
}
