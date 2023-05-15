import { loadSchemaSync } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { join } from 'path';
import { printSchema } from 'graphql';
import { getOpenAPISpec } from '../src/index';

describe('should generate the correct api spec', () => {
    it('with the full schema file', () => {
        const schema = loadSchemaSync(join(__dirname, 'schema.graphql'), {
            loaders: [new GraphQLFileLoader()],
        });
        const { spec } = getOpenAPISpec({
            schema,
            info: {},
            basePath: '/rest/v2',
        });
        expect(Object.keys(spec.paths).length).toBe(93);
        expect(
            spec.paths['/rest/v2/v2/data/search/{dataObjectId}'].post,
        ).toMatchObject({
            operationId: 'restapiV2__searchQueryData',
            description:
                'To programmatically retrieve data from ThoughtSpot using search query string, use this endpoint',
            tags: ['Data'],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                offset: {
                                    description:
                                        'The offset point, starting from where the records should be included in the response.\n\nIf no input is provided then offset starts from 0.',
                                    default: -1,
                                    type: 'integer',
                                    format: 'int32',
                                    deprecated: false,
                                },
                                batchNumber: {
                                    description:
                                        'An alternate way to set offset for the starting point of the response.\n\nThe value in offset field will not be considered if batchNumber field has value greater than 0.\n\nOffset value will be calculated as (batchNumber - 1) * batchSize.\n\nIt is mandatory to provide a value for batchSize with batchNumber.\n\nExample:\n\nAssume response has 100 records. Now,  batchNumber is set as 2 and batchSize as 10, then offset value will be 10. So, 10 records starting from 11th record will be considered.',
                                    default: -1,
                                    type: 'integer',
                                    format: 'int32',
                                    deprecated: false,
                                },
                                batchSize: {
                                    description:
                                        'The number of records that should be included in the response starting from offset position.\n\nIf no input is provided, then all records starting from the value provided in offset is included in the response',
                                    default: -1,
                                    type: 'integer',
                                    format: 'int32',
                                    deprecated: false,
                                },
                                queryString: {
                                    description:
                                        "The data search query string. Example: [revenue] > 1000 [ship mode] = 'air'",
                                    type: 'string',
                                    deprecated: false,
                                },
                                formatType: {
                                    description:
                                        'The format of the data in the response.\n\nFULL: The response comes in "column":"value" format.\n\nCOMPACT: The response includes only the value of the columns.',
                                    default: 'COMPACT',
                                    type: 'string',
                                    enum: ['COMPACT', 'FULL'],
                                    deprecated: false,
                                },
                                nullableBoolType: {
                                    description:
                                        'This is an optional boolean type and is nullable',
                                    default: undefined,
                                    type: 'boolean',
                                    deprecated: false,
                                    nullable: true,
                                },
                            },
                            required: ['queryString', 'dataObjectId'],
                        },
                    },
                },
            },
            responses: {
                '200': {
                    content: {
                        'application/json': { schema: { type: 'object' } },
                    },
                },
                '500': {
                    description: 'Operation failed',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
            },
        });
        expect(
            spec.paths['/rest/v2/v2/data/search/{dataObjectId}'].post
                .requestBody.content['application/json'].schema.properties
                .dataObjectId,
        ).toBeUndefined();
    });
});
describe('should generate the correct Route map', () => {
    const schema = loadSchemaSync(join(__dirname, 'schema.graphql'), {
        loaders: [new GraphQLFileLoader()],
    });
    const { routeMap } = getOpenAPISpec({
        schema,
        info: {},
        basePath: '/rest/v2',
    });
    const map = routeMap as any;
    it('should convert link params from {} to :', () => {
        expect(map['Query.restapiV2__searchQueryData'].path).toBe(
            '/v2/data/search/:dataObjectId',
        );
    });

    it('should map correct response status', () => {
        expect(map['Query.restapiV2__updateUserInfo'].responseStatus).toBe(204);
        expect(map['Query.restapiV2__getSessionInfo'].responseStatus).toBe(200);
    });
});
