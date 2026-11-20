---
name: relampo-studio-jira-fixes
description: Implementar y verificar correcciones de tickets Jira de Relampo Studio en relampo-yml-editor, contrastando el contrato y runtime de relampo-backend cuando afecten al comportamiento del YAML.
---

# Correcciones de Relampo Studio desde Jira

Recibe claves Jira o un sprint/estado y entrega cambios comprobados en una rama local. Lee los tickets completos y los AGENTS.md de los repositorios afectados antes de editar. La lista de una conversación sirve de alcance, pero el estado actual del código determina qué falta corregir.

## Base y aislamiento

Studio pertenece a `relampo-yml-editor`; motor, API de Studio y reporte HTML exportado pertenecen a `relampo-backend`. El canal develop del CLI no implica que exista una rama develop en el editor. Identifica la versión de `/api/studio/info`, su release/commit, y las referencias remotas antes de seleccionar la base. Si el usuario pide exactamente la versión instalada, no la sustituyas por main sin aclararlo. Si solo pide la base de desarrollo del editor y existe main como rama de publicación, explica la elección.

Usa GitButler y su skill instalada para inspección, ramas, worktrees y commits. Prefiere un worktree aislado ante cambios ajenos. No actualices, cometas ni reescribas esos cambios. Agrupa los arreglos pedidos en la rama solicitada, con commits coherentes y claves Jira en los mensajes. No publiques, mezcles, promociones versiones ni cambies Jira sin autorización para esas acciones.

## Investigación e implementación

- Crea una matriz por ticket: criterio observable, archivos responsables, prueba y estado. Identifica arreglos ya presentes en la base y conserva evidencia; no cambies código solo para generar un diff.
- Reutiliza los dropdowns, traducciones y componentes existentes. Conserva selección, filtros, teclado y estados de accesibilidad. No cambies valores técnicos al traducir etiquetas.
- Comprueba importación, edición y serialización del YAML para cambios de componentes o contrato. Preserva campos desconocidos. Distingue campos preservados, aliases admitidos y comportamiento que el runtime realmente ejecuta.
- Para cookies y extractores, verifica la precedencia de aliases y la ejecución local con un servidor de prueba controlado. No uses tráfico grabado con secretos ni sitios reales para reproducir bugs. No prometas que `enabled: false` funciona basándote únicamente en que el parser acepta el campo.
- Los controles del reporte exportado y su idioma pueden requerir correcciones en el backend. Comprueba el trayecto UI → API → HTML y la persistencia al exportar/reabrir. No marques el ticket como terminado con una corrección solo visual de Studio.
- Para gráficas de segmentos, verifica orden, targets, transiciones y duración acumulada, también después de ejecutar; una gráfica en la configuración no prueba que exista en resultados.
- Para Variables, usa la evidencia capturada durante la ejecución, el nombre real y el valor resuelto. No inventes valores ni vuelvas a evaluar funciones aleatorias o temporales.

## Verificación y entrega

Añade regresiones de comportamiento a las suites existentes para cambios funcionales. Ejecuta los scripts relevantes de package.json y, al terminar en el editor, `bun run validate`. Realiza smoke de navegador para formularios, selección y resultados cuando sea posible. Para cambios Go, sigue los comandos de AGENTS.md, incluidos go fix y go fmt; revisa que no entren cambios mecánicos ajenos.

Informa por ticket: corregido y verificado, ya resuelto en la base o pendiente con causa concreta. Registra comandos, fallos y límites reales. Un test que no se ejecutó no cuenta como aprobado. Entrega rama, commits, ubicación y evidencia; conserva pendientes sin cerrar Jira ni afirmar que los 15 están listos si falta algún criterio.

Para el lote inicial SPRINT 6, consulta [references/sprint-6.md](references/sprint-6.md). No lo uses como sustituto de leer Jira actualizado.
