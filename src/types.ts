import {
    GraphQLObjectType,
    GraphQLInputObjectType,
    GraphQLField,
    GraphQLInputField,
    isNonNullType,
    isListType,
    isObjectType,
    isScalarType,
    isEnumType,
    GraphQLType,
    Kind,
} from 'graphql';
import { mapToPrimitive, mapToRef } from './utils';

export function buildSchemaObjectFromType(
    type: GraphQLObjectType | GraphQLInputObjectType,
): any {
    const required: string[] = [];
    const properties: Record<string, any> = {};

    const fields = type.getFields();

    Object.keys(fields).forEach((fieldName) => {
        const field = fields[fieldName];

        if (isNonNullType(field.type)) {
            required.push(field.name);
        }

        properties[fieldName] = resolveField(field);
        if (field.description) {
            properties[fieldName].description = field.description;
        }
    });

    return {
        type: 'object',
        ...(required.length ? { required } : {}),
        properties,
        ...(type.description ? { description: type.description } : {}),
    };
}

function resolveField(field: GraphQLField<any, any> | GraphQLInputField) {
    if ('defaultValue' in field)
        return resolveFieldType(field.type, field?.defaultValue);
    return resolveFieldType(field.type);
}

// array -> [type]
// type -> $ref
// scalar -> swagger primitive
export function resolveFieldType(type: GraphQLType, defaultValue?: any): any {
    if (isNonNullType(type)) {
        return resolveFieldType(type.ofType);
    }

    if (isListType(type)) {
        return {
            type: 'array',
            items: resolveFieldType(type.ofType),
            ...(defaultValue !== undefined ? { default: defaultValue } : {}),
        };
    }

    if (
        isObjectType(type) ||
        type.astNode?.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION
    ) {
        return {
            $ref: mapToRef(type.name),
        };
    }

    if (isScalarType(type)) {
        return mapToPrimitive(type.name)
            ? {
                  ...mapToPrimitive(type.name),
                  ...(defaultValue !== undefined
                      ? { default: defaultValue }
                      : {}),
              }
            : {
                  type: 'object',
                  ...(defaultValue !== undefined
                      ? { default: defaultValue }
                      : {}),
              };
    }

    if (isEnumType(type)) {
        return {
            type: 'string',
            enum: type.astNode?.values?.map((value) => value.name.value),
            ...(defaultValue !== undefined ? { default: defaultValue } : {}),
        };
    }

    return {
        type: 'object',
    };
}
