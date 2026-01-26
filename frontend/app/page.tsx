"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Play,
  Sparkles,
  Brain,
  Target,
  Users,
  BookOpen,
  Award,
  ChevronRight,
  Check,
  Zap,
  BarChart3,
  Twitter,
  Linkedin,
  Github,
  GraduationCap,
  Building2,
  Briefcase,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CoursesSection } from "@/components/CoursesSection";
import { NewsletterForm } from "@/components/NewsletterForm";

// ============ HERO SECTION ============
function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-3xl rounded-full"
        />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 mb-8"
          >
            <GraduationCap className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">Formation Continue Universitaire</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white"
          >
            Développez Vos Compétences avec{" "}
            <span className="gradient-text">Nos Formations Professionnelles</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto"
          >
            Le Bureau de Formation Continue de l&apos;Université vous propose des formations 
            de qualité dispensées par des experts. Formations publiques et sur mesure pour entreprises.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.a
              href="#courses"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
            >
              Découvrir les Formations
              <ArrowRight className="w-5 h-5" />
            </motion.a>
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white font-semibold hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2"
            >
              <Building2 className="w-5 h-5" />
              Formation sur Mesure
            </motion.a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
          >
            {[
              { value: "500+", label: "Formés" },
              { value: "50+", label: "Formations" },
              { value: "30+", label: "Experts" },
              { value: "98%", label: "Satisfaction" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============ LOGO CLOUD ============
function LogoCloud() {
  const logos = ["ACME", "GLOBEX", "HOOLI", "INITECH", "UMBRELLA", "STARK"];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800/50">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-sm text-slate-500 mb-8">
          Trusted by teams at leading companies worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {logos.map((logo) => (
            <div
              key={logo}
              className="text-2xl font-bold text-slate-400 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-500 transition-colors"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ FEATURES GRID ============
function FeaturesSection() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description:
        "Adaptive algorithms personalize your learning path based on your progress and goals.",
    },
    {
      icon: Target,
      title: "Interactive Quizzes",
      description:
        "Test your knowledge with engaging quizzes and receive instant feedback.",
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description:
        "Monitor your advancement with detailed analytics and milestone achievements.",
    },
    {
      icon: Users,
      title: "Expert Mentors",
      description:
        "Connect with industry professionals for guidance and career advice.",
    },
    {
      icon: BookOpen,
      title: "Rich Course Library",
      description:
        "Access hundreds of courses across tech, business, design, and more.",
    },
    {
      icon: Award,
      title: "Certifications",
      description:
        "Earn recognized certificates to showcase your skills to employers.",
    },
  ];

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
            Everything you need to{" "}
            <span className="gradient-text">learn faster</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Our platform combines cutting-edge technology with proven learning
            methodologies to help you achieve your goals.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 hover:border-purple-500/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-purple-500/20 transition-shadow">
                <feature.icon className="w-6 h-6 text-purple-500" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ HOW IT WORKS ============
function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Sign Up",
      description:
        "Create your free account in seconds and set your learning preferences.",
      icon: Users,
    },
    {
      number: "02",
      title: "Choose a Track",
      description:
        "Browse our curated learning tracks or let AI recommend one for you.",
      icon: Target,
    },
    {
      number: "03",
      title: "Get Certified",
      description:
        "Complete courses, pass assessments, and earn industry-recognized certificates.",
      icon: Award,
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-100/50 dark:bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
            How it <span className="gradient-text">works</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Start your learning journey in three simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-purple-500/50 to-transparent" />
              )}

              <div className="text-center">
                {/* Step number */}
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-6">
                  <span className="text-3xl font-bold gradient-text">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ PRICING SECTION ============
function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "Free",
      description: "Perfect for getting started",
      price: { monthly: 0, yearly: 0 },
      features: [
        "5 courses per month",
        "Basic quizzes",
        "Community access",
        "Email support",
      ],
      cta: "Get Started",
      highlighted: false,
    },
    {
      name: "Pro",
      description: "Best for serious learners",
      price: { monthly: 29, yearly: 290 },
      features: [
        "Unlimited courses",
        "Advanced quizzes",
        "1-on-1 mentorship",
        "Certificate downloads",
        "Priority support",
        "Offline access",
      ],
      cta: "Start Free Trial",
      highlighted: true,
    },
    {
      name: "Enterprise",
      description: "For teams and organizations",
      price: { monthly: 99, yearly: 990 },
      features: [
        "Everything in Pro",
        "Team management",
        "Custom learning paths",
        "Analytics dashboard",
        "SSO integration",
        "Dedicated support",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
            Simple, transparent <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your learning goals. Upgrade or downgrade
            anytime.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-4 p-1 rounded-xl bg-slate-200 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isYearly
                  ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isYearly
                  ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-500">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl border ${
                plan.highlighted
                  ? "bg-gradient-to-b from-purple-500/10 to-transparent border-purple-500/50"
                  : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/50"
              }`}
            >
              {/* Popular badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan info */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                  ${isYearly ? plan.price.yearly : plan.price.monthly}
                </span>
                <span className="text-slate-600 dark:text-slate-400 text-sm">
                  /{isYearly ? "year" : "month"}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ FAQ SECTION ============
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How does the AI-powered learning work?",
      answer:
        "Our AI analyzes your learning patterns, quiz results, and goals to create a personalized curriculum. It adjusts the difficulty and pace based on your progress, ensuring optimal learning outcomes.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer:
        "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period, and you won't be charged again.",
    },
    {
      question: "Are the certificates recognized by employers?",
      answer:
        "Our certificates are recognized by over 500 companies worldwide. We partner with industry leaders to ensure our certifications meet real-world job requirements.",
    },
    {
      question: "Is there a free trial available?",
      answer:
        "Yes! Our Pro plan comes with a 14-day free trial. You can explore all premium features without any commitment. No credit card required.",
    },
    {
      question: "How do I access courses on mobile?",
      answer:
        "We have dedicated mobile apps for iOS and Android. Pro and Enterprise users can also download courses for offline access.",
    },
  ];

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-100/50 dark:bg-slate-900/30">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
            Frequently asked <span className="gradient-text">questions</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Everything you need to know about TrainFast
          </p>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
              >
                <span className="font-medium text-slate-900 dark:text-white">{faq.question}</span>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    openIndex === index ? "rotate-90" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ CTA SECTION ============
function CTASection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

          {/* Content */}
          <div className="relative px-8 py-16 sm:px-16 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
            >
              Prêt à développer vos compétences ?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-white/80 mb-8 max-w-xl mx-auto"
            >
              Rejoignez les professionnels qui développent leurs compétences avec nos formations.
              Contactez-nous pour une formation sur mesure.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.a
                href="/signup"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-purple-600 font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                Commencer Maintenant
                <ArrowRight className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="#pricing"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Voir les Tarifs
              </motion.a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============ NEWSLETTER SECTION ============
function NewsletterSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-100/50 dark:bg-slate-900/30">
      <div className="max-w-3xl mx-auto">
        <NewsletterForm variant="section" />
      </div>
    </section>
  );
}

// ============ FOOTER ============
function Footer() {
  const footerLinks = {
    Formations: ["Catalogue", "Sur Mesure", "Entreprises", "Certifications"],
    Ressources: ["Blog", "FAQ", "Webinaires", "Témoignages"],
    Contact: ["À propos", "Partenariats", "Recrutement", "Presse"],
    Légal: ["Confidentialité", "CGU", "Cookies", "Mentions légales"],
  };

  return (
    <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800/50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Logo & description */}
          <div className="col-span-2">
            <motion.a
              href="/"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 mb-4"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">FormationPro</span>
            </motion.a>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Bureau de Formation Continue Universitaire - Des formations de qualité pour les professionnels.
            </p>
            <div className="flex items-center gap-4">
              <motion.a
                href="#"
                whileHover={{ scale: 1.1 }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.1 }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.1 }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </motion.a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Newsletter - Simplified */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-8 border-t border-slate-200 dark:border-slate-800/50">
          <div>
            <h4 className="text-slate-900 dark:text-white font-semibold mb-1">
              Newsletter sectorielle
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Recevez des offres de formation adaptées à votre secteur d&apos;activité.
            </p>
          </div>
          <motion.a
            href="#newsletter"
            whileHover={{ scale: 1.05 }}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            S&apos;inscrire
          </motion.a>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © 2026 FormationPro - Bureau de Formation Continue. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm transition-colors">
              Politique de Confidentialité
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm transition-colors">
              Conditions d&apos;Utilisation
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
    <main className="min-h-screen bg-slate-50 dark:bg-[#020817] transition-colors duration-300">
      <Header />
      <HeroSection />
      <LogoCloud />
      <CoursesSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <NewsletterSection />
      <Footer />
    </main>
  );
}
