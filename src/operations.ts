import { getDirective } from '@graphql-tools/utils';
import { GraphQLObjectType, GraphQLSchema, isNonNullType } from 'graphql';
import { SpecInfo } from './directives';
import { resolveFieldType } from './types';

export function buildPathFromOperation({
    operation,
    specInfo,
    schema,
    useRequestBody,
    errorResponseRef,
}: {
    operation: any;
    specInfo: SpecInfo;
    schema: GraphQLSchema;
    useRequestBody: boolean;
    errorResponseRef: string;
}) {
    const apiDirective: any = getDirective(schema, operation, 'version')?.[0];
    const exampleDirective: any = getDirective(
        schema,
        operation,
        'example',
    )?.[0];
    // we use query params only for get request
    // both (POST, PUT, PATCH) and GET can have pathParams

    const pathArgs = operation.args.filter((arg: any) =>
        isPathParam(arg, specInfo.path),
    );
    const nonPathArgs = operation.args.filter(
        (arg: any) => !isPathParam(arg, specInfo.path),
    );

    const requiredBody = resolveRequestBody(nonPathArgs, specInfo.path) as any;
    const isRequired =
        requiredBody !== undefined &&
        requiredBody.required !== undefined &&
        requiredBody.required.length > 0;

    return {
        operationId: operation.name,
        description: operation.description,
        tags:
            apiDirective && apiDirective.minVersion
                ? [specInfo.category, apiDirective.minVersion]
                : [specInfo.category],
        ...(useRequestBody
            ? {
                  ...(nonPathArgs.length && {
                      requestBody: {
                          content: {
                              'application/json': {
                                  schema: resolveRequestBody(
                                      nonPathArgs,
                                      specInfo.path,
                                  ),
                              },
                          },
                          ...(isRequired ? { required: true } : {}),
                      },
                  }),
                  parameters: resolvePathParameters(pathArgs, specInfo.path),
              }
            : {
                  parameters: [
                      ...resolveQueryParameters(nonPathArgs, specInfo.path),
                      ...resolvePathParameters(pathArgs, specInfo.path),
                  ],
              }),
        responses: {
            200: {
                description: 'Common successful response',
                content: {
                    'application/json': {
                        schema: resolveFieldType(operation.type),
                        ...(exampleDirective &&
                            exampleDirective.response_200 && {
                                example: exampleDirective.response_200,
                            }),
                    },
                },
            },
            201: {
                description: 'Common error response',
                content: {
                    'application/json': {
                        schema: resolveFieldType(operation.type),
                        ...(exampleDirective &&
                            exampleDirective.response_201 && {
                                example: exampleDirective.response_201,
                            }),
                    },
                },
            },
            400: {
                description: 'Operation failed',
                content: {
                    'application/json': {
                        schema: {
                            $ref: errorResponseRef,
                        },
                        ...(exampleDirective &&
                            exampleDirective.response_400 && {
                                example: exampleDirective.response_400,
                            }),
                    },
                },
            },
            500: {
                description: 'Operation failed',
                content: {
                    'application/json': {
                        schema: {
                            $ref: errorResponseRef,
                        },
                        ...(exampleDirective &&
                            exampleDirective.response_500 && {
                                example: exampleDirective.response_500,
                            }),
                    },
                },
            },
        },
    };
}

const isPathParam = (arg: any, path: string) => path.includes(`{${arg.name}}`);

function isNullableType(arg: any) {
    const isBooleanType = arg.type.name === 'Boolean';
    const notRequired = !isNonNullType(arg.type);

    return notRequired && isBooleanType;
}

function resolveRequestBody(args: any[], path = '') {
    if (!args) {
        return {};
    }

    const properties: Record<string, any> = {};
    const required: string[] = [];

    args.forEach((arg) => {
        if (isNonNullType(arg.type)) {
            required.push(arg.name);
        }
        const hasDefaultValue = arg.defaultValue !== undefined;
        properties[arg.name] = {
            description: arg.description,
            ...(hasDefaultValue && { default: arg.defaultValue }),
            ...resolveFieldType(arg.type),
            deprecated: !!arg.deprecationReason,
            ...(isNullableType(arg) && { nullable: true }),
        };
    });
    return {
        type: 'object',
        properties,
        ...(required.length ? { required } : {}),
    };
}

function resolveQueryParameters(args: any[], path: string) {
    if (!args) {
        return [];
    }
    return args.map((arg: any) => {
        const hasDefaultValue = arg.defaultValue !== undefined;
        return {
            in: 'query',
            name: arg.name,
            required: isNonNullType(arg.type),
            schema: resolveFieldType(arg.type),
            description: arg.description,
            ...(hasDefaultValue && { default: arg.defaultValue }),
            deprecated: !!arg.deprecationReason,
        };
    });
}

function resolvePathParameters(args: any[], path = '') {
    if (!args) {
        return [];
    }
    return args.map((arg: any) => {
        const hasDefaultValue = arg.defaultValue !== undefined;
        return {
            in: 'path',
            name: arg.name,
            // Path params are always required
            required: true,
            schema: resolveFieldType(arg.type),
            description: arg.description,
            ...(hasDefaultValue && { default: arg.defaultValue }),
            deprecated: !!arg.deprecationReason,
        };
    });
}
