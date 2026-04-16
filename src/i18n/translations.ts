export type Language = 'en' | 'es';

export const translations = {
  en: {
    // Navigation
    nav: {
      howItWorks: 'How it works',
      roadmap: 'Roadmap',
      league: 'Relampo League',
      team: 'Team',
      contact: 'Contact',
    },

    // Hero Section
    hero: {
      tagline: 'Performance testing made simple.',
      title: 'Modern load testing for engineering teams who value clarity and speed',
      subtitle: 'Record real traffic. Write readable Scripts. Run in the cloud for free. No local limitations.',
      goToWorkbench: 'Go to Workbench',
      availableNow: 'AVAILABLE NOW AND FOREVER',
    },

    // Quick Start
    quickStart: {
      title: 'Quick start',
      step1: {
        title: '1. Install CLI',
        command: 'npm install -g @relampo/cli',
      },
      step2: {
        title: '2. Record traffic',
        command: 'relampo record https://api.example.com',
      },
      step3: {
        title: '3. Run with overrides',
        command: 'relampo run script.yaml --var env=staging',
      },
    },

    // How It Works
    howItWorks: {
      title: 'How it works',
      startTesting: 'Start Testing',
      workflow: {
        step1: {
          title: 'Record or Import',
          description: 'Capture real traffic or convert existing tests',
          command: '$ relampo record --target https://api.myapp.dev',
        },
        step2: {
          title: 'Edit Script',
          description: 'Human-readable YAML your team can review',
          command: '$ relampo format api.yaml --write',
        },
        step3: {
          title: 'Validate Script',
          description: 'Catch errors before wasting test time',
          command: '$ relampo validate api.yaml',
        },
        step4: {
          title: 'Run with environment overrides',
          description: 'Promote the same YAML across dev, staging, and prod',
          command: '$ relampo run api.yaml --vars-file env/staging.yaml --var env=staging',
        },
      },
      fromRecordingToResults: 'From recording to results',
      inSimpleSteps: 'in 4 simple steps',
    },

    // Readable Scripts Section
    readableScripts: {
      badge: 'Readable Scripts',
      title: 'YAML that your',
      titleHighlight: 'whole team can read',
      description: "Relampo uses YAML for test scripts in a format that's",
      easyToRead: 'easy to read',
      review: 'review',
      versionControl: 'version-control',
      features: {
        declarative: {
          title: 'Declarative syntax',
          desc: 'Define what to test, not how to run it',
        },
        versionControlFriendly: {
          title: 'Version-control friendly',
          desc: 'Clean diffs in pull requests',
        },
        teamReadable: {
          title: 'Team-readable',
          desc: 'QA, developers, and ops understand the same script',
        },
        strictValidation: {
          title: 'Strict validation',
          desc: 'Catches indentation errors before execution',
        },
      },
      whyYamlTitle: 'Why YAML? (And the Indentation Question)',
      whyYamlDesc: "Yes, it's indentation-sensitive—like Python, Kubernetes, and Ansible. Relampo controls it with",
      strictValidationText: 'strict validation',
      catchesErrors: 'that catches errors before wasting test time.',
      validYaml: '✓ Valid YAML with advanced features',
      invalidYaml: '✗ Invalid YAML - common pitfall',
    },

    // Free Cloud Section
    freeCloud: {
      badge: 'Free Cloud Sandbox',
      title: 'Stop running tests',
      titleHighlight: 'on your laptop',
      description: 'Use our free cloud sandbox with',
      concurrentVUs: '500 concurrent VUs',
      and: 'and',
      hoursPerMonth: '33 hours/month',
      loadGeneration: 'of load generation.',
      zeroSetup: 'Zero setup, zero infrastructure headaches.',
      features: [
        'Consistent AMD EPYC nodes (2 vCPUs, 8GB RAM)',
        'Distributed load across 4 generator nodes',
        'No credit card required to start',
      ],
      specs: {
        virtualUsers: 'Virtual Users',
        monthlyBudget: 'Monthly Budget',
        cpu: 'CPU',
        memory: 'Memory',
        nodes: 'Nodes',
        architecture: 'Architecture',
        concurrent: 'concurrent',
        hours: 'hours',
        class: 'class',
        perNode: 'per node',
        generators: 'generators',
      },
      whatIncluded: "What's included?",
      includedFeatures: [
        'HTTP/HTTPS Recording',
        'Basic AI Correlation',
        'YAML Scripting & Validation',
        'Free Cloud Sandbox (500 VUs)',
        'Results Export & Analysis',
      ],
    },

    // Final CTA Section
    finalCta: {
      description: 'Write readable scripts. Run tests on cloud infrastructure. Get results faster. All for free.',
    },

    // Roadmap
    roadmap: {
      title: "What we're building",
      subtitle: 'End-to-end performance testing',
      comingSoon: 'Coming Soon',
      availableNow: 'AVAILABLE NOW AND FOREVER',
      cliTitle: 'Relampo CLI',
      e2eTitle: 'Relampo E2E UI',
      cliSubtitle: 'CLI-first today. Full E2E platform tomorrow.',
      cliFeatures: [
        'HTTP/HTTPS Recording',
        'Jmeter/Postman → YAML Converter',
        'Basic AI Correlation',
        'YAML Scripting & Validation',
        'Free Cloud Sandbox (500 VUs)',
        'Results Export & Analysis',
      ],
      features: [
        'End-to-end performance testing',
        'Recording (HTTP/HTTPS) + Converters (Postman/JMeter → YAML)',
        'AI-assisted correlation (auto-detect tokens/dynamic values)',
        'Debugging workflow (request visibility, replay, diffs)',
        'Distributed load generation at scale',
        'Monitoring during runs (system + app signals)',
        'AI results analysis (summaries, anomalies, comparisons)',
      ],
      core: {
        title: 'Core components',
        cli: {
          title: 'CLI',
          desc: 'Design, validate & execute tests from your terminal',
        },
        workbench: {
          title: 'Web UI',
          desc: 'Visual editor for script composition & debugging',
        },
        cloud: {
          title: 'Cloud',
          desc: '500 VUs free forever · Scalable distributed load',
        },
      },
    },

    // League
    league: {
      title: 'Relampo League',
      subtitle: 'Climb the ranks. Earn credits. Run bigger tests.',
      comingSoon: 'Coming Soon',
      leagueTitle: 'Compete with the',
      leagueSubtitle: 'performance testing community',
      leagueDescription:
        'Earn points for testing, contributing, and finding issues. Climb the ranks and win monthly rewards.',
      viewFullLeaderboard: 'View Full Leaderboard',
      joinLeague: 'Join Relampo League to compete, earn rewards, and climb the rankings',
      appliedAutomatically: 'Applied automatically for 1 month',
      howItWorks: {
        title: 'How Relampo League Works',
        performanceExplorers: 'Performance Explorers',
        performanceExplorersDesc: '+1 point per different project tested (max 10/month)',
        relampoContributors: 'Relampo Contributors',
        relampoContributorsDesc: '+2-10 points per accepted PR in YAML, CLI, Recorder, etc.',
        bugHunters: 'Bug Hunters',
        bugHuntersDesc: '+5 points per reported bug (approved & fixed)',
        points: [
          'Run tests to earn League Points.',
          'League Points determine your Tier.',
          'Higher Tiers unlock monthly bonus credits.',
        ],
      },
      monthlyRewards: {
        title: 'Monthly Rewards — Top 3',
        virtualUsers: 'Virtual Users',
        loadGenerators: 'Load Generators',
        note: 'Top 3 players get bonus on top of tier rewards',
      },
      powerTiers: {
        title: 'Power Tiers',
        yourTier: 'Your Tier',
        lightningStrike: {
          name: 'Lightning Strike',
          points: '0–249 pts',
          bonus: 'No monthly bonus',
        },
        thunderClap: {
          name: 'Thunder Clap',
          points: '250–999 pts',
          bonus: '+150 VUs/month',
        },
        stormSurge: {
          name: 'Storm Surge',
          points: '1,000–4,999 pts',
          bonus: '+400 VUs & +2 generators/month',
        },
        cosmicBolt: {
          name: 'Cosmic Bolt',
          points: '5,000+ pts',
          bonus: '+750 VUs & +4 generators/month',
        },
      },
      leaderboard: {
        title: 'Leaderboard',
        monthly: 'Monthly',
        allTime: 'All-Time',
        rank: 'Rank',
        player: 'Player',
        points: 'Points',
        tier: 'Tier',
      },
    },

    // CTA
    cta: {
      title: 'Ready to make performance testing simple?',
      subtitle: 'Join the waitlist and be among the first to experience Relampo',
      titleLine1: 'Ready to simplify your',
      titleLine2: 'performance testing?',
      getStarted: 'Get Started',
      startTesting: 'Start Testing',
      getEarlyAccess: 'Get Early Access',
      joinWaitlist: 'Join Relampo E2E UI Waitlist',
      emailPlaceholder: 'Enter your email',
      subscribe: 'Join waitlist',
      successMessage: "Thanks! You're on the list.",
      errorMessage: 'Oops, something went wrong',
      questionsEmail: 'Questions? Email us at',
    },

    // Team
    team: {
      title: 'Meet the crew',
      members: {
        delvis: {
          role: 'Team Lead',
          bio: 'The one who started it all: created the first MVP and brought the team together. Faithful lover of performance testing, always looking for smarter (and less painful) ways to break systems before they break in production.',
        },
        angel: {
          role: 'Software Engineering Lead',
          bio: "The guy who turns ideas into real, working products. Full-stack mindset (backend + frontend) and super hands-on – he's the technical engine behind the team.",
        },
        violena: {
          role: 'Product Lead',
          bio: 'The organizer who brings structure and focus. She keeps the team aligned and makes sure all the effort actually turns into a clear, meaningful product.',
        },
        alayo: {
          role: 'AI & Data Engineer',
          bio: "Our AI and data enthusiast. He's the one adding intelligence to our performance processes, always thinking about automation, insights, and smarter decisions.",
        },
        chris: {
          role: 'Performance Solutions & QA Engineer',
          bio: "Performance expert with a real end-user perspective. He brings practical experience so the tool doesn't just look good, it actually works in real-world scenarios.",
        },
      },
    },

    // Footer
    footer: {
      copyright: '© 2026 Relampo · Performance testing made simple.',
      links: {
        twitter: 'Twitter',
        github: 'GitHub',
        docs: 'Docs',
        privacy: 'Privacy',
      },
    },

    // Sidebar
    sidebar: {
      dashboard: 'Dashboard',
      workbench: 'Workbench',
      yamlEditor: 'YAML Editor',
      projects: 'Projects',
      settings: 'Settings',
      help: 'Help',
      designDoc: 'Design Doc',
    },

    // CLI Tabs
    cliTabs: {
      recorder: 'Recorder',
      yamlEditor: 'YAML Editor',
      correlation: 'Correlation',
    },

    // TopBar
    topBar: {
      user: 'User Name',
      team: 'user@relampo.io',
      logout: 'Logout',
    },

    // Dashboard
    dashboard: {
      title: 'Performance Dashboard',
      subtitle: 'Monitor your load testing metrics and recent activity',
      activeTests: 'Active Tests',
      avgResponseTime: 'Avg Response Time',
      successRate: 'Success Rate',
      throughput: 'Throughput',
      recentTests: 'Recent Tests',
      ecommerceTest: 'E-Commerce Load Test',
      apiGatewayTest: 'API Gateway Performance',
      mobileBackendTest: 'Mobile Backend Stress Test',
      today: 'Today',
      yesterday: 'Yesterday',
      status: {
        passed: 'Passed',
        running: 'Running',
        failed: 'Failed',
      },
    },

    // Workbench
    workbench: {
      recording: 'Recording',
      scripting: 'Scripting',
      correlation: 'Correlation AI',
      debugging: 'Debugging',
      generation: 'Load Generation',
      monitoring: 'Monitoring',
    },

    // Projects
    projects: {
      title: 'Projects',
      subtitle: 'Manage your load testing projects',
      createNew: 'Create New Project',
      allProjects: 'All Projects',
      recent: 'Recent',
      archived: 'Archived',
    },

    // Settings
    settings: {
      title: 'Settings',
      subtitle: 'Configure your Relampo preferences',
      general: 'General',
      account: 'Account',
      team: 'Team',
      billing: 'Billing',
    },

    // YAML Editor
    yamlEditor: {
      title: 'YAML Editor',
      uploadYaml: 'Upload YAML',
      validate: 'Validate',
      downloadYaml: 'Download YAML',
      downloadProject: 'Download ZIP',
      validYaml: '✅ Valid YAML according to Relampo v1 specification',
      codeView: 'Code',
      treeView: 'Tree',
      details: 'Details',
      noNodeSelected: 'Select a node to view details',
      selectNode: 'Select a node from the tree',
      viewDetails: 'to view its details',

      // Common labels
      common: {
        name: 'Name',
        description: 'Description',
        value: 'Value',
        add: 'Add',
        remove: 'Remove',
        delete: 'Delete',
        enable: 'Enable',
        disable: 'Disable',
        duplicate: 'Duplicate',
        copy: 'Copy',
        browse: 'Browse',
        configuration: 'Configuration',
        properties: 'Properties',
        comments: 'Comments',
        noProperties: 'No additional properties',
      },

      // Context menu
      contextMenu: {
        addHeader: 'Add Header',
        addHeaders: 'Add Headers',
        addFile: 'Add File',
        addRequest: 'Add Request',
        addGroup: 'Add Group',
        addAssertion: 'Add Assertion',
        addExtractor: 'Add Extractor',
        addSpark: 'Add Spark',
        addThinkTime: 'Add Think Time',
      },

      // Spark editor
      spark: {
        quickReference: 'Quick Reference:',
        checkSyntax: 'Check Syntax',
        checking: 'Checking...',
      },

      balanced: {
        name: 'Balanced Controller',
        contextDescription: 'Distribute execution by percentage',
        status: {
          ready: 'Ready',
          emptyDraft: 'Empty Draft',
          needsCompletion: 'Needs Completion',
          draft: 'Draft',
        },
        descriptions: {
          typeTotal:
            'Distribute 100% of the in-scope traffic across the selected elements. Everything must be covered inside this controller.',
          typeParcial:
            'Assign independent percentages only to the selected elements. The rest of the flow can continue outside this controller.',
          modeIterations: 'Percentages are applied to the total iterations defined in the scenario.',
          modeVirtualUsers: 'Percentages are applied to the total virtual users defined in the scenario.',
        },
        summary: {
          heading: 'Balanced Controller',
          titleTotal: 'Distribute all traffic inside this controller',
          titleParcial: 'Apply targeted partial traffic to selected elements',
          coverageSnapshot: 'Coverage Snapshot',
          type: 'Type',
          typeValueTotal: 'Total',
          typeValueParcial: 'Partial',
          typeHelperTotal: 'Must close at 100%.',
          typeHelperParcial: 'Can stay below 100%.',
          scope: 'Scope',
          scopeValueIterations: 'Iterations',
          scopeValueVirtualUsers: 'Virtual Users',
          scopeHelperIterations: 'Based on scenario iterations.',
          scopeHelperVirtualUsers: 'Based on scenario virtual users.',
          included: 'Included',
          includedValue: '{count} item(s)',
          includedHelper: 'Only child nodes inside this controller participate.',
        },
        actions: {
          distributeEvenly: 'Distribute Evenly',
        },
        checklist: {
          title: 'Setup Checklist',
          selectLabel: 'Select at least one request or controller',
          selectHelperEmpty: 'Add or drag child elements into this controller.',
          selectHelperFilled: '{count} element(s) currently included.',
          assignLabel: 'Assign a valid percentage to every selected element',
          assignHelperValid: 'All visible percentage fields are within range.',
          assignHelperInvalid: '{count} element(s) still need a value between 1 and 100.',
          totalLabel: 'Reach exactly 100% coverage',
          partialLabel: 'Review the intended partial coverage',
          totalHelper: 'Current assigned total: {total}%.',
          partialHelper: 'Current assigned total: {total}%. Partial mode can stay below 100%.',
        },
        nextStep: {
          title: 'Next Step',
          heading: 'Add child elements to activate the distribution.',
          step1: '1. Add or drag requests into the controller.',
          step2: '2. Assign a percentage to each selected child.',
          step3Total: '3. Reach exactly 100% before execution.',
          step3Parcial: '3. Confirm the partial coverage you want to own.',
        },
        fields: {
          balanceType: 'Balance Type',
          executionMode: 'Execution Mode',
          optionTotal: 'total',
          optionParcial: 'partial',
          optionIterations: 'Iterations',
          optionVirtualUsers: 'Virtual Users',
          percentage: 'Percentage',
        },
        alerts: {
          attentionNeeded: 'Attention Needed',
          validTotal: 'Balanced Controller total is valid and ready to serialize.',
          validParcial: 'Balanced Controller partial is valid and ready to serialize.',
          issueMissingChildren: 'Add at least one request or controller inside this Balanced Controller.',
          issueInvalidPercentage:
            'Each child element must define a percentage greater than 0 and less than or equal to 100.',
          issueInvalidTotal: 'The total assigned percentage must be exactly 100. Current total: {total}%.',
        },
        included: {
          title: 'Included Elements',
          description: 'These are the only elements that this Balanced Controller will manage.',
          count: '{count} item(s)',
          childDescriptionTotal:
            'This element shares the entire scope with the other selected elements. Its percentage contributes to the required 100%.',
          childDescriptionParcial:
            'This element receives only the partial percentage configured here. The rest of the flow may continue outside this controller.',
          invalidPercentage: 'Enter a value between 1 and 100.',
          appliedIterations: 'Applied against the total iterations in scope.',
          appliedVirtualUsers: 'Applied against the total virtual users in scope.',
          emptyTitle: 'No elements selected yet',
          emptyDescription:
            'Add or drag requests and supported child controllers here. Each selected element will receive its own percentage inside this Balanced Controller.',
          emptyStep1: 'Use the add menu or drag nodes into this controller.',
          emptyStep2: 'Assign a percentage between 1 and 100 to each included element.',
          emptyStep3Total: 'Reach exactly 100% coverage before execution.',
          emptyStep3Parcial: 'Review the partial coverage you want this controller to own.',
        },
        itemLabels: {
          request: 'HTTP Request',
          sql: 'SQL Step',
          group: 'Group',
          transaction: 'Transaction',
          if: 'If Controller',
          loop: 'Loop Controller',
          retry: 'Retry Controller',
        },
      },

      // Empty state
      emptyState: {
        description: 'Create a performance test plan from scratch or upload an existing file.',
        addBtn: 'Add a performance test plan',
      },
    },
  },

  es: {
    // Navegación
    nav: {
      howItWorks: 'Cómo funciona',
      roadmap: 'Desarrollo',
      league: 'Relampo League',
      team: 'Equipo',
      contact: 'Contacto',
    },

    // Sección Hero
    hero: {
      tagline: 'Pruebas de rendimiento simplificadas.',
      title: 'Pruebas de carga modernas para equipos de ingeniería que valoran la claridad y la velocidad',
      subtitle: 'Graba tráfico real. Escribe Scripts legibles. Ejecuta en la nube gratis. Sin limitaciones locales.',
      goToWorkbench: 'Ir al Workbench',
      availableNow: 'DISPONIBLE AHORA Y PARA SIEMPRE',
    },

    // Inicio Rápido
    quickStart: {
      title: 'Inicio rápido',
      step1: {
        title: '1. Instalar CLI',
        command: 'npm install -g @relampo/cli',
      },
      step2: {
        title: '2. Grabar tráfico',
        command: 'relampo record https://api.ejemplo.com',
      },
      step3: {
        title: '3. Ejecutar con overrides',
        command: 'relampo run script.yaml --var env=staging',
      },
    },

    // Cómo Funciona
    howItWorks: {
      title: 'Cómo funciona',
      startTesting: 'Comenzar Pruebas',
      workflow: {
        step1: {
          title: 'Grabar o Importar',
          description: 'Captura tráfico real o convierte tests existentes',
          command: '$ relampo record --target https://api.miapp.dev',
        },
        step2: {
          title: 'Editar Script',
          description: 'YAML legible que tu equipo puede revisar',
          command: '$ relampo format api.yaml --write',
        },
        step3: {
          title: 'Validar Script',
          description: 'Detecta errores antes de perder tiempo',
          command: '$ relampo validate api.yaml',
        },
        step4: {
          title: 'Ejecutar con overrides por ambiente',
          description: 'Promueve el mismo YAML entre dev, staging y prod',
          command: '$ relampo run api.yaml --vars-file env/staging.yaml --var env=staging',
        },
      },
      fromRecordingToResults: 'Desde grabación a resultados',
      inSimpleSteps: 'en 4 pasos simples',
    },

    // Sección de Scripts Legibles
    readableScripts: {
      badge: 'Scripts Legibles',
      title: 'YAML que tu',
      titleHighlight: 'equipo completo puede leer',
      description: 'Relampo usa YAML para scripts de prueba en un formato que es',
      easyToRead: 'fácil de leer',
      review: 'revisar',
      versionControl: 'control de versiones',
      features: {
        declarative: {
          title: 'Sintaxis declarativa',
          desc: 'Define qué probar, no cómo ejecutarlo',
        },
        versionControlFriendly: {
          title: 'Amigable con el control de versiones',
          desc: 'Diferencias limpias en solicitudes de extracción',
        },
        teamReadable: {
          title: 'Legible para el equipo',
          desc: 'QA, desarrolladores y ops entienden el mismo script',
        },
        strictValidation: {
          title: 'Validación estricta',
          desc: 'Detecta errores de indentación antes de la ejecución',
        },
      },
      whyYamlTitle: '¿Por qué YAML? (Y la Pregunta de la Indentación)',
      whyYamlDesc: 'Sí, es sensible a la indentación—como Python, Kubernetes y Ansible. Relampo lo controla con',
      strictValidationText: 'validación estricta',
      catchesErrors: 'que detecta errores antes de perder tiempo en pruebas.',
      validYaml: '✓ YAML válido con características avanzadas',
      invalidYaml: '✗ YAML inválido - trampa común',
    },

    // Sección de Nube Gratuita
    freeCloud: {
      badge: 'Sandbox de Nube Gratuito',
      title: 'Deja de ejecutar pruebas',
      titleHighlight: 'en tu laptop',
      description: 'Usa nuestro sandbox de nube gratuito con',
      concurrentVUs: '500 VUs concurrentes',
      and: 'y',
      hoursPerMonth: '33 horas/mes',
      loadGeneration: 'de generación de carga.',
      zeroSetup: 'Configuración cero, sin dolores de cabeza de infraestructura.',
      features: [
        'Nodos AMD EPYC consistentes (2 vCPUs, 8GB RAM)',
        'Carga distribuida en 4 nodos generadores',
        'No se requiere tarjeta de crédito para comenzar',
      ],
      specs: {
        virtualUsers: 'Usuarios Virtuales',
        monthlyBudget: 'Presupuesto Mensual',
        cpu: 'CPU',
        memory: 'Memoria',
        nodes: 'Nodos',
        architecture: 'Arquitectura',
        concurrent: 'concurrentes',
        hours: 'horas',
        class: 'clase',
        perNode: 'por nodo',
        generators: 'generadores',
      },
      whatIncluded: '¿Qué se incluye?',
      includedFeatures: [
        'Grabación HTTP/HTTPS',
        'Correlación básica con IA',
        'Scripting & Validación YAML',
        'Sandbox de Nube Gratuito (500 VUs)',
        'Exportación & Análisis de Resultados',
      ],
    },

    // Sección CTA Final
    finalCta: {
      description:
        'Escribe scripts legibles. Ejecuta pruebas en infraestructura en nube. Obtén resultados más rápido. Todo gratis.',
    },

    // Hoja de Ruta
    roadmap: {
      title: 'Lo que estamos construyendo',
      subtitle: 'Pruebas de rendimiento end-to-end',
      comingSoon: 'Próximamente',
      availableNow: 'DISPONIBLE AHORA Y PARA SIEMPRE',
      cliTitle: 'Relampo CLI',
      e2eTitle: 'Relampo E2E UI',
      cliSubtitle: 'CLI primero hoy. Plataforma E2E completa mañana.',
      cliFeatures: [
        'Grabación HTTP/HTTPS',
        'Convertidor Jmeter/Postman → YAML',
        'Correlación básica con IA',
        'Scripting & Validación YAML',
        'Sandbox de Nube Gratuito (500 VUs)',
        'Exportación & Análisis de Resultados',
      ],
      features: [
        'Pruebas de rendimiento end-to-end',
        'Grabación (HTTP/HTTPS) + Convertidores (Postman/JMeter → YAML)',
        'Correlación asistida por IA (auto-detectar tokens/valores dinámicos)',
        'Flujo de depuración (visibilidad de requests, replay, diffs)',
        'Generación de carga distribuida a escala',
        'Monitoreo durante ejecuciones (señales del sistema + app)',
        'Análisis de resultados con IA (resúmenes, anomalías, comparaciones)',
      ],
      core: {
        title: 'Componentes principales',
        cli: {
          title: 'CLI',
          desc: 'Diseña, valida y ejecuta tests desde tu terminal',
        },
        workbench: {
          title: 'Web UI',
          desc: 'Editor visual para composición y depuración de scripts',
        },
        cloud: {
          title: 'Cloud',
          desc: '500 VUs gratis para siempre · Carga distribuida escalable',
        },
      },
    },

    // Liga
    league: {
      title: 'Relampo League',
      subtitle: 'Sube de rango. Gana créditos. Ejecuta tests más grandes.',
      comingSoon: 'Próximamente',
      leagueTitle: 'Compite con la',
      leagueSubtitle: 'comunidad de pruebas de rendimiento',
      leagueDescription:
        'Gana puntos probando, contribuyendo y encontrando problemas. Sube de rango y gana recompensas mensuales.',
      viewFullLeaderboard: 'Ver tabla de clasificación completa',
      joinLeague: 'Únete a Relampo League para competir, ganar recompensas y escalar posiciones',
      appliedAutomatically: 'Aplicado automáticamente por 1 mes',
      howItWorks: {
        title: 'Cómo funciona Relampo League',
        performanceExplorers: 'Exploradores de Rendimiento',
        performanceExplorersDesc: '+1 punto por proyecto diferente probado (máx 10/mes)',
        relampoContributors: 'Contribuidores de Relampo',
        relampoContributorsDesc: '+2-10 puntos por PR aceptado en YAML, CLI, Recorder, etc.',
        bugHunters: 'Cazadores de Bugs',
        bugHuntersDesc: '+5 puntos por bug reportado (aprobado y corregido)',
        points: [
          'Ejecuta tests para ganar Puntos de Liga.',
          'Los Puntos de Liga determinan tu Nivel.',
          'Niveles más altos desbloquean créditos bonus mensuales.',
        ],
      },
      monthlyRewards: {
        title: 'Recompensas Mensuales — Top 3',
        virtualUsers: 'Usuarios Virtuales',
        loadGenerators: 'Generadores de Carga',
        note: 'Top 3 jugadores obtienen bonus adicional a las recompensas de nivel',
      },
      powerTiers: {
        title: 'Niveles de Poder',
        yourTier: 'Tu Nivel',
        lightningStrike: {
          name: 'Rayo Inicial',
          points: '0–249 pts',
          bonus: 'Sin bonus mensual',
        },
        thunderClap: {
          name: 'Trueno',
          points: '250–999 pts',
          bonus: '+150 VUs/mes',
        },
        stormSurge: {
          name: 'Tormenta',
          points: '1,000–4,999 pts',
          bonus: '+400 VUs & +2 generadores/mes',
        },
        cosmicBolt: {
          name: 'Rayo Cósmico',
          points: '5,000+ pts',
          bonus: '+750 VUs & +4 generadores/mes',
        },
      },
      leaderboard: {
        title: 'Tabla de clasificación',
        monthly: 'Mensual',
        allTime: 'Histórico',
        rank: 'Rango',
        player: 'Jugador',
        points: 'Puntos',
        tier: 'Nivel',
      },
    },

    // CTA
    cta: {
      title: '¿Listo para simplificar las pruebas de rendimiento?',
      subtitle: 'Únete a la lista de espera y sé de los primeros en experimentar Relampo',
      titleLine1: '¿Listo para simplificar tus',
      titleLine2: 'pruebas de rendimiento?',
      getStarted: 'Comenzar',
      startTesting: 'Comenzar Pruebas',
      getEarlyAccess: 'Obtener Acceso Anticipado',
      joinWaitlist: 'Unirse a la Lista de Espera de Relampo E2E UI',
      emailPlaceholder: 'Ingresa tu email',
      subscribe: 'Unirse a lista de espera',
      successMessage: '¡Gracias! Estás en la lista.',
      errorMessage: 'Ups, algo salió mal',
      questionsEmail: '¿Preguntas? Escríbenos a',
    },

    // Equipo
    team: {
      title: 'Conoce al equipo',
      members: {
        delvis: {
          role: 'Líder del Equipo',
          bio: 'El que inició todo: creó el primer MVP y unió al equipo. Amante fiel de las pruebas de rendimiento, siempre busca formas más inteligentes (y menos dolorosas) de romper sistemas antes de que se rompan en producción.',
        },
        angel: {
          role: 'Líder de Ingeniería de Software',
          bio: 'El que convierte ideas en productos reales y funcionales. Mentalidad full-stack (backend + frontend) y muy práctico: es el motor técnico detrás del equipo.',
        },
        violena: {
          role: 'Líder de Producto',
          bio: 'La organizadora que aporta estructura y enfoque. Mantiene al equipo alineado y se asegura de que todo el esfuerzo se convierta en un producto claro y significativo.',
        },
        alayo: {
          role: 'Ingeniero de IA y Datos',
          bio: 'Nuestro entusiasta de IA y datos. Es quien agrega inteligencia a nuestros procesos de rendimiento, siempre pensando en automatización, insights y decisiones más inteligentes.',
        },
        chris: {
          role: 'Ingeniero de Soluciones de Rendimiento y QA',
          bio: 'Experto en rendimiento con una perspectiva real del usuario final. Aporta experiencia práctica para que la herramienta no solo se vea bien, sino que funcione en escenarios del mundo real.',
        },
      },
    },

    // Footer
    footer: {
      copyright: '© 2026 Relampo · Pruebas de rendimiento simplificadas.',
      links: {
        twitter: 'Twitter',
        github: 'GitHub',
        docs: 'Documentación',
        privacy: 'Privacidad',
      },
    },

    // Sidebar
    sidebar: {
      dashboard: 'Tablero',
      workbench: 'Workbench',
      yamlEditor: 'Editor YAML',
      projects: 'Proyectos',
      settings: 'Configuración',
      help: 'Ayuda',
      designDoc: 'Documento de Diseño',
    },

    // CLI Tabs
    cliTabs: {
      recorder: 'Grabador',
      yamlEditor: 'Editor YAML',
      correlation: 'Correlación',
    },

    // TopBar
    topBar: {
      user: 'Usuario',
      team: 'usuario@relampo.io',
      logout: 'Cerrar Sesión',
    },

    // Dashboard
    dashboard: {
      title: 'Tablero de Rendimiento',
      subtitle: 'Monitorea tus métricas de prueba de carga y actividad reciente',
      activeTests: 'Pruebas Activas',
      avgResponseTime: 'Tiempo de Respuesta Promedio',
      successRate: 'Tasa de Éxito',
      throughput: 'Rendimiento',
      recentTests: 'Pruebas Recientes',
      ecommerceTest: 'Prueba de Carga de Comercio Electrónico',
      apiGatewayTest: 'Rendimiento de Gateway de API',
      mobileBackendTest: 'Prueba de Estrés de Backend Móvil',
      today: 'Hoy',
      yesterday: 'Ayer',
      status: {
        passed: 'Pasado',
        running: 'Ejecutándose',
        failed: 'Fallido',
      },
    },

    // Workbench
    workbench: {
      recording: 'Grabación',
      scripting: 'Scripting',
      correlation: 'Correlación AI',
      debugging: 'Depuración',
      generation: 'Generación de Carga',
      monitoring: 'Monitoreo',
    },

    // Projects
    projects: {
      title: 'Proyectos',
      subtitle: 'Administra tus proyectos de prueba de carga',
      createNew: 'Crear Nuevo Proyecto',
      allProjects: 'Todos los Proyectos',
      recent: 'Recientes',
      archived: 'Archivados',
    },

    // Settings
    settings: {
      title: 'Configuración',
      subtitle: 'Configura tus preferencias de Relampo',
      general: 'General',
      account: 'Cuenta',
      team: 'Equipo',
      billing: 'Facturación',
    },

    // YAML Editor
    yamlEditor: {
      title: 'Editor YAML',
      uploadYaml: 'Subir YAML',
      validate: 'Validar',
      downloadYaml: 'Descargar YAML',
      downloadProject: 'Descargar ZIP',
      validYaml: '✅ YAML válido según la especificación de Relampo v1',
      codeView: 'Código',
      treeView: 'Árbol',
      details: 'Detalles',
      noNodeSelected: 'Selecciona un nodo para ver detalles',
      selectNode: 'Selecciona un nodo del árbol',
      viewDetails: 'para ver sus detalles',

      // Common labels
      common: {
        name: 'Nombre',
        description: 'Descripción',
        value: 'Valor',
        add: 'Agregar',
        remove: 'Eliminar',
        delete: 'Eliminar',
        enable: 'Habilitar',
        disable: 'Deshabilitar',
        duplicate: 'Duplicar',
        copy: 'Copia',
        browse: 'Buscar',
        configuration: 'Configuración',
        properties: 'Propiedades',
        comments: 'Comentarios',
        noProperties: 'Sin propiedades adicionales',
      },

      // Context menu
      contextMenu: {
        addHeader: 'Agregar Header',
        addHeaders: 'Agregar Headers',
        addFile: 'Agregar Archivo',
        addRequest: 'Agregar Request',
        addGroup: 'Agregar Grupo',
        addAssertion: 'Agregar Assertion',
        addExtractor: 'Agregar Extractor',
        addSpark: 'Agregar Spark',
        addThinkTime: 'Agregar Think Time',
      },

      // Spark editor
      spark: {
        quickReference: 'Referencia Rápida:',
        checkSyntax: 'Verificar Sintaxis',
        checking: 'Verificando...',
      },

      balanced: {
        name: 'Controlador Balanceado',
        contextDescription: 'Distribuir la ejecución por porcentaje',
        status: {
          ready: 'Listo',
          emptyDraft: 'Borrador vacío',
          needsCompletion: 'Pendiente de completar',
          draft: 'Borrador',
        },
        descriptions: {
          typeTotal:
            'Repartes el 100% del alcance entre los elementos seleccionados. Todo debe quedar cubierto dentro de este controlador.',
          typeParcial:
            'Asignas porcentajes independientes solo a los elementos seleccionados. El resto del flujo puede seguir fuera de este controlador.',
          modeIterations: 'Los porcentajes se aplican sobre el total de iteraciones definidas en el escenario.',
          modeVirtualUsers:
            'Los porcentajes se aplican sobre el total de usuarios virtuales definidos en el escenario.',
        },
        summary: {
          heading: 'Controlador Balanceado',
          titleTotal: 'Distribuye todo el tráfico dentro de este controlador',
          titleParcial: 'Aplica tráfico parcial a los elementos seleccionados',
          coverageSnapshot: 'Resumen de cobertura',
          type: 'Tipo',
          typeValueTotal: 'Total',
          typeValueParcial: 'Parcial',
          typeHelperTotal: 'Debe cerrar en 100%.',
          typeHelperParcial: 'Puede quedar por debajo de 100%.',
          scope: 'Alcance',
          scopeValueIterations: 'Iteraciones',
          scopeValueVirtualUsers: 'Usuarios virtuales',
          scopeHelperIterations: 'Basado en las iteraciones del escenario.',
          scopeHelperVirtualUsers: 'Basado en los usuarios virtuales del escenario.',
          included: 'Incluidos',
          includedValue: '{count} elemento(s)',
          includedHelper: 'Solo participan los nodos hijos dentro de este controlador.',
        },
        actions: {
          distributeEvenly: 'Distribuir equitativamente',
        },
        checklist: {
          title: 'Checklist de configuración',
          selectLabel: 'Selecciona al menos un request o controlador',
          selectHelperEmpty: 'Agrega o arrastra elementos hijos dentro de este controlador.',
          selectHelperFilled: '{count} elemento(s) incluidos actualmente.',
          assignLabel: 'Asigna un porcentaje válido a cada elemento seleccionado',
          assignHelperValid: 'Todos los campos de porcentaje visibles están dentro del rango.',
          assignHelperInvalid: '{count} elemento(s) todavía necesitan un valor entre 1 y 100.',
          totalLabel: 'Alcanza exactamente el 100% de cobertura',
          partialLabel: 'Revisa la cobertura parcial prevista',
          totalHelper: 'Total asignado actual: {total}%.',
          partialHelper: 'Total asignado actual: {total}%. El modo parcial puede quedar por debajo del 100%.',
        },
        nextStep: {
          title: 'Siguiente paso',
          heading: 'Agrega elementos hijo para activar la distribución.',
          step1: '1. Agrega o arrastra requests dentro del controlador.',
          step2: '2. Asigna un porcentaje a cada hijo seleccionado.',
          step3Total: '3. Llega exactamente al 100% antes de ejecutar.',
          step3Parcial: '3. Confirma la cobertura parcial que quieres asumir.',
        },
        fields: {
          balanceType: 'Tipo de balance',
          executionMode: 'Modo de ejecución',
          optionTotal: 'total',
          optionParcial: 'parcial',
          optionIterations: 'Iteraciones',
          optionVirtualUsers: 'Usuarios virtuales',
          percentage: 'Porcentaje',
        },
        alerts: {
          attentionNeeded: 'Atención requerida',
          validTotal: 'El controlador balanceado total es válido y está listo para serializarse.',
          validParcial: 'El controlador balanceado parcial es válido y está listo para serializarse.',
          issueMissingChildren: 'Agrega al menos un request o controlador dentro de este controlador balanceado.',
          issueInvalidPercentage:
            'Cada elemento hijo debe definir un porcentaje mayor que 0 y menor o igual que 100.',
          issueInvalidTotal: 'El porcentaje total asignado debe ser exactamente 100. Total actual: {total}%.',
        },
        included: {
          title: 'Elementos incluidos',
          description: 'Estos son los únicos elementos que gestionará este controlador balanceado.',
          count: '{count} elemento(s)',
          childDescriptionTotal:
            'Este elemento comparte todo el alcance con los demás elementos seleccionados. Su porcentaje contribuye al 100% requerido.',
          childDescriptionParcial:
            'Este elemento recibe solo el porcentaje parcial configurado aquí. El resto del flujo puede continuar fuera de este controlador.',
          invalidPercentage: 'Introduce un valor entre 1 y 100.',
          appliedIterations: 'Se aplica sobre el total de iteraciones dentro del alcance.',
          appliedVirtualUsers: 'Se aplica sobre el total de usuarios virtuales dentro del alcance.',
          emptyTitle: 'Todavía no hay elementos seleccionados',
          emptyDescription:
            'Agrega o arrastra requests y controladores hijos compatibles aquí. Cada elemento seleccionado recibirá su propio porcentaje dentro de este controlador balanceado.',
          emptyStep1: 'Usa el menú de agregar o arrastra nodos dentro de este controlador.',
          emptyStep2: 'Asigna un porcentaje entre 1 y 100 a cada elemento incluido.',
          emptyStep3Total: 'Llega exactamente al 100% de cobertura antes de ejecutar.',
          emptyStep3Parcial: 'Revisa la cobertura parcial que quieres que gestione este controlador.',
        },
        itemLabels: {
          request: 'Request HTTP',
          sql: 'Paso SQL',
          group: 'Grupo',
          transaction: 'Transacción',
          if: 'Controlador If',
          loop: 'Controlador Loop',
          retry: 'Controlador Retry',
        },
      },

      // Estado vacío
      emptyState: {
        description: 'Crea un plan de pruebas desde cero o carga un archivo existente.',
        addBtn: 'Añadir un plan de prueba de performance',
      },
    },
  },
};
