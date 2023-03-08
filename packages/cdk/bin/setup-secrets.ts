import * as AWS from 'aws-sdk';
import * as yargs from 'yargs';
import { readFileSync } from 'fs';
import * as path from 'path';
import { getStageConfig } from '../lib/config';
import { StageValue } from '../lib/context';

function readJsonFile(path: string) {
  const file = readFileSync(path, 'utf8');
  return JSON.parse(file);
}

async function main() {
  const argv = await yargs
    .option('stage', {
      type: 'string',
      description: 'Stage name of the resource to deploy.',
      demandOption: true,
    })
    .option('project', {
      type: 'string',
      description: 'Project name of the resource to deploy.',
      demandOption: true,
    })
    .help().argv;

  const config = getStageConfig(argv.stage as StageValue, argv.project);

  const values = readJsonFile(path.join(__dirname, `../secrets/${argv.stage}.json`));
  const secretString = JSON.stringify(values);
  const secretsManager = new AWS.SecretsManager();
  const secretName = config.secretsName;
  let secrets;
  try {
    secrets = await secretsManager.describeSecret({ SecretId: secretName }).promise();
  } catch (e) {
    console.log('secret not found. create it...');
  }

  const callback = (err: AWS.AWSError, data: AWS.SecretsManager.UpdateSecretResponse) => {
    if (err) {
      console.log(err, err.stack); // an error occurred
      process.exit(1);
    }
    console.log(data); // successful response
    process.exit(0);
  };

  if (secrets) {
    secretsManager.updateSecret(
      {
        SecretId: secretName,
        SecretString: secretString,
      },
      callback,
    );
  } else {
    secretsManager.createSecret(
      {
        Name: secretName,
        SecretString: secretString,
      },
      callback,
    );
  }
}

main();
