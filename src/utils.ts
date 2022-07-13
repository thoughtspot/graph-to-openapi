export function mapToPrimitive(type: string) {
    const formatMap: Record<string, any> = {
        Int: {
            type: 'integer',
            format: 'int32',
        },
        Float: {
            type: 'number',
            format: 'float',
        },
        String: {
            type: 'string',
        },
        Boolean: {
            type: 'boolean',
        },
        ID: {
            type: 'string',
        },
    };

    return formatMap[type];
}

export function mapToRef(type: string) {
    return `#/components/schemas/${type}`;
}
