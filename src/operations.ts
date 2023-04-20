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
    return {
        operationId: operation.name,
        description: operation.description,
        tags: [specInfo.category],
        ...(useRequestBody
            ? {
                  requestBody: {
                      content: {
                          'application/json': {
                              schema: resolveRequestBody(operation.args),
                          },
                      },
                      required: true,
                  },
              }
            : {
                  parameters: resolveParameters(operation.args),
              }),
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: resolveFieldType(operation.type),
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
                    },
                },
            },
        },
    };
}

function isNullableType(arg: any) {
    const isBooleanType = arg.type.name === 'Boolean';
    const notRequired = !isNonNullType(arg.type);

    return notRequired && isBooleanType;
}

function resolveRequestBody(args: any[]) {
    if (!args) {
        return {};
    }

    const properties: Record<string, any> = {};
    const required: string[] = [];

    args.forEach((arg) => {
        if (isNonNullType(arg.type)) {
            required.push(arg.name);
        }

        properties[arg.name] = {
            description: arg.description,
            default: arg.defaultValue,
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

function resolveParameters(args: any[]) {
    if (!args) {
        return [];
    }

    return args.map((arg: any) => {
        return {
            in: 'query',
            name: arg.name,
            required: isNonNullType(arg.type),
            schema: resolveFieldType(arg.type),
            description: arg.description,
            default: arg.defaultValue,
            deprecated: !!arg.deprecationReason,
        };
    });
}
