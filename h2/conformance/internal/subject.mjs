import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

function toModuleUrl(path) {
  return pathToFileURL(path).href;
}

export async function loadSubjectApi(subjectRoot) {
  const distRoot = resolve(subjectRoot, 'dist');
  const indexUrl = toModuleUrl(resolve(distRoot, 'index.js'));
  const publicOutputUrl = toModuleUrl(resolve(distRoot, 'public-output-contract.js'));
  const schemaValidationUrl = toModuleUrl(resolve(distRoot, 'schema-validation.js'));

  const [indexModule, publicOutputModule, schemaValidationModule] = await Promise.all([
    import(indexUrl),
    import(publicOutputUrl),
    import(schemaValidationUrl),
  ]);

  return {
    ...indexModule,
    ...publicOutputModule,
    ...schemaValidationModule,
  };
}

