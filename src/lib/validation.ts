
export const isValidUrl = (url: string): boolean => {
    if (!url) return true; // Optional logic handled elsewhere
    try {
        // If it contains variable syntax ${...}, we can't fully validate, assume valid
        if (url.includes('${')) return true;
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const isValidDuration = (duration: string): boolean => {
    if (!duration) return true;
    if (duration.includes('${')) return true;
    return /^(\d+)(ms|s|m|h)$/.test(duration);
};

export const isValidVariableKey = (key: string): string | null => {
    if (!key) return "Key is required";
    if (/\s/.test(key)) return "No spaces allowed";
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return "Alphanumeric only (start with letter/_)";
    return null;
};

export const isValidnumber = (val: any): boolean => {
    if (val === '' || val === undefined) return true;
    return !isNaN(Number(val));
};
