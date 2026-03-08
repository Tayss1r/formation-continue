"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Users,
  ClipboardCheck,
  KeyRound,
  Upload,
  GraduationCap,
  Award,
  ChevronDown,
  Send,
  Phone,
  Mail,
  MapPin,
  Monitor,
  Cog,
  Zap,
  HardHat,
  TrendingUp,
  Linkedin,
  Twitter,
  Newspaper,
  Calendar,
  Star,
  FileText,
  CheckCircle,
  Clock,
  Building,
  Briefcase,
} from "lucide-react";
import { Header } from "@/components/Header";
import Link from "next/link";
import { getPublicNews, NewsItem } from "@/lib/news";
import { getActiveCalls, getPublishedResults } from "@/lib/calls";
import { API_BASE_URL, getImageUrl } from "@/lib/config";
import type { CallPublic, CallResults } from "@/types/call";

// ============ ANIMATION VARIANTS ============
const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const scaleInVariant = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

// ============ FLOATING ORBS (Hero background) ============
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Orb 1 - Large, top-right */}
      <div
        className="absolute -top-20 right-[10%] w-[400px] h-[400px] rounded-full animate-float-slow opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, var(--primary-400) 0%, transparent 70%)",
        }}
      />
      {/* Orb 2 - Medium, bottom-left */}
      <div
        className="absolute bottom-[-60px] left-[5%] w-[300px] h-[300px] rounded-full animate-float-slow opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, var(--primary-500) 0%, transparent 70%)",
          animationDelay: "3s",
        }}
      />
      {/* Removed Orb 3 (blue dot in center) per user request */}
    </div>
  );
}

// ============ HERO SECTION ============
function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
      {/* Floating gradient orbs */}
      <FloatingOrbs />

      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div 
              variants={fadeUpVariant}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 mb-6"
            >
              <GraduationCap className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                Formation Continue - ISET Rades
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              variants={fadeUpVariant}
              className="heading-display text-4xl sm:text-5xl lg:text-[3.5rem] text-slate-900 dark:text-white mb-6"
            >
              Investissez dans les{" "}
              <span className="gradient-text">compétences</span>{" "}
              de vos équipes
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              variants={fadeUpVariant}
              className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Notre université propose des formations professionnelles certifiantes 
              pour les entreprises et les particuliers. Des programmes adaptés 
              à chaque secteur, dispensés par des experts reconnus.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              variants={fadeUpVariant}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Link
                href="/courses"
                className="w-full sm:w-auto btn-primary inline-flex items-center justify-center gap-2"
              >
                Parcourir les Formations
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto btn-secondary inline-flex items-center justify-center gap-2"
              >
                Comment ça marche
              </a>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div 
              variants={fadeUpVariant}
              className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="grid grid-cols-3 gap-8">
                {[
                  { value: "500+", label: "Professionnels formés" },
                  { value: "50+", label: "Formations disponibles" },
                  { value: "98%", label: "Taux de satisfaction" },
                ].map((stat, index) => (
                  <motion.div 
                    key={index} 
                    className="text-center lg:text-left"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.15 }}
                  >
                    <div className="text-2xl sm:text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Visual - Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Main Dashboard Card */}
              <div className="card-elevated p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Tableau de bord</p>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Formations en cours</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                
                {/* Progress Items */}
                <div className="space-y-4">
                  {[
                    { name: "Management d'équipe", progress: 85, color: "bg-primary-500" },
                    { name: "Gestion de projet Agile", progress: 60, color: "bg-emerald-500" },
                    { name: "Communication digitale", progress: 35, color: "bg-amber-500" },
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                        <span className="text-slate-500">{item.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.2, ease: "easeOut" }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Card - Certificate */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8, type: "spring", stiffness: 100 }}
                className="absolute -bottom-6 -left-6 card-elevated p-4 rounded-xl shadow-elevated animate-float"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Award className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Certificat obtenu</p>
                    <p className="text-xs text-slate-500">Management Avancé</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating Card - Notification */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1, type: "spring", stiffness: 100 }}
                className="absolute -top-4 -right-4 card-elevated p-4 rounded-xl shadow-elevated animate-float"
                style={{ animationDelay: "2s" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">+12 inscrits</p>
                    <p className="text-xs text-slate-500">Cette semaine</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============ HOW IT WORKS SECTION ============
function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = [
    {
      number: "01",
      icon: FileText,
      title: "Appel à candidatures publié",
      description: "L'université publie un appel à candidatures pour une formation avec les documents requis."
    },
    {
      number: "02",
      icon: Building2,
      title: "Candidature entreprise",
      description: "L'entreprise soumet sa candidature avec les documents requis avant la date limite."
    },
    {
      number: "03",
      icon: ClipboardCheck,
      title: "Examen par le coordinateur",
      description: "Le coordinateur examine les documents et approuve ou rejette les candidatures."
    },
    {
      number: "04",
      icon: Users,
      title: "Soumission des employés",
      description: "Les employés des entreprises approuvées peuvent soumettre leurs dossiers personnels."
    },
    {
      number: "05",
      icon: CheckCircle,
      title: "Publication des résultats",
      description: "La liste des entreprises et employés admis est publiée officiellement."
    },
    {
      number: "06",
      icon: Award,
      title: "Formation complétée",
      description: "Les participants suivent la formation et reçoivent leur certificat."
    },
  ];

  return (
    <section id="how-it-works" className="py-16 lg:py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeUpVariant}
          className="text-center mb-16"
        >
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
            Comment ça <span className="gradient-text animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}>fonctionne</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Un processus simple et structuré, de la réservation jusqu'à la certification
          </p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={scaleInVariant}
              className="relative"
            >
              <div className="card-elevated p-6 h-full">
                {/* Step Number */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl font-bold text-primary-100 dark:text-primary-900/50">
                    {step.number}
                  </span>
                  <div className="icon-box">
                    <step.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Connector Arrow (hidden on last item of row) */}
              {index < steps.length - 1 && (index + 1) % 3 !== 0 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-primary-300 dark:text-primary-700" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============ DEPARTMENTS SECTION ============
function DepartmentsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const departments = [
    {
      slug: "informatique",
      icon: Monitor,
      name: "Technologie de l'informatique",
      description: "Développement logiciel, systèmes d'information, réseaux et cybersécurité."
    },
    {
      slug: "mecanique",
      icon: Cog,
      name: "Génie mécanique",
      description: "Conception mécanique, fabrication, maintenance industrielle et automatisation."
    },
    {
      slug: "electrique",
      icon: Zap,
      name: "Génie électrique",
      description: "Systèmes électriques, électronique, automatismes et énergies renouvelables."
    },
    {
      slug: "civil",
      icon: HardHat,
      name: "Génie civil",
      description: "Construction, structures, travaux publics et gestion de projets BTP."
    },
    {
      slug: "gestion",
      icon: TrendingUp,
      name: "Sciences Économiques et Sciences de Gestion",
      description: "Finance, comptabilité, marketing, ressources humaines et management."
    },
  ];

  return (
    <section id="departments" className="py-16 lg:py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeUpVariant}
          className="text-center mb-12"
        >
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
            Nos départements de <span className="gradient-text">formation</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Des programmes spécialisés couvrant tous les besoins de développement professionnel
          </p>
        </motion.div>

        {/* Departments - flex-based centered layout for odd count */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="flex flex-wrap justify-center gap-6"
        >
          {departments.map((dept, index) => (
            <motion.div
              key={index}
              variants={scaleInVariant}
              className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
            >
              <Link href={`/departments/${dept.slug}`} className="block h-full">
                <div className="card-elevated p-6 h-full group cursor-pointer hover:shadow-lg transition-all duration-300">
                  <div className="icon-box mb-4 group-hover:scale-110 transition-transform duration-300">
                    <dept.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {dept.description}
                  </p>
                  <div className="mt-4 flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Explorer</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeUpVariant}
          className="text-center mt-10"
        >
          <Link
            href="/courses"
            className="btn-primary inline-flex items-center gap-2"
          >
            Voir toutes les formations
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ============ ACTIVE CALLS SECTION ============
function ActiveCallsSection() {
  const [calls, setCalls] = useState<CallPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalls() {
      try {
        const response = await getActiveCalls();
        setCalls(response.calls || []);
      } catch (error) {
        console.error("Error fetching active calls:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCalls();
  }, []);

  if (loading) {
    return (
      <section id="active-calls" className="py-16 lg:py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-4"></div>
              <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (calls.length === 0) {
    return (
      <section id="active-calls" className="py-16 lg:py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="text-center"
          >
            <h2 className="heading-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
              Appels à <span className="gradient-text">candidatures</span>
            </h2>
            <div className="max-w-md mx-auto mt-8 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Aucun appel à candidatures ouvert pour le moment.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                Revenez bientôt pour découvrir nos nouvelles opportunités de formation.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="active-calls" className="py-16 lg:py-20 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariant}
          className="text-center mb-12"
        >
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
            Appels à <span className="gradient-text">candidatures</span> ouverts
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Déposez votre candidature avant la date limite pour participer à nos formations
          </p>
        </motion.div>

        {/* Calls Grid */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {calls.slice(0, 6).map((call) => (
            <motion.div
              key={call.id}
              variants={scaleInVariant}
            >
              <div className="card-elevated p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300">
                      {call.department_display}
                    </span>
                    {call.is_upcoming && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        <Calendar className="w-3 h-3" />
                        Bientôt
                      </span>
                    )}
                  </div>
                  {call.is_upcoming && call.days_until_open !== undefined ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                      <Clock className="w-4 h-4" />
                      Ouvre dans {call.days_until_open} j
                    </span>
                  ) : call.days_remaining !== undefined && call.days_remaining !== null && (
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                      call.days_remaining <= 3 
                        ? 'text-red-600 dark:text-red-400' 
                        : call.days_remaining <= 7 
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      <Clock className="w-4 h-4" />
                      {call.days_remaining} jours
                    </span>
                  )}
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {call.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 flex-grow">
                  {call.description?.slice(0, 150)}{call.description && call.description.length > 150 ? '...' : ''}
                </p>
                
                {/* Footer */}
                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Réf: {call.reference_number}
                    </span>
                    <Link
                      href={`/calls/${call.id}`}
                      className="inline-flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                    >
                      Voir les détails
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        {calls.length > 6 && (
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="text-center mt-10"
          >
            <Link
              href="/calls"
              className="btn-primary inline-flex items-center gap-2"
            >
              Voir tous les appels
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}

// ============ PUBLISHED RESULTS SECTION ============
function PublishedResultsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [results, setResults] = useState<CallResults[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const response = await getPublishedResults();
        setResults(response.results || []);
      } catch (error) {
        console.error("Error fetching published results:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, []);

  if (loading || results.length === 0) {
    return null; // Don't show section if no results
  }

  return (
    <section id="results" className="py-16 lg:py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeUpVariant}
          className="text-center mb-12"
        >
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
            Résultats <span className="gradient-text">publiés</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Consultez les entreprises admises aux dernières sessions de formation
          </p>
        </motion.div>

        {/* Results Grid */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-6"
        >
          {results.slice(0, 4).map((result) => (
            <motion.div
              key={result.id}
              variants={scaleInVariant}
            >
              <div className="card-elevated p-6 h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    {result.department_display}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {result.total_admitted} admis
                  </span>
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {result.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Réf: {result.reference_number}
                </p>
                
                {/* Admitted Companies Preview */}
                {result.admitted_companies.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Entreprises admises:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.admitted_companies.slice(0, 3).map((company) => (
                        <span
                          key={company.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Building className="w-3 h-3" />
                          {company.name}
                        </span>
                      ))}
                      {result.admitted_companies.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          +{result.admitted_companies.length - 3} autres
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Link
                    href={`/calls/${result.id}/results`}
                    className="inline-flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                  >
                    Voir tous les résultats
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============ NEWS SECTION ============
function NewsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await getPublicNews(1, 3, false);
        setNews(response.news);
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <section id="news" className="py-16 lg:py-20" ref={ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mx-auto"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ALWAYS show section - never return null
  return (
    <section id="news" className="py-16 lg:py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeUpVariant}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary-50 dark:bg-primary-500/10 rounded-full">
            <Newspaper className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              Actualités
            </span>
          </div>
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
            Restez <span className="gradient-text">informé</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Découvrez nos dernières actualités, événements et annonces
          </p>
        </motion.div>

        {/* Empty State or News Grid */}
        {news.length === 0 ? (
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeUpVariant}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Newspaper className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              Pas d&apos;actualités pour le moment
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Revenez bientôt pour découvrir nos dernières nouvelles
            </p>
          </motion.div>
        ) : (
          <motion.div 
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {news.map((item) => (
              <motion.article
                key={item.id}
                variants={scaleInVariant}
              >
                <Link href={`/news/${item.id}`} className="block h-full">
                  <div className="card-elevated group overflow-hidden h-full hover:shadow-lg transition-all duration-300">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20">
                      <img
                        src={getImageUrl(item.image_path ?? undefined)}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                          const icon = document.createElement('div');
                          icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-primary-300 dark:text-primary-600"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/></svg>';
                          target.parentElement!.appendChild(icon);
                        }}
                      />
                      {item.is_featured && (
                        <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                          À la une
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                        <Calendar className="w-4 h-4" />
                        {formatDate(item.published_at)}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {item.title}
                      </h3>
                      {item.excerpt && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed line-clamp-3">
                          {item.excerpt}
                        </p>
                      )}
                      <div className="mt-4 flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium">
                        <span>Lire la suite</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

// ============ FAQ SECTION ============
function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Comment une entreprise peut-elle inscrire ses employés ?",
      answer: "L'entreprise commence par créer un compte sur notre plateforme, puis sélectionne la formation souhaitée et réserve le nombre de places nécessaires. Une fois la session confirmée par notre équipe, un code d'accès unique est envoyé pour permettre aux employés de s'inscrire individuellement."
    },
    {
      question: "Quels documents sont nécessaires pour l'inscription ?",
      answer: "Chaque participant doit fournir une pièce d'identité valide (carte d'identité nationale ou passeport) lors de son inscription. Ce document est nécessaire pour la vérification d'identité et la délivrance du certificat en fin de formation."
    },
    {
      question: "Comment les certificats sont-ils délivrés ?",
      answer: "Les certificats officiels sont délivrés à la fin de chaque formation, après validation des présences et, le cas échéant, réussite des évaluations. Ils sont disponibles en format numérique sur l'espace personnel de chaque participant."
    },
    {
      question: "Quelle est la politique d'annulation ?",
      answer: "Les réservations peuvent être annulées gratuitement jusqu'à 7 jours avant le début de la session. Au-delà de ce délai, des frais d'annulation peuvent s'appliquer. Contactez notre équipe pour toute demande spécifique."
    },
    {
      question: "Les formations sont-elles certifiantes ?",
      answer: "Oui, toutes nos formations sont certifiantes et reconnues par les instances professionnelles. Nos programmes sont conçus en collaboration avec des experts du secteur et répondent aux standards de qualité les plus exigeants."
    },
  ];

  return (
    <section id="faq" className="py-16 lg:py-20" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeUpVariant}
          className="text-center mb-12"
        >
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
            Questions <span className="gradient-text">fréquentes</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Tout ce que vous devez savoir sur nos formations
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="space-y-3"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              variants={scaleInVariant}
              className="card-elevated overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
              >
                <span className="font-semibold text-slate-900 dark:text-white pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-primary-500 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-5">
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============ CONTACT SECTION ============
function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <section id="contact" className="py-16 lg:py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Contact Info */}
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeUpVariant}
          >
            <h2 className="heading-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
              Contactez-<span className="gradient-text">nous</span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              Une question sur nos formations ? Besoin d'un programme sur mesure ? 
              Notre équipe est là pour vous accompagner.
            </p>

            <div className="space-y-6">
              {[
                { icon: Mail, label: "Email", value: "formation.isetr@gmail.com" },
                { icon: Phone, label: "Téléphone", value: "+216 71 442 322" },
                { icon: MapPin, label: "Adresse", value: "BP 172, Rue El Qods - Radès Médina 2098, Tunisie" },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="icon-box flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                    <p className="text-slate-900 dark:text-white font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social Links */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Suivez-nous</p>
              <div className="flex gap-3">
                {[
                  { icon: Linkedin, href: "#" },
                  { icon: Twitter, href: "#" },
                ].map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 transition-colors"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeUpVariant}
          >
            <div className="card-elevated p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Message envoyé
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Nous vous répondrons dans les plus brefs délais.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-primary-600 dark:text-primary-400 font-medium hover:underline"
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                      placeholder="Votre nom"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                      placeholder="votre@email.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="form-input form-textarea"
                      placeholder="Comment pouvons-nous vous aider ?"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Envoyer le message
                        <Send className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============ FOOTER ============
function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    "Formations": [
      { name: "Catalogue", href: "/courses" },
      { name: "Sur mesure", href: "#contact" },
      { name: "Entreprises", href: "#contact" },
      { name: "Certifications", href: "#faq" },
    ],
    "Ressources": [
      { name: "FAQ", href: "#faq" },
      { name: "Comment ça marche", href: "#how-it-works" },
      { name: "Départements", href: "#departments" },
    ],
    "Contact": [
      { name: "Nous contacter", href: "#contact" },
      { name: "Support", href: "#contact" },
    ],
  };

  return (
    <footer className="py-16 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                Forminy
              </span>
            </Link>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Bureau de Formation Continue Universitaire. 
              Des formations professionnelles certifiantes.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © {currentYear} Forminy - Bureau de Formation Continue. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              Politique de confidentialité
            </a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              Conditions d'utilisation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============ MAIN PAGE ============
export default function HomePage() {
  return (
    <main className="min-h-screen landing-page-bg">
      <Header />
      <HeroSection />
      <ActiveCallsSection />
      <DepartmentsSection />
      <PublishedResultsSection />
      <NewsSection />
      <FAQSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
