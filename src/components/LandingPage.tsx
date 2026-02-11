import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  Cloud,
  Copy,
  Gauge,
  Mail,
  Play,
  Radar,
  Sparkles,
  ShieldCheck,
  TerminalSquare,
  Timer,
  Workflow,
  Zap,
  X,
  Linkedin,
  Github,
  Instagram,
  MessageCircle,
  Youtube,
  BookOpen,
  Check,
  AlertCircle,
  Trophy,
  TrendingUp,
  ExternalLink,
  Target,
  GitPullRequest,
  Bug,
} from "lucide-react";

// Import crew images
import delvisImg from "figma:asset/82af6e269bfaf8702bf826a4ad0d5531345b142e.png";
import angelImg from "figma:asset/6520242ec1d1ee886f3f480a096425eadd3e4f17.png";
import violenaImg from "figma:asset/8c420cea8295fe8268ad6343f3f458ad9b833622.png";
import alayoImg from "figma:asset/50840d39adf6cbcd41c3a963cd670b992b897cb2.png";
import chrisImg from "figma:asset/0d66f73cb54002f3e2d95dc43fd0b53e0249b309.png";

// Import league components
import { mockLeagueDataMonthly, mockLeagueDataAllTime } from '../data/mockLeagueData';
import { PowerTierIcon } from './PowerTierIcon';
import { getTierConfig, type TimeRange } from '../types/league';

// Import i18n
import { translations, type Language } from '../i18n/translations';
import { LanguageToggle } from './LanguageToggle';

type NavItem = { id: string; label: string };

type CrewMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  img: string;
};

export function LandingPage({ onEnter }: { onEnter?: () => void }) {
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];
  
  const nav = useMemo<NavItem[]>(
    () => [
      { id: "how", label: t.nav.howItWorks },
      { id: "roadmap", label: t.nav.roadmap },
      { id: "league", label: t.nav.league },
      { id: "about", label: t.nav.team },
      { id: "cta", label: t.nav.contact },
    ],
    [t]
  );

  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeTerminalLine, setActiveTerminalLine] = useState(0);
  const [activeYamlLine, setActiveYamlLine] = useState(0);
  const [leagueTimeRange, setLeagueTimeRange] = useState<TimeRange>('monthly');

  // Auto-advance animation every 3 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Terminal line animation - cycle through 7 lines every 1.2 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveTerminalLine((prev) => (prev + 1) % 7);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // YAML line animation - cycle through 23 lines every 0.8 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveYamlLine((prev) => (prev + 1) % 23);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenu(false);
  };

  const crewMembers = useMemo<CrewMember[]>(
    () => [
      {
        id: "delvis",
        name: "Delvis",
        role: t.team.members.delvis.role,
        bio: t.team.members.delvis.bio,
        img: delvisImg,
      },
      {
        id: "angel",
        name: "Ángel",
        role: t.team.members.angel.role,
        bio: t.team.members.angel.bio,
        img: angelImg,
      },
      {
        id: "violena",
        name: "Violena",
        role: t.team.members.violena.role,
        bio: t.team.members.violena.bio,
        img: violenaImg,
      },
      {
        id: "alayo",
        name: "Alayo",
        role: t.team.members.alayo.role,
        bio: t.team.members.alayo.bio,
        img: alayoImg,
      },
      {
        id: "chris",
        name: "Chris",
        role: t.team.members.chris.role,
        bio: t.team.members.chris.bio,
        img: chrisImg,
      },
    ],
    [t]
  );

  // Interactive workflow steps
  const workflowSteps = useMemo(() => [
    {
      step: 1,
      title: t.howItWorks.workflow.step1.title,
      description: t.howItWorks.workflow.step1.description,
      command: t.howItWorks.workflow.step1.command,
      icon: Radar,
    },
    {
      step: 2,
      title: t.howItWorks.workflow.step2.title,
      description: t.howItWorks.workflow.step2.description,
      command: t.howItWorks.workflow.step2.command,
      icon: Braces,
    },
    {
      step: 3,
      title: t.howItWorks.workflow.step3.title,
      description: t.howItWorks.workflow.step3.description,
      command: t.howItWorks.workflow.step3.command,
      icon: ShieldCheck,
    },
    {
      step: 4,
      title: t.howItWorks.workflow.step4.title,
      description: t.howItWorks.workflow.step4.description,
      command: t.howItWorks.workflow.step4.command,
      icon: Cloud,
    },
  ], [t]);

  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-50">
      {/* Background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_top,rgba(250,204,21,0.22),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(234,179,8,0.14),transparent_62%),linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:100%_100%,100%_100%,72px_72px,72px_72px] opacity-70" />
        <div className="absolute -top-56 left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] blur-3xl opacity-20" />
        <div className="absolute bottom-[-320px] right-[-260px] h-[620px] w-[620px] rounded-full bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] blur-3xl opacity-10" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080c]/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <button
            onClick={() => scrollTo("top")}
            className="group flex items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-white/5"
            aria-label="Relampo home"
          >
            <div className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5">
              <Zap className="h-5 w-5 text-[#facc15]" />
              <div className="pointer-events-none absolute -inset-8 rounded-[28px] bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] opacity-0 blur-2xl transition group-hover:opacity-20" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.18em]">RELAMPO</div>
              <div className="text-[11px] text-zinc-400">Performance testing made simple.</div>
            </div>
          </button>

          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((it) => (
              <button
                key={it.label}
                onClick={() => scrollTo(it.id)}
                className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                {it.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageToggle language={language} onLanguageChange={setLanguage} />
            <button
              onClick={onEnter}
              className="rounded-xl border border-[#facc15]/30 bg-[#facc15]/10 px-4 py-2 text-sm font-semibold text-[#facc15] hover:bg-[#facc15]/20 transition-all"
            >
              {t.hero.goToWorkbench}
            </button>
            <button
              onClick={() => scrollTo("cta")}
              className="rounded-xl bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(250,204,21,0.35)] hover:opacity-95 transition-opacity"
            >
              {t.cta.getStarted}
            </button>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenu((v) => !v)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100"
            >
              Menu
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="border-t border-white/10 bg-[#07080c] md:hidden">
            <div className="mx-auto max-w-7xl px-4 py-3">
              <div className="mb-3 flex justify-center">
                <LanguageToggle language={language} onLanguageChange={setLanguage} />
              </div>
              
              <div className="grid gap-1">
                {nav.map((it) => (
                  <button
                    key={it.label}
                    onClick={() => scrollTo(it.id)}
                    className="flex items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-zinc-200 hover:bg-white/5"
                  >
                    {it.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid gap-2">
                <button
                  onClick={onEnter}
                  className="rounded-xl border border-[#facc15]/30 bg-[#facc15]/10 px-4 py-2 text-sm font-semibold text-[#facc15]"
                >
                  Try Workbench
                </button>
                <button
                  onClick={() => scrollTo("cta")}
                  className="rounded-xl bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] px-4 py-2 text-sm font-semibold text-black"
                >
                  {t.cta.getStarted}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 md:px-6">
        {/* HERO - The Problem/Solution Hook */}
        <section id="top" className="py-12 md:py-16">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl"
              >
                {language === 'en' ? (
                  <>
                    Performance testing
                    <span className="block bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] bg-clip-text text-transparent">
                      made simple.
                    </span>
                  </>
                ) : (
                  <>
                    Pruebas de rendimiento
                    <span className="block bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] bg-clip-text text-transparent">
                      simplificadas.
                    </span>
                  </>
                )}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.12 }}
                className="mt-6 text-lg leading-relaxed text-zinc-300 md:text-xl"
              >
                {language === 'en' ? (
                  <>
                    Record real traffic. Write <strong className="text-white">readable Scripts</strong>. 
                    Run in the <strong className="text-white">cloud for free</strong>. 
                    No local limitations.
                  </>
                ) : (
                  <>
                    Graba tráfico real. Escribe <strong className="text-white">Scripts legibles</strong>. 
                    Ejecuta en la <strong className="text-white">nube gratis</strong>. 
                    Sin limitaciones locales.
                  </>
                )}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 }}
                className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"
              >
                <button
                  onClick={() => scrollTo("how")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] px-8 py-4 text-base font-semibold text-black shadow-[0_0_0_1px_rgba(250,204,21,0.35)] hover:opacity-95 transition-opacity"
                >
                  {language === 'en' ? 'Explore Relampo CLI' : 'Explorar Relampo CLI'}
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={onEnter}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-zinc-100 hover:bg-white/10 transition-colors"
                >
                  {language === 'en' ? 'Try the UI Demo' : 'Probar el Demo UI'}
                </button>
              </motion.div>

              {/* Trust Signals */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.24 }}
                className="mt-10 flex flex-wrap items-center gap-6 text-sm text-zinc-400"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>{language === 'en' ? 'Free cloud sandbox' : 'Sandbox en nube gratis'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>{language === 'en' ? '500 VUs included' : '500 VUs incluidos'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>{language === 'en' ? 'No credit card' : 'Sin tarjeta de crédito'}</span>
                </div>
              </motion.div>
            </div>

            {/* Hero visual - Terminal Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                <TerminalSquare className="h-5 w-5 text-[#facc15]" />
                <span className="text-sm font-semibold text-zinc-300">Terminal</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
                </div>
              </div>
              <div className="font-mono text-sm leading-relaxed">
                {/* Line 0 */}
                <motion.div
                  animate={{
                    color: activeTerminalLine === 0 ? "#facc15" : "#a1a1aa",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-emerald-400">$</span> relampo record --target https://api.myapp.com
                </motion.div>

                {/* Line 1 */}
                <motion.div
                  animate={{
                    color: activeTerminalLine === 1 ? "#facc15" : "#71717a",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  🎯 Recording traffic...
                </motion.div>

                {/* Line 2 */}
                <motion.div
                  animate={{
                    color: activeTerminalLine === 2 ? "#facc15" : "#a1a1aa",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-emerald-400">✓</span> Captured 42 requests
                </motion.div>

                {/* Line 3 */}
                <motion.div
                  animate={{
                    color: activeTerminalLine === 3 ? "#facc15" : "#a1a1aa",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-emerald-400">✓</span> Generated scenario.yaml
                </motion.div>

                <div className="h-3" />

                {/* Line 4 */}
                <motion.div
                  animate={{
                    color: activeTerminalLine === 4 ? "#facc15" : "#a1a1aa",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-emerald-400">$</span> relampo validate scenario.yaml
                </motion.div>

                {/* Line 5 */}
                <motion.div
                  animate={{
                    color: activeTerminalLine === 5 ? "#facc15" : "#a1a1aa",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-emerald-400">✓</span> All checks passed
                </motion.div>

                <div className="h-3" />

                {/* Line 6 */}
                <motion.div
                  animate={{
                    color: activeTerminalLine === 6 ? "#facc15" : "#a1a1aa",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-emerald-400">$</span> relampo run scenario.yaml --cloud
                </motion.div>

                {/* Line 7 (wraps back to 0) */}
                <motion.div
                  animate={{
                    color: activeTerminalLine === 0 ? "#facc15" : "#71717a",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  ☁️  Running on cloud (500 VUs × 4 nodes)...
                </motion.div>

                <motion.div
                  animate={{
                    color: activeTerminalLine === 1 ? "#facc15" : "#a1a1aa",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-[#facc15]">⚡</span> Test completed in 5m 23s
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS - Interactive Workflow */}
        <section id="how" className="py-12 md:py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">
              <Workflow className="h-4 w-4 text-[#facc15]" />
              {t.howItWorks.title}
            </div>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              {t.howItWorks.fromRecordingToResults}
              <span className="block text-2xl mt-2 bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] bg-clip-text text-transparent">
                {t.howItWorks.inSimpleSteps}
              </span>
            </h2>
          </div>

          {/* Horizontal Progress Line */}
          <div className="relative mb-16 px-4 md:px-12">
            {/* Background Line */}
            <div className="absolute left-0 right-0 top-8 h-0.5 bg-white/10" 
                 style={{ left: "10%", right: "10%" }} 
            />
            
            {/* Animated Yellow Progress Line */}
            <motion.div
              className="absolute top-8 h-0.5 bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] shadow-[0_0_8px_rgba(250,204,21,0.4)]"
              style={{ left: "10%" }}
              initial={{ width: "0%" }}
              animate={{ 
                width: `${(activeStep + 1) * 20}%`
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />

            {/* Steps */}
            <div className="relative flex justify-between px-8 md:px-16">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                const isPast = activeStep > index;
                
                return (
                  <div key={step.step} className="relative flex flex-col items-center" style={{ width: "20%" }}>
                    {/* Circle Point */}
                    <motion.button
                      onClick={() => setActiveStep(index)}
                      className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                        isActive || isPast
                          ? "border-[#facc15] bg-[#facc15]"
                          : "border-white/20 bg-[#0a0a0a]"
                      }`}
                      animate={{
                        scale: isActive ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className={`h-5 w-5 ${isActive || isPast ? "text-black" : "text-zinc-500"}`} />
                    </motion.button>

                    {/* Step Title */}
                    <motion.div
                      className="mt-4 text-center"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ 
                        opacity: isActive ? 1 : 0.4,
                        y: 0 
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={`text-xs md:text-sm font-semibold mb-1 ${
                        isActive ? "text-[#facc15]" : "text-zinc-400"
                      }`}>
                        {step.title}
                      </div>
                      
                      {/* Description - Only show on active */}
                      <div className="h-16 md:h-14 flex items-start justify-center">
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-[10px] md:text-xs text-zinc-500 mt-1 max-w-[120px] md:max-w-[160px]"
                          >
                            {step.description}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA Button - Start Testing */}
          <div className="text-center mt-12">
            <button
              onClick={onEnter}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all duration-300 hover:scale-105"
            >
              <Play className="h-5 w-5" />
              {t.howItWorks.startTesting}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* READABLE YAML - Show vs Tell */}
        <section className="py-12 md:py-16">
          <div className="rounded-3xl border border-[#facc15]/30 bg-gradient-to-br from-[#facc15]/10 via-transparent to-transparent p-8 md:p-12">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">
                  <Braces className="h-4 w-4 text-[#facc15]" />
                  {t.readableScripts.badge}
                </div>
                <h2 className="text-4xl font-bold tracking-tight md:text-5xl mb-6">
                  {t.readableScripts.title}
                  <span className="block bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] bg-clip-text text-transparent">
                    {t.readableScripts.titleHighlight}
                  </span>
                </h2>
                <p className="text-lg text-zinc-300 mb-8">
                  {t.readableScripts.description}{" "}
                  <strong className="text-white">{t.readableScripts.easyToRead}</strong>,{" "}
                  <strong className="text-white">{t.readableScripts.review}</strong>, {language === 'en' ? 'and' : 'y'}{" "}
                  <strong className="text-white">{t.readableScripts.versionControl}</strong>.
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3 text-zinc-300">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#facc15]/20 shrink-0 mt-0.5">
                      <Check className="h-5 w-5 text-[#facc15]" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{t.readableScripts.features.declarative.title}</div>
                      <div className="text-sm text-zinc-400">{t.readableScripts.features.declarative.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-zinc-300">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#facc15]/20 shrink-0 mt-0.5">
                      <Check className="h-5 w-5 text-[#facc15]" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{t.readableScripts.features.versionControlFriendly.title}</div>
                      <div className="text-sm text-zinc-400">{t.readableScripts.features.versionControlFriendly.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-zinc-300">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#facc15]/20 shrink-0 mt-0.5">
                      <Check className="h-5 w-5 text-[#facc15]" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{t.readableScripts.features.teamReadable.title}</div>
                      <div className="text-sm text-zinc-400">{t.readableScripts.features.teamReadable.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-zinc-300">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#facc15]/20 shrink-0 mt-0.5">
                      <Check className="h-5 w-5 text-[#facc15]" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{t.readableScripts.features.strictValidation.title}</div>
                      <div className="text-sm text-zinc-400">{t.readableScripts.features.strictValidation.desc}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[#facc15] shrink-0 mt-0.5" />
                    <div className="text-sm text-zinc-300">
                      <strong className="text-white">{t.readableScripts.whyYamlTitle}</strong> {t.readableScripts.whyYamlDesc}{" "}
                      <strong className="text-white">{t.readableScripts.strictValidationText}</strong> {t.readableScripts.catchesErrors}
                    </div>
                  </div>
                </div>
              </div>

              {/* YAML Examples Side by Side */}
              <div className="grid gap-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-emerald-300">{t.readableScripts.validYaml}</span>
                    <span className="text-xs text-zinc-400">scenario.yaml</span>
                  </div>
                  <div className="overflow-x-auto text-sm leading-relaxed font-mono">
                    <motion.div animate={{ color: activeYamlLine === 0 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      scenarios:
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 1 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;- name: Login & Order Flow
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 2 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;load:
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 3 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;users: 50
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 4 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;duration: 2m
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 5 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;steps:
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 6 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- request:
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 7 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;method: POST
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 8 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;url: /login
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 9 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;body:
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 10 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;username: test
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 11 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;password: secret
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 12 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;extract:
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 13 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;token: $.token
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 14 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;assert:
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 15 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;status: 200
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 16 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 17 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- think_time: 1s
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 18 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 19 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- POST: /api/orders
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 20 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;body:
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 21 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;product: "item-123"
                    </motion.div>
                    <motion.div animate={{ color: activeYamlLine === 22 ? "#facc15" : "#e4e4e7" }} transition={{ duration: 0.5 }}>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;quantity: 2
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Banner - No compilation needed */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b0d14] p-6 text-center">
              <p className="text-lg text-zinc-300">
                No compilation. No complex syntax. Just <strong className="text-white">clear test scripts</strong> that work.
              </p>
            </div>
          </div>
        </section>

        {/* FREE CLOUD - The Game Changer */}
        <section className="py-12 md:py-16">
          <div className="rounded-3xl border border-[#facc15]/30 bg-gradient-to-br from-[#facc15]/10 via-transparent to-transparent p-8 md:p-12">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">
                  <Cloud className="h-4 w-4 text-[#facc15]" />
                  {t.freeCloud.badge}
                </div>
                <h2 className="text-4xl font-bold tracking-tight md:text-5xl mb-6">
                  {t.freeCloud.title}
                  <span className="block bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] bg-clip-text text-transparent">
                    {t.freeCloud.titleHighlight}
                  </span>
                </h2>
                <p className="text-lg text-zinc-300 mb-8">
                  {t.freeCloud.description} <strong className="text-white">{t.freeCloud.concurrentVUs}</strong> {t.freeCloud.and}{" "}
                  <strong className="text-white">{t.freeCloud.hoursPerMonth}</strong> {t.freeCloud.loadGeneration}{" "}
                  {t.freeCloud.zeroSetup}
                </p>

                <div className="space-y-3">
                  {t.freeCloud.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 text-zinc-300">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#facc15]/20">
                        <Check className="h-5 w-5 text-[#facc15]" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: t.freeCloud.specs.virtualUsers, value: "500", unit: t.freeCloud.specs.concurrent },
                  { label: t.freeCloud.specs.monthlyBudget, value: "33", unit: t.freeCloud.specs.hours },
                  { label: t.freeCloud.specs.cpu, value: "AMD EPYC", unit: t.freeCloud.specs.class },
                  { label: t.freeCloud.specs.memory, value: "8 GB", unit: t.freeCloud.specs.perNode },
                  { label: t.freeCloud.specs.nodes, value: "4", unit: t.freeCloud.specs.generators },
                  { label: t.freeCloud.specs.architecture, value: "x86_64", unit: "Linux" },
                ].map((spec) => (
                  <div key={spec.label} className="rounded-2xl border border-white/10 bg-[#0b0d14] p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      {spec.label}
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{spec.value}</div>
                    <div className="text-xs text-zinc-500">{spec.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Start Command */}
            <div className="mt-12 rounded-2xl border border-white/10 bg-[#0b0d14] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                  <Play className="h-4 w-4 text-[#facc15]" />
                  Quick start
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Timer className="h-3 w-3" />
                  ~2 minutes to first test
                </div>
              </div>
              <pre className="text-xs sm:text-sm md:text-base font-mono text-zinc-100 leading-relaxed overflow-x-auto">
{`$ npm install -g relampo
$ relampo record --target https://your-api.com
$ relampo run test.yaml --cloud

✓ Test running on cloud sandbox (125 VUs × 4 nodes)`}
              </pre>
            </div>
          </div>
        </section>

        {/* ROADMAP */}
        <section id="roadmap" className="py-12 md:py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">
              <Gauge className="h-4 w-4 text-[#facc15]" />
              {language === 'en' ? "What's next" : 'Próximamente'}
            </div>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">
              {t.roadmap.title}
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              {t.roadmap.cliSubtitle}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-6">
                <CheckCircle2 className="h-4 w-4" />
                {t.roadmap.availableNow}
              </div>
              <h3 className="text-2xl font-bold text-white mb-6">{t.roadmap.cliTitle}</h3>
              <ul className="space-y-3">
                {t.roadmap.cliFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-zinc-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#facc15]/30 bg-gradient-to-br from-[#facc15]/10 to-transparent p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#facc15]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#facc15] mb-6">
                <Sparkles className="h-4 w-4" />
                {t.roadmap.comingSoon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-6">{t.roadmap.e2eTitle}</h3>
              <ul className="space-y-3">
                {t.roadmap.features.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-zinc-300">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#facc15]" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* RELAMPO LEAGUE - Coming Soon */}
        <section id="league" className="py-12 md:py-16">
          <div className="rounded-3xl border border-[#facc15]/30 bg-gradient-to-br from-[#facc15]/10 via-transparent to-transparent p-8 md:p-12 relative overflow-hidden">
            {/* Coming Soon Badge */}
            <div className="absolute top-6 right-6 inline-flex items-center gap-2 rounded-full bg-[#facc15]/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#facc15] border border-[#facc15]/30">
              <Sparkles className="h-3.5 w-3.5" />
              {t.league.comingSoon}
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">
                <Trophy className="h-4 w-4 text-[#facc15]" />
                {t.league.title}
              </div>
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">
                {t.league.leagueTitle}
                <span className="block bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] bg-clip-text text-transparent">
                  {t.league.leagueSubtitle}
                </span>
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                {t.league.leagueDescription}
              </p>
            </div>

            {/* How it Works Info */}
            <div className="max-w-3xl mx-auto mb-8 p-5 bg-[#111111] border border-white/10 rounded-xl">
              <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#facc15]" />
                {t.league.howItWorks.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                    <Target className="w-3.5 h-3.5" />
                    {t.league.howItWorks.performanceExplorers}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {t.league.howItWorks.performanceExplorersDesc}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 font-semibold text-xs">
                    <GitPullRequest className="w-3.5 h-3.5" />
                    {t.league.howItWorks.relampoContributors}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {t.league.howItWorks.relampoContributorsDesc}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                    <Bug className="w-3.5 h-3.5" />
                    {t.league.howItWorks.bugHunters}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {t.league.howItWorks.bugHuntersDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Top 10 Leaderboard Preview */}
            <div className="max-w-4xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-[#0b0d14] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 bg-[#07080c]">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-[#facc15]" />
                      <span className="font-semibold text-white">Leaderboard - Top 10</span>
                    </div>
                    
                    {/* Time Range Toggle */}
                    <div className="flex items-center gap-1 bg-[#111111] rounded-lg p-0.5 border border-white/10">
                      <button
                        onClick={() => setLeagueTimeRange('monthly')}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
                          leagueTimeRange === 'monthly'
                            ? 'bg-[#facc15]/20 text-[#facc15] shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setLeagueTimeRange('all-time')}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
                          leagueTimeRange === 'all-time'
                            ? 'bg-[#facc15]/20 text-[#facc15] shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        All-time
                      </button>
                    </div>
                  </div>
                </div>

                {/* Leaderboard Entries */}
                <div className="divide-y divide-white/5">
                  {(leagueTimeRange === 'monthly' ? mockLeagueDataMonthly : mockLeagueDataAllTime).slice(0, 10).map((entry) => {
                    const tierConfig = getTierConfig(entry.currentTier);
                    const isTopThree = entry.rank <= 3;
                    const getRankBgStyle = (rank: number) => {
                      if (rank === 1) return 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10';
                      if (rank === 2) return 'bg-gradient-to-br from-zinc-500/10 to-zinc-400/10';
                      if (rank === 3) return 'bg-gradient-to-br from-orange-500/10 to-amber-500/10';
                      return '';
                    };

                    return (
                      <div
                        key={entry.userId}
                        className={`px-6 py-4 hover:bg-white/5 transition-colors ${getRankBgStyle(entry.rank)}`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div className="flex-shrink-0 w-12 text-center">
                            {isTopThree ? (
                              <div className="text-2xl">
                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                              </div>
                            ) : (
                              <div className="text-sm font-bold text-zinc-500">
                                #{entry.rank}
                              </div>
                            )}
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-semibold text-white truncate">
                                {entry.userName}
                              </span>
                              {entry.delta !== undefined && entry.delta !== 0 && (
                                <div className={`flex items-center gap-1 text-xs font-semibold ${
                                  entry.delta > 0 ? 'text-red-400' : 'text-emerald-400'
                                }`}>
                                  {entry.delta > 0 ? (
                                    <TrendingUp className="h-3 w-3 rotate-180" />
                                  ) : (
                                    <TrendingUp className="h-3 w-3" />
                                  )}
                                  <span>{Math.abs(entry.delta)}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Power Tier */}
                            {tierConfig && (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${tierConfig.bgColor} ${tierConfig.color} ${tierConfig.borderColor} flex items-center gap-1`}>
                                  <PowerTierIcon tier={entry.currentTier!} className="w-2.5 h-2.5" />
                                  {tierConfig.name}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  {entry.totalPoints} pts
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Points Breakdown */}
                          <div className="hidden md:flex items-center gap-4 text-xs">
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-blue-400 mb-1 justify-center">
                                <Target className="w-3 h-3" />
                              </div>
                              <div className="font-semibold text-white">{entry.pointsBreakdown.explorers}</div>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-green-400 mb-1 justify-center">
                                <GitPullRequest className="w-3 h-3" />
                              </div>
                              <div className="font-semibold text-white">{entry.pointsBreakdown.contributors}</div>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-purple-400 mb-1 justify-center">
                                <Bug className="w-3 h-3" />
                              </div>
                              <div className="font-semibold text-white">{entry.pointsBreakdown.detectors}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer CTA */}
                <div className="px-6 py-6 border-t border-white/10 bg-[#07080c] text-center">
                  <p className="text-sm text-zinc-400 mb-4">
                    {t.league.joinLeague}
                  </p>
                  <button
                    disabled
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-400 cursor-not-allowed opacity-60"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t.league.viewFullLeaderboard} ({t.league.comingSoon})
                  </button>
                </div>
              </div>

              {/* Monthly Rewards Banner */}
              <div className="mt-8 px-6 py-5 bg-gradient-to-r from-[#facc15]/20 to-amber-500/20 border border-[#facc15]/20 rounded-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-[#facc15]" />
                    <div>
                      <div className="font-bold text-sm text-zinc-100">{t.league.monthlyRewards.title}</div>
                      <div className="text-xs text-zinc-400">{t.league.appliedAutomatically}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center px-3 py-2 bg-[#111111] border border-white/10 rounded-lg">
                      <div className="text-[10px] text-zinc-500 mb-1">{t.league.monthlyRewards.virtualUsers}</div>
                      <div className="text-base font-bold text-[#facc15]">
                        <span className="text-zinc-600 line-through mr-1 text-xs">500</span>750
                      </div>
                    </div>
                    <div className="text-center px-3 py-2 bg-[#111111] border border-white/10 rounded-lg">
                      <div className="text-[10px] text-zinc-500 mb-1">{t.league.monthlyRewards.loadGenerators}</div>
                      <div className="text-base font-bold text-[#facc15]">
                        <span className="text-zinc-600 line-through mr-1 text-xs">4</span>6
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section id="about" className="py-12 md:py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">
              <Zap className="h-4 w-4 text-[#facc15]" />
              {language === 'en' ? 'Our Team' : 'Nuestro Equipo'}
            </div>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">
              {language === 'en' ? 'Built by software engineers who understand testing' : 'Construido por ingenieros de software que entienden las pruebas'}
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              {language === 'en' 
                ? 'A small team obsessed with making performance testing accessible to everyone'
                : 'Un pequeño equipo obsesionado con hacer las pruebas de rendimiento accesibles para todos'}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {crewMembers.map((m) => (
              <motion.div
                key={m.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="relative flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 shadow-xl hover:border-[#facc15]/30 hover:shadow-2xl transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="shrink-0">
                    <motion.div 
                      whileHover={{ scale: 1.6 }}
                      transition={{ duration: 0.3 }}
                      className="h-16 w-16 overflow-hidden rounded-full bg-[#000000] ring-2 ring-[#facc15]/70 transition-all duration-300 hover:ring-4 hover:ring-[#facc15] relative z-10"
                    >
                      <img 
                        src={m.img} 
                        alt={m.name} 
                        className="h-full w-full object-cover"
                      />
                    </motion.div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">{m.name}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#facc15]">
                      {m.role}
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">{m.bio}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="py-16 md:py-24">
          <div className="rounded-3xl border border-[#facc15]/30 bg-gradient-to-br from-[#facc15]/10 via-transparent to-transparent p-12 text-center">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">
              {t.cta.titleLine1}
              <span className="block bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] bg-clip-text text-transparent">
                {t.cta.titleLine2}
              </span>
            </h2>
            <p className="text-lg text-zinc-300 max-w-2xl mx-auto mb-8">
              {t.finalCta.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="mailto:info@sqaadvisory.com"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] px-8 py-4 text-base font-semibold text-black shadow-[0_0_0_1px_rgba(250,204,21,0.35)] hover:opacity-95 transition-opacity"
              >
                <Mail className="h-5 w-5" />
                {t.cta.startTesting}
              </a>
              <button
                onClick={onEnter}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-zinc-100 hover:bg-white/10 transition-colors"
              >
                {t.cta.joinWaitlist}
              </button>
            </div>
            <p className="mt-6 text-sm text-zinc-400">
              {t.cta.questionsEmail} <a href="mailto:info@sqaadvisory.com" className="text-[#facc15] hover:underline">info@sqaadvisory.com</a>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#05060a]">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
          {/* Social Links Section */}
          <div className="mb-8 text-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              {language === 'en' ? 'Connect with us' : 'Conéctate con nosotros'}
            </h3>
            <div className="flex items-center justify-center gap-6">
              <a
                href="https://linkedin.com/company/relampo"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-2 transition-all hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-6 w-6 text-[#facc15] group-hover:text-[#ffd93d] transition-colors" />
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">LinkedIn</span>
              </a>
              <a
                href="https://github.com/sqaadvisory/relampo"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-2 transition-all hover:scale-110"
                aria-label="GitHub"
              >
                <Github className="h-6 w-6 text-[#facc15] group-hover:text-[#ffd93d] transition-colors" />
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">GitHub</span>
              </a>
              <a
                href="https://discord.gg/relampo"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-2 transition-all hover:scale-110"
                aria-label="Discord"
              >
                <MessageCircle className="h-6 w-6 text-[#facc15] group-hover:text-[#ffd93d] transition-colors" />
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">Discord</span>
              </a>
              <a
                href="https://instagram.com/relampo.dev"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-2 transition-all hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6 text-[#facc15] group-hover:text-[#ffd93d] transition-colors" />
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">Instagram</span>
              </a>
              <a
                href="https://youtube.com/@relampo"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-2 transition-all hover:scale-110"
                aria-label="YouTube"
              >
                <Youtube className="h-6 w-6 text-[#facc15] group-hover:text-[#ffd93d] transition-colors" />
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">YouTube</span>
              </a>
              <a
                href="https://docs.relampo.dev"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-2 transition-all hover:scale-110"
                aria-label={language === 'en' ? 'Documentation' : 'Documentación'}
              >
                <BookOpen className="h-6 w-6 text-[#facc15] group-hover:text-[#ffd93d] transition-colors" />
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  {language === 'en' ? 'Docs' : 'Docs'}
                </span>
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex items-center justify-center gap-2 pt-8 border-t border-white/5 text-sm text-zinc-500">
            <Zap className="h-4 w-4 text-[#facc15]" />
            <span>{t.footer.copyright}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}