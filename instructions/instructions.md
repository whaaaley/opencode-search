Rule: When a todo is mentioned in chat, append it to the end of the todo list without acting on it.
Reason: To capture todos without disrupting current work.

Rule: Do not start working on newly added todos immediately.
Reason: To avoid interrupting the current task in progress.

Rule: When a new todo is added, continue with whatever task is currently in progress.
Reason: To maintain focus on the current task.

Rule: Work through todos in list order.
Reason: To ensure todos are completed sequentially.

Rule: Only begin the next todo after the current one is complete.
Reason: To ensure each todo is fully completed before moving on.

Rule: When a function requires more than three parameters, use a single options object instead of positional arguments.
Reason: To improve readability and maintainability of function signatures.

Rule: When using an options object for function parameters, define the type as a named type alias directly above the function definition.
Reason: To provide clear type documentation co-located with the function.

Rule: Prioritize small utility functions wherever necessary in the codebase.
Reason: To promote modularity and reusability.

Rule: If side effects are required, use callbacks or dependency injection.
Reason: To manage side effects cleanly while maintaining testability.

Rule: Avoid complex types wherever possible.
Reason: To keep type definitions simple and readable.

Rule: Avoid non-null assertions.
Reason: To verify values before accessing them using narrowing type guards instead.

Rule: Avoid excessive optional chaining.
Reason: To ensure deliberate null/undefined checks using explicit guards and conditions so access patterns are clear and intentional.

Rule: Avoid em dashes in general.
Reason: To maintain consistent, simple punctuation across all written content.

Rule: Use consistent whitespace for readability.
Reason: Whitespace is critical for readability and inconsistent spacing makes code harder to scan.

Rule: Prefer early returns over if-else statements.
Reason: To reduce nesting and improve readability by handling edge cases first.

Rule: Avoid ternaries, especially chained ternaries, unless used for simple const or object assignment.
Reason: To keep conditional logic readable and explicit.

Rule: Do not split function parameters across multiple lines.
Reason: To keep function signatures compact and scannable on a single line.

Rule: When an object literal or function has three or more fields or parameters, split onto multiple lines.
Reason: One or two fields on a single line is fine, but three or more becomes hard to scan and should be expanded for readability.

Rule: When string concatenation with plus signs would exceed 120 characters, use an array with join instead.
Reason: To allow multi-line formatting that the formatter will not collapse back into a single line.

Rule: When working through a todo list, complete the easiest tasks first.
Reason: To build momentum and reduce list size quickly before tackling complex items.
