# CDK Workspace Example

## Requirements

- Node: Runtime
- yarn: Package Manager
- Prettier: Code Formatter
- ESLint: Code Linter
- Husky: Git hooks

## Rules

- Response design with tailwindcss
- Unit testing required

## Directories

    ROOT
    ├── README.md # this
    ├── node_modules
    ├── package.json
    ├── packages # microservices. add new services here.
           ├── frontend # frontend service made by next.js
           ├── admin # admin service made by next.js
           └── backend # api service made by express
    ├── prettier.config.js
    └── yarn.lock
