# OpenRouter AI SDK - Turbo Repo Design Specification

## Overview

Design a modern TypeScript monorepo using Turbo for the OpenRouter AI SDK with dual version support (`openrouter-ai-sdk/v4` and `openrouter-ai-sdk/v5`).

## Project Structure

```
openrouter-ai-sdk/
├── apps/
│   ├── docs/                    # Documentation site
│   └── playground/              # SDK testing playground
├── packages/
│   ├── v4/                      # OpenRouter AI SDK v4
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── v5/                      # OpenRouter AI SDK v5
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/                  # Shared utilities between versions
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── types/                   # Shared TypeScript types
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── tools/
│   ├── eslint-config/           # Shared ESLint configuration
│   └── tsconfig/                # Shared TypeScript configurations
├── package.json                 # Root package.json with workspaces
├── turbo.json                   # Turbo configuration
├── bun.lockb                    # Bun lock file
└── tsconfig.json               # Root TypeScript config
```

## Implementation Steps

### Phase 1: Repository Setup

1. **Initialize Turbo Repo**
   - Install Turbo globally: `bun add -g turbo`
   - Initialize root `package.json` with workspaces configuration
   - Configure `turbo.json` for build orchestration

2. **Setup Package Manager**
   - Configure Bun as primary package manager
   - Setup workspace dependencies in root `package.json`
   - Configure `.bunfig.toml` for optimal performance

### Phase 2: Core Package Architecture

#### Shared Packages

1. **@openrouter/types**
   - Common TypeScript interfaces and types
   - API response schemas
   - Configuration interfaces
   - Error types

2. **@openrouter/shared**
   - HTTP client utilities
   - Authentication helpers
   - Common validation functions
   - Logging utilities

#### Version-Specific Packages

1. **@openrouter/sdk-v4**
   - Legacy API compatibility
   - Backward-compatible interface
   - Deprecated feature warnings

2. **@openrouter/sdk-v5**
   - Modern API implementation
   - Enhanced type safety
   - New features and improvements

### Phase 3: Export Strategy

#### Package.json Configuration

Each version package will export as:

```json
{
  "name": "@openrouter/sdk-v4",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

#### Root Package Re-exports

Configure root `package.json` to enable `openrouter-ai-sdk/v4` and `openrouter-ai-sdk/v5` imports:

```json
{
  "name": "openrouter-ai-sdk",
  "exports": {
    "./v4": {
      "import": "./packages/v4/dist/index.js",
      "require": "./packages/v4/dist/index.cjs",
      "types": "./packages/v4/dist/index.d.ts"
    },
    "./v5": {
      "import": "./packages/v5/dist/index.js",
      "require": "./packages/v5/dist/index.cjs",
      "types": "./packages/v5/dist/index.d.ts"
    }
  }
}
```

### Phase 4: Build System Configuration

#### Turbo Pipeline

Configure `turbo.json` for optimal build caching:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {
      "dependsOn": []
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

#### Build Tools

- **TypeScript**: Compile packages with proper declaration generation
- **Rollup/Vite**: Bundle for both ESM and CJS outputs
- **API Extractor**: Generate consistent API documentation

### Phase 5: Testing Strategy

#### Test Framework: Bun Test

- **Unit Tests**: Each package maintains isolated test suites
- **Integration Tests**: Cross-package compatibility testing
- **E2E Tests**: Real API interaction tests (with mocking)

#### Test Configuration

```json
{
  "scripts": {
    "test": "turbo run test",
    "test:unit": "bun test packages/*/tests/**/*.test.ts",
    "test:integration": "bun test tests/integration/**/*.test.ts",
    "test:e2e": "bun test tests/e2e/**/*.test.ts"
  }
}
```

#### Test Structure

```
tests/
├── integration/                 # Cross-package tests
│   ├── v4-v5-compatibility.test.ts
│   └── shared-utilities.test.ts
├── e2e/                        # End-to-end tests
│   ├── v4-api.test.ts
│   └── v5-api.test.ts
└── fixtures/                   # Test data and mocks
```

### Phase 6: Development Workflow

#### Scripts Configuration

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean",
    "changeset": "changeset",
    "version": "changeset version",
    "publish": "changeset publish"
  }
}
```

#### Development Tools

- **Changesets**: Version management and changelog generation
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality gates

### Phase 7: Documentation & Examples

#### Documentation Site (apps/docs)

- API reference for both versions
- Migration guides from v4 to v5
- Code examples and tutorials
- Interactive playground

#### Example Applications

- Basic usage examples
- Advanced implementation patterns
- Migration scenarios

## Quality Assurance

### Type Safety

- Strict TypeScript configuration
- API compatibility testing
- Type declaration validation

### Performance

- Bundle size monitoring
- Build time optimization
- Runtime performance benchmarks

### Compatibility

- Node.js version support matrix
- Browser compatibility testing
- Package manager compatibility (npm, yarn, pnpm, bun)

## Deployment & Publishing

### Release Strategy

- Automated CI/CD with GitHub Actions
- Semantic versioning with changesets
- NPM publishing with provenance
- Documentation deployment to Vercel

### Package Distribution

- NPM registry publication
- CDN distribution (JSDelivr, unpkg)
- GitHub Packages backup

## Success Criteria

1. ✅ Users can import via `openrouter-ai-sdk/v4` and `openrouter-ai-sdk/v5`
2. ✅ Both versions maintain independent functionality
3. ✅ Shared code reduces duplication
4. ✅ Testing via `bun test` works across all packages
5. ✅ Build system is optimized with Turbo caching
6. ✅ Documentation is comprehensive and accessible
7. ✅ CI/CD pipeline ensures quality and reliability

## Next Steps

1. Execute Phase 1: Repository Setup
2. Implement core shared packages
3. Develop v4 and v5 implementations
4. Setup comprehensive testing
5. Configure build and deployment pipelines
6. Create documentation and examples
