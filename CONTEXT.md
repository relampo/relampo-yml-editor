# Relampo Editor Context

This context defines the terms the editor uses for test documents and for values shown in a selected debug request.

## Debug values

**Request variable**:
A named value that the selected request uses or extracts.

**Built-in invocation**:
A single built-in function evaluation while the runtime prepares the selected HTTP request. Repeated identical expressions are separate invocations and remain separate rows.

**Invocation trace**:
The built-in expression, its exact JSON value or failed status, and its compact evaluation origin, in runtime execution order.

**Invocation origin**:
The place where the built-in expression was evaluated, such as a request field, inherited HTTP default, or named variable definition.

**Built-in value display**:
The exact returned value rendered as JSON so strings, numbers, and booleans stay distinct.

## Inspector tabs

**Variables tab**:
Shows request variables only. It does not list built-in invocations.

**Built-ins tab**:
Shows built-in invocations executed for the selected HTTP request, including inherited HTTP defaults. It excludes invocations from other steps and does not list request variables. Rows follow runtime execution order and show the expression, exact JSON value, and compact origin.

**Empty tab**:
Both tabs remain visible when they have no rows and show an empty state.

**Failed invocation**:
The Built-ins tab shows a short failed row. The Result section shows the full error detail.

## Document issues

**Document issue**:
A problem the editor finds in the test document. Every document issue is a syntax error, a configuration error, or an unrecognized field.
_Avoid_: Validation error, warning

**Syntax error**:
A document issue where the YAML cannot be read, so the document has no tree. It always concerns the whole document.
_Avoid_: Parse error

**Configuration error**:
A document issue where an element or the whole document has a missing or invalid value. It blocks Debug and Run.
_Avoid_: Semantic error, validation error

**Global issue**:
A document issue whose owner is the whole document, not one step or block. "Global" is a location, not a type.

**Issue severity**:
Error for syntax errors and configuration errors, because they block Debug and Run. Info for unrecognized fields, because they block nothing.
_Avoid_: Warning

**Unrecognized field**:
A field in the test document that the Relampo format does not define. The editor keeps it without changes, and the runtime ignores it.
_Avoid_: Unknown field, preserved field
