export const esTranslations = {
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
        modeVirtualUsers: 'Los porcentajes se aplican sobre el total de usuarios virtuales definidos en el escenario.',
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
        issueInvalidPercentage: 'Cada elemento hijo debe definir un porcentaje mayor que 0 y menor o igual que 100.',
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

    intent: {
      overview: {
        title: 'Resumen',
        description:
          'El modo intent mapea directamente al contrato del controlador backend. Define el objetivo, elige la agresividad del controlador y el editor completará automáticamente los tiempos, guardrails y límites SLO.',
      },
      sections: {
        contract: {
          title: 'Contrato Intent',
          description: 'Estos campos definen qué debe perseguir el controlador y qué tan rápido debe reaccionar.',
        },
        general: {
          title: 'Configuración General',
          description: 'Valores principales de tiempo de ejecución para el controlador intent.',
        },
        guardrails: {
          title: 'Guardrails de Ejecución',
          description: 'Limita el controlador para que sepa cuál es la concurrencia mínima y máxima que puede usar.',
        },
        slo: {
          title: 'Límites SLO',
          description: 'Estos valores se muestran como referencia y se generan automáticamente según el perfil intent seleccionado.',
        },
      },
      fields: {
        targetUnit: 'Unidad Objetivo',
        targetValue: 'Valor Objetivo',
        aggressiveness: 'Agresividad',
        warmup: 'Warmup',
        window: 'Ventana',
        duration: 'Duración',
        rampUp: 'Ramp Up',
        rampDown: 'Ramp Down',
        iteration: 'Iteración',
        minVus: 'VUs Mínimos',
        maxVus: 'VUs Máximos',
        average: 'Promedio',
        p95MaxMs: 'P95 Máx (ms)',
        errorMaxPct: 'Error Máx (%)',
        error4xxMaxPct: '4xx Máx (%)',
        error5xxMaxPct: '5xx Máx (%)',
      },
      options: {
        targetUnitRps: 'RPS',
        targetUnitVus: 'VUs',
        aggressivenessLow: 'Baja',
        aggressivenessMedium: 'Media',
        aggressivenessHigh: 'Alta',
      },
      placeholders: {
        notApplicable: 'N/A',
      },
      helpers: {
        targetReqPerMinute: '{value} req/min',
        targetVuCount: 'Cantidad objetivo de VUs',
        aggressiveness: 'Controla qué tan rápido reacciona el controlador y qué tan estrictos son los SLO por defecto.',
        suggested: 'Sugerido: {value}',
        iteration: 'El modo intent normalmente deja esto vacío.',
        average: 'Guía visible para el tiempo de respuesta promedio esperado.',
      },
    },

    loadVisualization: {
      title: 'Visualización del Patrón de Carga',
      preview: 'Vista previa visual',
      summary: 'Pico {axis}: {peak} | Total: {total}',
      reference: 'Los rangos de tiempo se muestran como referencia según la configuración actual de carga.',
      throughputTarget: 'Throughput objetivo: {value} req/min.',
      executionPhases: 'Fases de Ejecución',
      warmupSummary: 'warmup {value}s',
      durationSummary: 'duración {value}s',
      labels: {
        time: 'Tiempo',
        users: 'Usuarios',
        rps: 'RPS',
      },
      phases: {
        warmup: 'warmup',
        violating: 'violando',
        recovering: 'recuperando',
        stable: 'estable',
      },
      ranges: {
        rampUp: 'Ramp Up',
        steady: 'Estable',
        ramp: 'Rampa',
        target: 'Objetivo',
        rampDown: 'Ramp Down',
      },
      intent: {
        behaviorVus:
          'Después del warmup, los VUs se ajustan alrededor del objetivo={target} dentro de {min}..{max} para mantener los SLOs.',
        behaviorRps:
          'Después del warmup, el RPS se ajusta alrededor del objetivo={target} respetando los SLOs y los guardrails de VU {min}..{max}.',
        vuBand:
          'Banda de control intent: el warmup es solo preparación (cian). Los ajustes comienzan en el marcador amarillo justo después del warmup.',
        rpsBand:
          'Banda RPS intent: el warmup es solo preparación y luego comienza la variabilidad controlada del RPS. Guardrails de VU: {min}..{max}.',
        targetReqPerMinute: '{value} req/min objetivo',
      },
    },

    sql: {
      helpers: {
        database: 'Elige el motor SQL que usa este request.',
        requestMode: 'Usa `query` para lecturas y `exec` para escrituras o sentencias DDL.',
        query: 'Mantén las variables en `params` en lugar de concatenarlas en el string del query.',
        params: {
          beforeVar: 'Usa YAML para arrays posicionales o mapas nombrados. Se admiten variables del escenario como',
          afterVar: '.',
        },
        resultMapping:
          "Guarda los resultados SQL en variables. Para un solo valor usa `jsonpath('$[0].id')`; para el conjunto completo usa `jsonpath('$')`.",
      },
    },

    // Estado vacío
    emptyState: {
      description: 'Crea un plan de pruebas desde cero o carga un archivo existente.',
      addBtn: 'Añadir un plan de prueba de performance',
    },
  },

  // Aviso de pantalla pequeña / bloqueo móvil
  mobileBlock: {
    eyebrow: 'Necesitas una pantalla mayor',
    title: 'Este editor está pensado para pantallas grandes',
    description:
      'El Editor YAML de Relampo necesita el espacio de un iPad o un dispositivo mayor para mostrar el árbol, el código y los detalles lado a lado sin compromisos.',
    requirement: 'Ábrelo en un iPad, laptop o escritorio (768px de ancho o más).',
    currentWidth: 'Estás a {width}px de ancho.',
    rotateHint: 'Si estás en una tableta, prueba a rotarla a horizontal.',
  },
} as const;
