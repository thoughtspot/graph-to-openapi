import {
    GraphQLSchema,
    isObjectType,
    isInputObjectType,
    isIntrospectionType,
    GraphQLObjectType,
} from 'graphql';
import { join } from 'path';
import { getDirective } from '@graphql-tools/utils';
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
        'x-roles': [],
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
    const versionMap: Map<string, string> = new Map<string, string>();
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
        const apiDirective: any = getDirective(
            schema,
            operation,
            'version',
        )?.[0];
        if (apiDirective && apiDirective.minVersion) {
            versionMap.set(apiDirective.minVersion, apiDirective.minVersion);
        }
    });
    // eslint-disable-next-line no-param-reassign
    spec['x-roles'] = filterAvailableVersion(versionMap);
}

/**
 * Filter out all the current versions available on the api which needs to be shown
 * based on the version tagged
 */
function filterAvailableVersion(versionMap: Map<string, string>) {
    // eslint-disable-next-line no-restricted-syntax
    const xRoles = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of versionMap.entries()) {
        const role = {
            name: key,
            id: key,
            tags: [value],
            description: `Roles for version ${key}`,
        };
        xRoles.push(role);
    }
    return xRoles;
}
