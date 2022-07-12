import {
  GraphQLSchema,
  isObjectType,
  isInputObjectType,
  isIntrospectionType,
  GraphQLObjectType,
} from "graphql";
import { applyDirectiveTransforms, SpecInfo } from "./directives";
import { buildSchemaObjectFromType } from "./types";
import { buildPathFromOperation } from "./operations";
import { join } from "path";

export function getOpenAPISpec({
  schema,
  info,
  basePath,
}: {
  schema: GraphQLSchema;
  info: Record<string, any>;
  basePath: string;
}) {
  schema = applyDirectiveTransforms(schema);
  const spec: any = {
    openapi: "3.0.0",
    info,
    tags: [],
    paths: {},
    components: {
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "object",
            },
          },
        },
      },
    },
    security: [],
    servers: [],
  };
  const { Query, Mutation, ...types } = schema.getTypeMap();
  for (const typeName in types) {
    const type = types[typeName];
    if (
      (isObjectType(type) || isInputObjectType(type)) &&
      !isIntrospectionType(type)
    ) {
      spec.components!.schemas![typeName] = buildSchemaObjectFromType(type);
    }
  }
  const operations = {
    ...(Query as GraphQLObjectType).getFields(),
    ...(Mutation as GraphQLObjectType).getFields(),
  };
  for (const operationName in operations) {
    const operation = operations[operationName];
    const specInfo: SpecInfo = operation.extensions.specInfo as SpecInfo;
    if (!specInfo) {
      continue;
    }
    const path = join(basePath, specInfo.path);
    const method = specInfo.method.toLowerCase();
    const useRequestBody = ["post", "patch", "put"].includes(method);
    spec.paths[path] = {
      [method]: buildPathFromOperation({
        operation,
        specInfo,
        schema,
        useRequestBody,
        errorResponseRef: "$/components/schemas/ErrorResponse",
      }),
    };
  }
  return spec;
}
