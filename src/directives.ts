import { GraphQLSchema } from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { mergeSchemas } from '@graphql-tools/schema';

export interface SpecInfo {
    path: string;
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    hidden?: boolean;
    category: string;
}

function specDirectiveTransformer(
    schema: GraphQLSchema,
    directiveName: string,
) {
    return mapSchema(schema, {
        // Executes once for each object field definition in the schema
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const specDirective = getDirective(
                schema,
                fieldConfig,
                directiveName,
            )?.[0];

            (fieldConfig.extensions as any) =
                (fieldConfig.extensions as any) || {};
            if (specDirective) {
                (fieldConfig.extensions as any).specInfo = {
                    ...specDirective,
                };
            }
            return fieldConfig;
        },
    });
}

function versionDirectiveTransformer(
    schema: GraphQLSchema,
    directiveName: string,
) {
    const fieldMapper = objectTransformer(directiveName, schema);
    return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: fieldMapper,
        [MapperKind.ARGUMENT]: fieldMapper,
        [MapperKind.ENUM_VALUE]: fieldMapper,
        [MapperKind.ENUM_TYPE]: fieldMapper,
        [MapperKind.FIELD]: fieldMapper,
    });
}

const objectTransformer =
    (directiveName: string, schema: GraphQLSchema) => (fieldConfig: any) => {
        const apiDirective = getDirective(
            schema,
            fieldConfig,
            directiveName,
        )?.[0];
        if (apiDirective) {
            const versionText = `*since: ${apiDirective.since.join(' | ')}*`;
            fieldConfig.version = apiDirective.since;
            fieldConfig.description = fieldConfig.description
                ? `${fieldConfig.description} <br/> <font color="red">${versionText}</font>`
                : `${versionText}`;
        }
        return fieldConfig;
    };

export function applyDirectiveTransforms(schema: GraphQLSchema): GraphQLSchema {
    return specDirectiveTransformer(schema, 'rest');
}

export function applyVersionTransforms(schema: GraphQLSchema): GraphQLSchema {
    return versionDirectiveTransformer(schema, 'version');
}
