import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;
const addFormats = require("ajv-formats").default;
const { load } = require("js-yaml");

const document = load(readFileSync("docs/api/production-api-v1.yaml", "utf8"));
const schemaId = "urn:ehs:production-api:v1";
const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: true });
addFormats(ajv);
ajv.addSchema({ ...document, $id: schemaId }, schemaId);

const compile = (name) => ajv.compile({ $ref: `${schemaId}#/components/schemas/${name}` });
const validateInput = compile("ImportBatchInput");
const validateStatus = compile("ImportBatchStatus");
const operation = document.paths["/import/batches"].post;
const requestExample = operation.requestBody.content["application/json"].examples.events.value;
const responseExample = operation.responses["202"].content["application/json"].examples.received.value;

function assertValid(validate, value, label) {
  if (validate(value)) return;
  throw new Error(`${label} does not conform to OpenAPI:\n${ajv.errorsText(validate.errors, { separator: "\n" })}`);
}

assertValid(validateInput, requestExample, "Events request example");
assertValid(validateStatus, responseExample, "Batch status response example");

if (validateStatus({ ...structuredClone(responseExample), records: [] })) throw new Error("Batch status schema must reject staged source records");

const missingCoveragePeriod = structuredClone(requestExample);
delete missingCoveragePeriod.coverage.businessPeriod;
if (validateInput(missingCoveragePeriod)) throw new Error("Time-domain schema must require coverage.businessPeriod");

const storeMasterWithoutEffectiveTime = {
  ...structuredClone(requestExample),
  domain: "store-master",
  records: [{ region: "R", area: "A", storeNameCn: "门店", storeNameEn: "Store", trtid: "S-001" }],
};
if (validateInput(storeMasterWithoutEffectiveTime)) throw new Error("Snapshot-domain schema must require effectiveTime");

console.log("OpenAPI examples and required Domain coverage constraints are valid.");
