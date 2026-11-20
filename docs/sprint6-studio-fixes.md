# Studio: correcciones de SPRINT 6

Base del editor: `origin/main`, commit `9353c48`. El repositorio del editor no tiene rama `develop`; Studio develop es un canal del CLI. Los cambios del backend parten de `origin/develop`, commit `57b6fe8`.

Ramas locales coordinadas:

- Editor: `RLP-787-studio-sprint6-fixes`.
- Backend: `RLP-811-studio-sprint6-runtime`.

La skill reutilizable está en `.agents/skills/relampo-studio-jira-fixes/SKILL.md` y también instalada en el directorio de skills de Codex. No se han publicado ramas, abierto PRs, cambiado tickets ni desplegado versiones.

| Ticket | Resultado | Evidencia |
|---|---|---|
| RLP-787 | Resumen con diez campos, dos filas de cinco en escritorio; modo Único/Paralelo/Secuencial. | YAMLRunView.test.tsx, YAMLRunView.multi.test.tsx |
| RLP-788 | Ya resuelto en la base: se conserva el resumen sin el bloque de detalles duplicado y Result scope. | YAMLRunView.test.tsx, YAMLRunView.multi.test.tsx |
| RLP-808 | Scheduling utiliza el Select compartido; no se muestran comentarios internos de versión. | TestDetails.scheduling.test.tsx, smoke Chrome |
| RLP-809 | Load Pattern de segmentos visible tras ejecutar; varios escenarios muestran sus perfiles y respetan Result scope. | Tres regresiones de ejecución en YAMLRunView.test.tsx |
| RLP-810 | Se elimina la lista inferior de segmentos; permanecen curva, ejes y tooltips. | LoadVisualization.test.tsx, smoke Chrome |
| RLP-811 | Contrato 1.1.1: metadatos preservados, precedencia de cookies alineada, jar_scope vu explícito y desactivación real de extractores. Un CLI sin extractor_enabled bloquea la ejecución de extractores desactivados. | studioCompatibility.test.tsx, OpsDetails.test.tsx, contrato offline, studio_extractor_enabled_test.go con servidor HTTP local |
| RLP-813 | Los SQL nuevos declaran una política local válida, independiente de stop_user heredado de HTTP. La política de escenario conserva su ubicación. | studioComponents.test.tsx y suites de políticas/serialización |
| RLP-814 | Debug usa el Select compartido conservando selección y estado deshabilitado. | YAMLDebugView.scenarios.test.tsx |
| RLP-815 | Buscar muestra Petición/Respuesta en español, también en sus ayudas. | Smoke Chrome en español y suite de búsqueda |
| RLP-816 | El enlace del reporte transmite lang; el endpoint genera una copia traducida sin alterar el resumen o el reporte cacheado. LANG queda incrustado para exportar/reabrir. | YAMLRunView.tsx (enlace con idioma), report_language_test.go por endpoint y copia independiente |
| RLP-817 | Los selectores del HTML exportado comparten dimensiones, bordes y estados de interacción consistentes con Studio, sin dependencias externas. | Suite del reporter y revisión de estilos autocontenidos |
| RLP-818 | Se retiran el título y los comentarios técnicos; se conserva el control funcional de valores compartidos con texto comprensible. | ComponentConfigurationDetails.test.tsx, smoke Chrome |
| RLP-819 | Variables usa nombres reales y valores enviados en body/headers, y expresiones built-in con los valores capturados; conserva invocaciones repetidas. No reevalúa funciones ni atribuye valores a strings mixtos. | debugRequests.test.ts, YAMLDebugView.rlp-debug.test.tsx |
| RLP-820 | El árbol permite añadir ficheros al request; se pueden configurar y conservar al guardar/importar. | studioComponents.test.tsx, smoke Chrome |
| RLP-821 | El menú de request ofrece gRPC y gRPC Defaults. El paso va como hermano del HTTP y los defaults al test; también se ofrece gRPC en contenedores. | studioComponents.test.tsx, smoke Chrome |

## Validación

Editor: `bun run validate` (typecheck, lint, tests y build) y `bun run test:browser browser-tests/sprint6.local.spec.ts` (dos casos en Chrome).

Backend: pruebas de runtime, API Studio, reporter y contrato aprobadas; `go vet ./...` y `go build ./...` aprobados. Se ejecutaron `go fix ./...` y `go fmt ./...`; los cambios mecánicos ajenos a este lote se retiraron.

`go test ./...` detecta dos fallos que se reprodujeron con los mismos comandos sobre `origin/develop` sin cambios:

- `TestSignedInstallerVerificationRejectsTamperedArtifacts`: `retained partial verification metadata`.
- `TestDevelopPublisherReceiptsFinalArchiveBeforeLatest`: falta `sha256sum` en el entorno macOS.

Estos fallos no se ocultan ni se corrigen como parte de los tickets de Studio. Las correcciones de extractores, cookies y reportes requieren la rama complementaria del backend para funcionar completas con el editor. La skill y las ramas son locales: no constituyen un rollout a develop ni a producción.

## Validación completa en Chrome — 11 de noviembre de 2026

Los 15 tickets de la matriz pasaron sus comprobaciones observables con el editor compilado integrado en el backend local de las ramas indicadas. Se utilizaron datos sintéticos y un servidor HTTP de prueba en loopback.

- RLP-787/788/809: ejecución real en modos Único, Paralelo y Secuencial; diez tarjetas, distribución en dos filas, perfil de segmentos después de ejecutar y filtro de alcance funcional.
- RLP-808/814: selectores operativos con teclado; scheduling persiste al alternar Árbol/Código y al guardar. Debug deshabilita el selector durante la ejecución y el servidor confirma que solo recibe peticiones del escenario seleccionado.
- RLP-810: curva, targets y duración se conservan al guardar; no hay lista inferior duplicada.
- RLP-811: edición y guardado conservan metadatos y aliases; precedencia canónica de cookies visible. La ejecución HTTP real conserva la variable de un extractor desactivado y captura el token con el activo. Un campo desconocido se avisa y conserva. La prueba negativa sin `extractor_enabled` intercepta únicamente la respuesta de capacidades de `/api/studio/info`; no simula el motor.
- RLP-813/820/821: políticas globales/de escenario, SQL, fichero, gRPC y gRPC Defaults se añaden desde los menús y se configuran/serializan en su ámbito correcto; el fichero se guarda y reimporta. Se valida la configuración, sin conectar servicios SQL/gRPC externos.
- RLP-815: búsqueda en español e inglés y selección de Petición/Respuesta funcionales.
- RLP-816/817: reporte generado por una ejecución real en español, guardado y reabierto como HTML con filtros funcionales. Durante la revisión se alineó el radio del selector del reporte de 6 a 8 px; la comparación final verifica altura 36 px, fuente 14 px, radio 8 px y foco visible con teclado.
- RLP-818: 47 vistas de componentes y configuración del Recorder sin los textos técnicos retirados.
- RLP-819: valores de variables y funciones del body contrastados con la petición HTTP capturada, sin reevaluación.

Evidencias locales: `/tmp/relampo-studio-validation/validacion-todos.html`, `results-final.json`, capturas por ticket, YAML exportados y `reporte-final-es.html`. Los archivos de intentos anteriores se conservan para diagnóstico; `results-final.json` reúne exclusivamente los 15 resultados definitivos. El informe HTML enlaza cada captura y el reporte real exportado.

Tras el ajuste visual de RLP-817: `go fix ./...`, `go fmt ./...`, `go test ./pkg/reporter ./internal/studio`, `go vet ./pkg/reporter ./internal/studio` y compilación del CLI con editor embebido completados. Se retiraron los cambios mecánicos ajenos al ajuste. No hubo cambios de código del editor después de su validación completa de 1169 pruebas.
