// EN -> ES table for validation messages made by yamlSemanticValidation and componentConfiguration.
// The validators keep English text. Spanish is applied only when the message is shown.

const TRANSITION_ES: Record<string, string> = {
  Constant: 'Constante',
  'Ramp up': 'Incremento gradual',
  'Ramp down': 'Reducción gradual',
};

const LOAD_INTENT = 'la carga por objetivo';
const LOAD_THROUGHPUT = 'la carga por tasa de peticiones';

const EXACT: Record<string, string> = {
  'SQL default connection does not exist.': 'La conexión SQL predeterminada no existe.',
  'SQL connection_ref conflicts with inline connection.':
    'Selecciona una conexión SQL por nombre o una conexión embebida, sin combinar ambas.',
  'Select an existing SQL connection in SQL Defaults.': 'Selecciona una conexión existente en Valores SQL por defecto.',
  'This backend does not support SQL connection defaults. Update Relampo before running.':
    'Esta versión del motor no admite Valores SQL por defecto. Actualiza Relampo antes de ejecutar.',

  // Scenario scheduling
  'Choose sequential or parallel scenario scheduling for multiple scenarios.':
    'Elige la programación secuencial o paralela para varios escenarios.',
  'Multiple scenarios require unique, non-empty names.': 'Varios escenarios requieren nombres únicos y no vacíos.',
  // Load phases and stop rules
  'Ramp Up + Ramp Down cannot exceed Duration.': 'Incremento gradual + Reducción gradual no puede superar la Duración.',
  'Intent Warm-up + Ramp Up + Ramp Down cannot exceed Duration.': `Calentamiento + Incremento gradual + Reducción gradual no puede superar la Duración de ${LOAD_INTENT}.`,
  'Run until manually stopped cannot be combined with Duration or Iterations.':
    'Ejecutar hasta detener manualmente no se puede combinar con Duración o Iteraciones.',
  'Define Duration or Iterations, or explicitly enable Run until manually stopped.':
    'Define Duración o Iteraciones, o activa explícitamente Ejecutar hasta detener manualmente.',
  'Load stages are documented but unsupported by the editor and Pulse runtime. Remove stages before running.':
    'Las etapas de carga están documentadas, pero el editor y el runtime de Pulse no las admiten. Elimina stages antes de ejecutar.',
  // Throughput
  'Throughput load does not support segments. Remove segments before running.': `${cap(LOAD_THROUGHPUT)} no admite segmentos. Elimina segments antes de ejecutar.`,
  'Throughput load Duration must be a positive duration when provided.': `La Duración de ${LOAD_THROUGHPUT} debe ser una duración positiva cuando se indica.`,
  'Throughput load requires Target RPS greater than 0.': `${cap(LOAD_THROUGHPUT)} requiere RPS objetivo mayor que 0.`,
  'Throughput load requires Max VUs.': `${cap(LOAD_THROUGHPUT)} requiere VUs máximos.`,
  'Throughput Min VUs must be a positive integer.': `VUs mínimos de ${LOAD_THROUGHPUT} debe ser un entero positivo.`,
  'Throughput Max VUs must be a positive integer.': `VUs máximos de ${LOAD_THROUGHPUT} debe ser un entero positivo.`,
  'Throughput Min VUs cannot be greater than Max VUs.': `VUs mínimos de ${LOAD_THROUGHPUT} no puede ser mayor que VUs máximos.`,
  // Intent
  'Intent target unit must be either RPS or VUs.': `La unidad objetivo de ${LOAD_INTENT} debe ser RPS o VUs.`,
  'Intent target value must be greater than 0.': `El valor objetivo de ${LOAD_INTENT} debe ser mayor que 0.`,
  'Intent Min VUs must be greater than 0.': `VUs mínimos de ${LOAD_INTENT} debe ser mayor que 0.`,
  'Intent Max VUs must be greater than 0.': `VUs máximos de ${LOAD_INTENT} debe ser mayor que 0.`,
  'Intent Min VUs must be less than Max VUs.': `VUs mínimos de ${LOAD_INTENT} debe ser menor que VUs máximos.`,
  'Intent load requires Duration greater than 0.': `${cap(LOAD_INTENT)} requiere una Duración mayor que 0.`,
  'Intent Warmup cannot be negative.': `Calentamiento de ${LOAD_INTENT} no puede ser negativo.`,
  'Intent Ramp Up cannot be negative.': `Incremento gradual de ${LOAD_INTENT} no puede ser negativo.`,
  'Intent Ramp Down cannot be negative.': `Reducción gradual de ${LOAD_INTENT} no puede ser negativa.`,
  'Intent Window must be greater than 0.': `Ventana de ${LOAD_INTENT} debe ser mayor que 0.`,
  'Intent aggressiveness must be low, medium, or high.': `La agresividad de ${LOAD_INTENT} debe ser low, medium o high.`,
  'Intent Max VUs must be greater than or equal to the target VUs.': `VUs máximos de ${LOAD_INTENT} debe ser mayor o igual que los VUs objetivo.`,
  // Segments
  'Segments load requires at least one segment.': 'La carga por segmentos requiere al menos un segmento.',
  'Segments load Duration must be a positive duration when provided.':
    'La Duración de la carga por segmentos debe ser una duración positiva cuando se indica.',
  'Segment 1 cannot use Ramp down as the first segment.':
    'Segmento 1 no puede usar Reducción gradual como primer segmento.',
  // Component configuration (the path prefix is kept outside this table)
  'Only integer version 1 is supported.': 'Solo se admite la versión entera 1.',
  'Known configuration is unsupported at this scope.': 'La configuración conocida no se admite en este ámbito.',
  'Expected an explicit boolean.': 'Se esperaba un booleano explícito.',
  'Expected a positive literal duration string.': 'Se esperaba una duración literal positiva (texto).',
  'Expected a header map.': 'Se esperaba un mapa de encabezados.',
  'Header names must be unique without case.': 'Los nombres de encabezado deben ser únicos sin distinguir mayúsculas.',
  'Invalid HTTP header name or value.': 'Nombre o valor de encabezado HTTP no válido.',
  'Expected a string; empty strings remain explicit values.':
    'Se esperaba un texto; los textos vacíos siguen siendo valores explícitos.',
  'Expected an auth block.': 'Se esperaba un bloque de autenticación.',
  'Expected none, bearer, api_key or basic.': 'Se esperaba none, bearer, api_key o basic.',
  'Expected a string.': 'Se esperaba un texto.',
  'Required auth value is missing.': 'Falta un valor de autenticación obligatorio.',
  'Expected header or query.': 'Se esperaba header o query.',
  'Expected a datasource block.': 'Se esperaba un bloque de datasource.',
  'Expected a boolean.': 'Se esperaba un booleano.',
  'Expected csv or txt.': 'Se esperaba csv o txt.',
  'Expected an input file.': 'Se esperaba un archivo de entrada.',
  'Unsupported datasource mode.': 'Modo de datasource no admitido.',
  'Unsupported datasource strategy.': 'Estrategia de datasource no admitida.',
  'Expected stop or recycle.': 'Se esperaba stop o recycle.',
  'Expected a list or comma-separated string.': 'Se esperaba una lista o un texto separado por comas.',
  'Expected a column mapping.': 'Se esperaba un mapeo de columnas.',
  'variable_names and bind conflict.': 'variable_names y bind entran en conflicto.',
  'Source column cannot be empty.': 'La columna de origen no puede estar vacía.',
  'variable_names or bind is required.': 'Se requiere variable_names o bind.',
  'Datasource target names must be unique and cannot use reserved runtime names.':
    'Los nombres de destino del datasource deben ser únicos y no pueden usar nombres reservados del runtime.',
  'Expected a literal timer duration.': 'Se esperaba una duración literal del temporizador.',
  'Expected a duration or timer block.': 'Se esperaba una duración o un bloque de temporizador.',
  'Timer duration or distribution parameters are required.':
    'Se requiere la duración del temporizador o sus parámetros de distribución.',
  'Timer minimum cannot exceed maximum.': 'El mínimo del temporizador no puede superar el máximo.',
  'Expected uniform or normal.': 'Se esperaba uniform o normal.',
  'Expected an error policy block.': 'Se esperaba un bloque de política de errores.',
  'HTTP status policy cannot apply to SQL.': 'La política de estado HTTP no se puede aplicar a SQL.',
  'Unsupported error action for this protocol.': 'Acción de error no admitida para este protocolo.',
  'Expected a list; [] disables inherited assertions.': 'Se esperaba una lista; [] desactiva las aserciones heredadas.',
  'Expected an assertion block.': 'Se esperaba un bloque de aserción.',
  'SQL supports rows_returned, rows_affected and duration only.':
    'SQL solo admite rows_returned, rows_affected y duration.',
  'Expected non-negative numeric min/max bounds.': 'Se esperaban límites numéricos min/max no negativos.',
  'Minimum cannot exceed maximum.': 'El mínimo no puede superar el máximo.',
  'Expected a non-negative numeric equality value.': 'Se esperaba un valor numérico de igualdad no negativo.',
  'Expected a numeric value or min/max bounds.': 'Se esperaba un valor numérico o límites min/max.',
  'Duration uses non-negative milliseconds or a variable.': 'La duración usa milisegundos no negativos o una variable.',
  'Unsupported HTTP assertion criterion.': 'Criterio de aserción HTTP no admitido.',
  'Assertion value is required.': 'Se requiere el valor de la aserción.',
  'JSON assertion path is required.': 'Se requiere la ruta de la aserción JSON.',
  'Header name is required.': 'Se requiere el nombre del encabezado.',
  'Adoption belongs at script root.': 'La adopción va en la raíz del script.',
  'Defaults belong at script, scenario or stable container scope.':
    'Los defaults van a nivel de script, escenario o contenedor estable.',
  'New defaults require component_configuration_version: 1.':
    'Los defaults nuevos requieren component_configuration_version: 1.',
  'Expected a defaults block.': 'Se esperaba un bloque defaults.',
  'Expected a protocol defaults block.': 'Se esperaba un bloque de defaults de protocolo.',
  'Conflicts with the legacy policy key at this scope.':
    'Entra en conflicto con la clave de política heredada en este ámbito.',
  'Known property is not supported at this location.': 'La propiedad conocida no se admite en esta ubicación.',
  'Known protocol property requires its http or sql namespace.':
    'La propiedad de protocolo conocida requiere su espacio de nombres http o sql.',
  'Samplers cannot own defaults.': 'Los samplers no pueden tener defaults.',
  'Known configuration at this scope requires defaults.': 'La configuración conocida en este ámbito requiere defaults.',
  'SQL assertions and think_time require component_configuration_version: 1.':
    'Las aserciones SQL y think_time requieren component_configuration_version: 1.',
  'HTTP or scoped configuration cannot apply to local SQL.':
    'La configuración HTTP o con ámbito no se puede aplicar a SQL local.',
  'Effective criterion does not match SQL kind.': 'El criterio efectivo no coincide con el tipo de SQL.',
  'Unknown field is preserved and ignored.': 'El campo desconocido se conserva y se ignora.',
  'cookies.jar_scope only supports vu; each virtual user has its own cookie jar.':
    'cookies.jar_scope solo admite vu; cada usuario virtual tiene su propio almacén de cookies.',
  'This backend cannot disable extractors. Update Relampo before running this script.':
    'Este backend no permite desactivar extractores. Actualiza Relampo antes de ejecutar este script.',
  // Run and Debug capability errors
  'This backend does not support component configuration version 1. Update Relampo before running.':
    'Este backend no admite la configuración de componentes versión 1. Actualiza Relampo antes de ejecutar.',
};

function cap(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Segment N <suffix>" messages. {n} is the segment number.
const SEGMENT_SUFFIX: Record<string, string> = {
  'must be a mapping.': 'Segmento {n} debe ser un mapeo.',
  'must define a positive Duration.': 'Segmento {n} debe definir una Duración positiva.',
  'Name is required.': 'Segmento {n} requiere un Nombre.',
  'Transition is required.': 'Segmento {n} requiere una Transición.',
  'Transition must be Constant, Ramp up or Ramp down.':
    'La Transición del Segmento {n} debe ser Constante, Incremento gradual o Reducción gradual.',
  'must define exactly one target: Target RPS or Target VUs.':
    'Segmento {n} debe definir exactamente un objetivo: RPS objetivo o VUs objetivo.',
  'Target RPS must be numeric.': 'RPS objetivo del Segmento {n} debe ser numérico.',
  'Target RPS must be greater than 0.': 'RPS objetivo del Segmento {n} debe ser mayor que 0.',
  'Target VUs must be an integer.': 'VUs objetivo del Segmento {n} debe ser un entero.',
  'Target VUs must be greater than or equal to 0.': 'VUs objetivo del Segmento {n} debe ser mayor o igual que 0.',
  'Target RPS only supports Constant Transition.': 'RPS objetivo del Segmento {n} solo admite la Transición Constante.',
  'with Target RPS requires Min VUs.': 'Segmento {n} con RPS objetivo requiere VUs mínimos.',
  'with Target RPS requires Max VUs.': 'Segmento {n} con RPS objetivo requiere VUs máximos.',
  'Min VUs must be an integer greater than or equal to 0.':
    'VUs mínimos del Segmento {n} debe ser un entero mayor o igual que 0.',
  'Max VUs must be a positive integer.': 'VUs máximos del Segmento {n} debe ser un entero positivo.',
  'Max VUs must be greater than Min VUs.': 'VUs máximos del Segmento {n} debe ser mayor que VUs mínimos.',
  'can use Min VUs / Max VUs only with Target RPS.':
    'Segmento {n} puede usar VUs mínimos / VUs máximos solo con RPS objetivo.',
};

const PATTERNS: Array<[RegExp, (...groups: string[]) => string]> = [
  [/^"(.*)" must contain at least 1 related step\.$/, name => `"${name}" debe contener al menos 1 paso relacionado.`],
  [
    /^"(.*)" in Iterations mode requires scenario load Iterations greater than 0\.$/,
    name => `"${name}" en modo Iteraciones requiere que las Iteraciones de la carga del escenario sean mayores que 0.`,
  ],
  [
    /^Intent (.+) latency limit must be greater than 0\.$/,
    label => `El límite de latencia ${label} de ${LOAD_INTENT} debe ser mayor que 0.`,
  ],
  [
    /^Intent (.+) limit must be between 0 and 100\.$/,
    label => `El límite ${label} de ${LOAD_INTENT} debe estar entre 0 y 100.`,
  ],
  [
    /^Segments Duration total must equal load Duration \((.*)\)\. Current segments total is (.*)\.$/,
    (expected, current) =>
      `La Duración total de los segmentos debe ser igual a la Duración de la carga (${expected}). El total actual de los segmentos es ${current}.`,
  ],
  [
    /^Segment (\d+) Transition must be (Constant|Ramp up|Ramp down) from (.*) VUs to (.*) VUs\.$/,
    (n, label, from, to) =>
      `La Transición del Segmento ${n} debe ser ${TRANSITION_ES[label]} de ${from} VUs a ${to} VUs.`,
  ],
  [/^Conflicts with (.+)\.$/, target => `Entra en conflicto con ${target}.`],
  [
    /^Conflicts with the legacy (.+) declaration at this scope\.$/,
    key => `Entra en conflicto con la declaración heredada ${key} en este ámbito.`,
  ],
  [
    /^This backend does not support required component features: (.*)\.$/,
    list => `Este backend no admite las funciones de componente requeridas: ${list}.`,
  ],
  [
    /^Segment (\d+) (.+)$/,
    (n, suffix) => (SEGMENT_SUFFIX[suffix] ? SEGMENT_SUFFIX[suffix].replace('{n}', n) : `Segment ${n} ${suffix}`),
  ],
];

function translateBody(message: string): string | null {
  if (Object.hasOwn(EXACT, message)) return EXACT[message];
  for (const [pattern, build] of PATTERNS) {
    const match = pattern.exec(message);
    if (match) {
      const translated = build(...match.slice(1));
      if (translated !== message) return translated;
    }
  }
  return null;
}

/** Spanish text for a validation message, or the message unchanged when it has no translation. */
export function translateValidationMessageEs(message: string): string {
  const direct = translateBody(message);
  if (direct) return direct;
  // Component configuration errors look like "<yaml.path>: <message>".
  const prefixed = /^(\S+): ([\s\S]+)$/.exec(message);
  const body = prefixed && translateBody(prefixed[2]);
  return prefixed && body ? `${prefixed[1]}: ${body}` : message;
}
