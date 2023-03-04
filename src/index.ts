import {
    GraphQLSchema,
    isObjectType,
    isInputObjectType,
    isIntrospectionType,
    GraphQLObjectType,
} from 'graphql';
import { join } from 'path';
import {
    applyVersionTransforms,
    applyDirectiveTransforms,
    SpecInfo,
} from './directives';
import { buildSchemaObjectFromType } from './types';
import { buildPathFromOperation } from './operations';

export const directiveTypeDefs = `directive @rest(
    "Path for the method"
    path: String = "/v2/"
  
    "REST Method to use GET|POST|PUT"
    method: String = "GET"
  
    "Hide the method from the generated swagger spec"
    hidden: Boolean = false
  
    "The category for this API"
    category: String = ""
  ) on FIELD_DEFINITION`;

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
    schema = applyVersionTransforms(schema);
    const spec: any = {
        openapi: '3.0.0',
        info,
        tags: [],
        paths: {},
        components: {
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'object',
                        },
                    },
                },
            },
        },
        security: [],
        servers: [],
    };
    const routeMap = {};
    const { Query, Mutation, ...types } = schema.getTypeMap();
    Object.keys(types).forEach((typeName) => {
        const type = types[typeName];
        if (
            (isObjectType(type) || isInputObjectType(type)) &&
            !isIntrospectionType(type)
        ) {
            spec.components!.schemas![typeName] =
                buildSchemaObjectFromType(type);
        }
    });
    const operations = {
        ...(Query as GraphQLObjectType).getFields(),
        ...(Mutation as GraphQLObjectType).getFields(),
    };
    addPathsToSpec(
        (Query as GraphQLObjectType).getFields(),
        spec,
        routeMap,
        basePath,
        schema,
        Query.name,
    );
    addPathsToSpec(
        (Mutation as GraphQLObjectType).getFields(),
        spec,
        routeMap,
        basePath,
        schema,
        Mutation.name,
    );
    return {
        spec,
        routeMap,
    };
}

function addPathsToSpec(
    operations: { [key: string]: any },
    spec: any,
    routeMap: { [key: string]: any },
    basePath: string,
    schema: GraphQLSchema,
    type: string,
) {
    Object.keys(operations).forEach((operationName: string) => {
        const operation = operations[operationName];
        const specInfo: SpecInfo = operation.extensions.specInfo as SpecInfo;
        if (!specInfo) {
            return;
        }
        const path = join(basePath, specInfo.path);
        const method = specInfo.method.toLowerCase();
        const useRequestBody = ['post', 'patch', 'put'].includes(method);
        routeMap[`${type}.${operationName}`] = {
            method,
            path: specInfo.path,
        };
        spec.paths[path] = {
            [method]: buildPathFromOperation({
                operation,
                specInfo,
                schema,
                useRequestBody,
                errorResponseRef: '#/components/schemas/ErrorResponse',
            }),
        };
    });
}
