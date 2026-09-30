# Debug Inspector Context

This context defines the terms for values shown in a selected debug request.

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
