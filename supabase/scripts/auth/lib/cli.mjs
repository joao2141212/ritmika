export const argValue = (name) => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? String(process.argv[index + 1] || '') : '';
};

export const hasFlag = (name) => process.argv.includes(name);

export const assertUuid = (value, label) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error(`${label}_must_be_uuid`);
    }
    return value;
};

export const parseBoolean = (value, label) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error(`${label}_must_be_true_or_false`);
};

export const csvValues = (value) => [...new Set(
    String(value || '').split(',').map((item) => item.trim()).filter(Boolean),
)];

export const printJson = (value) => {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};
