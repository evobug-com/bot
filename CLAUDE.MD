# Development Workflow

- Use `bun` instead of `npm` or `yarn`.
- Use `bunx tsgo --noEmit` to check typescript errors. If there is no output, it means everything is ok. 
- use `bunx oxlint --type-aware` to check lint errors.
- use `bun run test` to run tests.

# Rules
- Always write clean code that is easy to read and understand.
- Tsgo must return 0 errors and 0 warnings.
- Oxlint must return 0 errors and 0 warnings.
- All tests must pass.

## Typescript
- Never use 'any' type, it is disabling typescript. Instead figure out what is wrong and plan to fix it.
- Do not resolve issues by casting to 'unknown' and then to the desired type.

# Tests
- All code must have tests.

# Other
- Do not commit any md file unless you are explicitly told to do it.