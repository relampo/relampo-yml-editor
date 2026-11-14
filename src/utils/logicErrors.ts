// Contract, section 10: a logic job in the cloud that gives no result has a
// short code. The web app sends it with `relampo:logic-result`, and the agent
// sends it in the body of a route that gets its result from a job:
// `{ "error": "<code>", "message": "..." }`. The user sees a sentence.

const busy: [en: string, es: string] = [
  'Relampo took too long to process this. Try again.',
  'Relampo tardó demasiado en procesar esto. Intenta de nuevo.',
];
const license: [en: string, es: string] = ['Your Relampo license is not active.', 'Tu licencia de Relampo no está activa.'];
const failed: [en: string, es: string] = [
  'Relampo could not process this. Try again.',
  'Relampo no pudo procesar esto. Intenta de nuevo.',
];

const TEXTS = new Map<string, [en: string, es: string]>([
  ['feature_not_enabled', ['Your plan does not include this feature.', 'Tu plan no incluye esta función.']],
  [
    'limit_reached',
    [
      'You reached the limit of your plan for today. Try again tomorrow, or change your plan.',
      'Llegaste al límite de tu plan para hoy. Intenta de nuevo mañana o cambia de plan.',
    ],
  ],
  ['too_large', ['This is larger than 128 MB. Relampo cannot process it.', 'Esto supera 128 MB. Relampo no puede procesarlo.']],
  [
    'logic_not_configured',
    ['This service is not available now. Try again later.', 'Este servicio no está disponible ahora. Intenta más tarde.'],
  ],
  ['license_revoked', license],
  ['license_expired', license],
  [
    'activation_revoked',
    [
      'This machine is not signed in to Relampo. Run `relampo login` on it.',
      'Esta máquina no tiene una sesión de Relampo. Ejecuta `relampo login` en ella.',
    ],
  ],
  [
    'invalid_input',
    ['Relampo could not read this script. Check that it is valid.', 'Relampo no pudo leer este script. Revisa que sea válido.'],
  ],
  [
    'script_changed',
    ['The script changed after the analysis. Analyze it again.', 'El script cambió después del análisis. Analízalo de nuevo.'],
  ],
  [
    'unsupported_format',
    ['This Relampo version is too old for this. Update Relampo.', 'Esta versión de Relampo es muy antigua para esto. Actualiza Relampo.'],
  ],
  ['timeout', busy],
  ['logic_timeout', busy],
  ['internal', failed],
  [
    'network',
    [
      'Could not reach Relampo. Check your internet connection and try again.',
      'No se pudo conectar con Relampo. Revisa tu conexión a internet e intenta de nuevo.',
    ],
  ],
  [
    'logic_unavailable',
    [
      'Your machine could not reach Relampo. Check its internet connection and try again.',
      'Tu máquina no pudo conectar con Relampo. Revisa su conexión a internet e intenta de nuevo.',
    ],
  ],
]);

/** A short code, for example `job_not_found`. A sentence of the agent is not one. */
const CODE = /^[a-z0-9]+(_[a-z0-9]+)+$/;

/**
 * The text for the error body of a backend route. A code of section 10 gives
 * its sentence, and a code that Studio does not know gives a general
 * sentence. A sentence of the agent stays as it is. Empty when the body has
 * no error.
 */
export function agentErrorText(body: { error?: unknown; message?: unknown } | null): string {
  const error = typeof body?.error === 'string' ? body.error : '';
  const texts = TEXTS.get(error) ?? (CODE.test(error) ? failed : null);
  if (!texts) return error;
  // ponytail: the language of the page address, like LanguageProvider at its
  // start. A language change after that does not reach these texts.
  const text = texts[new URLSearchParams(window.location.search).get('lang') === 'es' ? 1 : 0];
  // The message of a failed job says what is wrong in the script. It is in English.
  return error === 'invalid_input' && typeof body?.message === 'string' ? `${text} ${body.message}` : text;
}
