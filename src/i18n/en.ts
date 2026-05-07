export const enTranslations = {
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
        sql: 'SQL Request',
        group: 'Group',
        transaction: 'Transaction',
        if: 'If Controller',
        loop: 'Loop Controller',
        retry: 'Retry Controller',
      },
    },

    intent: {
      overview: {
        title: 'Overview',
        description:
          'Intent mode maps directly to the backend controller contract. Define the target, choose controller aggressiveness, and the editor will fill the timing, guardrails, and SLO bounds automatically.',
      },
      sections: {
        contract: {
          title: 'Intent Contract',
          description: 'These fields define what the controller should chase and how quickly it should react.',
        },
        general: {
          title: 'General Setting',
          description: 'Core execution timing values for the intent controller.',
        },
        guardrails: {
          title: 'Execution Guardrails',
          description: 'Bound the controller so it knows the minimum and maximum concurrency it can use.',
        },
        slo: {
          title: 'SLO Bounds',
          description: 'These values are shown for visibility and generated automatically from the selected intent profile.',
        },
      },
      fields: {
        targetUnit: 'Target Unit',
        targetValue: 'Target Value',
        aggressiveness: 'Aggressiveness',
        warmup: 'Warmup',
        window: 'Window',
        duration: 'Duration',
        rampUp: 'Ramp Up',
        rampDown: 'Ramp Down',
        iteration: 'Iteration',
        minVus: 'Min VUs',
        maxVus: 'Max VUs',
        average: 'Average',
        p95MaxMs: 'P95 Max (ms)',
        errorMaxPct: 'Error Max (%)',
        error4xxMaxPct: '4xx Max (%)',
        error5xxMaxPct: '5xx Max (%)',
      },
      options: {
        targetUnitRps: 'RPS',
        targetUnitVus: 'VUs',
        aggressivenessLow: 'Low',
        aggressivenessMedium: 'Medium',
        aggressivenessHigh: 'High',
      },
      placeholders: {
        notApplicable: 'N/A',
      },
      helpers: {
        targetReqPerMinute: '{value} req/min',
        targetVuCount: 'Target VU count',
        aggressiveness: 'Controls how quickly the controller reacts and how strict the default SLOs are.',
        suggested: 'Suggested: {value}',
        iteration: 'Intent mode usually leaves this empty.',
        average: 'Displayed guidance for the expected average response time.',
      },
    },

    loadVisualization: {
      title: 'Load Pattern Visualization',
      preview: 'Visual preview',
      summary: 'Peak {axis}: {peak} | Total: {total}',
      reference: 'Time ranges are shown for reference based on the current load configuration.',
      throughputTarget: 'Target throughput: {value} req/min.',
      executionPhases: 'Execution Phases',
      warmupSummary: 'warmup {value}s',
      durationSummary: 'duration {value}s',
      labels: {
        time: 'Time',
        users: 'Users',
        rps: 'RPS',
      },
      phases: {
        warmup: 'warmup',
        violating: 'violating',
        recovering: 'recovering',
        stable: 'stable',
      },
      ranges: {
        rampUp: 'Ramp Up',
        steady: 'Steady',
        ramp: 'Ramp',
        target: 'Target',
        rampDown: 'Ramp Down',
      },
      intent: {
        behaviorVus: 'After warmup, VUs are adjusted around target={target} within {min}..{max} to keep SLOs.',
        behaviorRps:
          'After warmup, RPS is adjusted around target={target} while respecting SLOs and VU guardrails {min}..{max}.',
        vuBand: 'Intent control band: warmup is prep-only (cyan). Adjustments begin at the yellow marker right after warmup.',
        rpsBand: 'Intent RPS band: warmup is prep-only, then controlled RPS variability. VU guardrails: {min}..{max}.',
        targetReqPerMinute: '{value} req/min target',
      },
    },

    sql: {
      helpers: {
        database: 'Choose the SQL engine used by this request.',
        requestMode: 'Use `query` for reads and `exec` for writes or DDL statements.',
        query: 'Keep variables in `params` instead of concatenating them into the query string.',
        params: {
          beforeVar: 'Use YAML for positional arrays or named maps. Scenario variables such as',
          afterVar: 'are supported.',
        },
        resultMapping:
          "Save SQL results into variables. For a single value use `jsonpath('$[0].id')`; for the full result set use `jsonpath('$')`.",
      },
    },

    // Empty state
    emptyState: {
      description: 'Create a performance test plan from scratch or upload an existing file.',
      addBtn: 'Add a performance test plan',
    },
  },

  // Mobile / small-viewport block screen
  mobileBlock: {
    eyebrow: 'Bigger screen required',
    title: 'This editor is built for larger screens',
    description:
      'The Relampo YAML Editor needs the room of an iPad or larger device to show the tree, code, and details side by side without compromise.',
    requirement: 'Please open this on an iPad, laptop, or desktop (768px wide or more).',
    currentWidth: 'You are currently at {width}px wide.',
    rotateHint: 'If you are on a tablet, try rotating it to landscape.',
  },
} as const;
