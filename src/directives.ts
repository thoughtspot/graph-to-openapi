import { GraphQLSchema } from "graphql";
import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";
import { mergeSchemas } from "@graphql-tools/schema";

export interface SpecInfo {
  path: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  hidden?: boolean;
  tag: string;
}

export function applyDirectiveTransforms(schema: GraphQLSchema): GraphQLSchema {
  return specDirectiveTransformer(schema, "rest");
}

function specDirectiveTransformer(
  schema: GraphQLSchema,
  directiveName: string
) {
  // Add the Directive to schema
  // schema = mergeSchemas({
  //   schemas: [schema],
  //   typeDefs: /* Graphql */ `
  //     directive @rest(
  //       path: String = "/v2/"
  //       method: String = "GET"
  //       hidden: Boolean = false
  //     ) on FIELD_DEFINITION
  //   `,
  // });
  return mapSchema(schema, {
    // Executes once for each object field definition in the schema

    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const specDirective = getDirective(
        schema,
        fieldConfig,
        directiveName
      )?.[0];

      if (specDirective) {
        // @ts-ignore
        fieldConfig.extensions.specInfo = {
          ...specDirective,
        };
      }
      return fieldConfig;
    },
  });
}
