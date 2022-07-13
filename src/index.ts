import {
    GraphQLSchema,
    isObjectType,
    isInputObjectType,
    isIntrospectionType,
    GraphQLObjectType,
} from 'graphql';
import { join } from 'path';
import { applyDirectiveTransforms, SpecInfo } from './directives';
import { buildSchemaObjectFromType } from './types';
import { buildPathFromOperation } from './operations';

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
    Object.keys(operations).forEach((operationName) => {
        const operation = operations[operationName];
        const specInfo: SpecInfo = operation.extensions.specInfo as SpecInfo;
        if (!specInfo) {
            return;
        }
        const path = join(basePath, specInfo.path);
        const method = specInfo.method.toLowerCase();
        const useRequestBody = ['post', 'patch', 'put'].includes(method);
        spec.paths[path] = {
            [method]: buildPathFromOperation({
                operation,
                specInfo,
                schema,
                useRequestBody,
                errorResponseRef: '$/components/schemas/ErrorResponse',
            }),
        };
    });
    return spec;
}
