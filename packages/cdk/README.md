# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `yarn build` compile typescript to js
- `yarn watch` watch for changes and compile
- `yarn test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## Environment Variables

- Environment Variables are managed in lib/config.ts of cdk.
- Define environment variables and secrets for each service and environment.
- Sensitive values are managed by AWS Secrets Manager.

### Update Environment Variables

Update environment variables in lib/config.ts

https://github.com/alterworks/idolly/blob/feature/update-env-cdk/packages/cdk/lib/config.ts#L181-L212

### Update Secrets

Copy example.json

```zsh
# For staging
❯ cp secrets/example.json secrets/staging.json

# For production
❯ cp secrets/example.json secrets/production.json
```

Update secrets variables and apply to AWS Secret Manager.

```zsh
# For staging
❯ yarn setup-secrets:staging

# For production
❯ yarn setup-secrets:production
```

Update secret keys in lib/config.ts

https://github.com/alterworks/idolly/blob/feature/update-env-cdk/packages/cdk/lib/config.ts#L213-L234
