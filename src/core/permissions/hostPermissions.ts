const buildOriginPattern = (url: string): string => {
  const parsed = new URL(url);
  return `${parsed.origin}/*`;
};

const getPermissionsApi = (): chrome.permissions.Permissions | null => {
  if (typeof chrome === "undefined") {
    return null;
  }
  return chrome.permissions ?? null;
};

export const hasHostPermission = async (url: string): Promise<boolean> => {
  const permissions = getPermissionsApi();
  if (!permissions) {
    return true;
  }
  const origins = [buildOriginPattern(url)];
  return permissions.contains({ origins });
};

export const requestHostPermission = async (url: string): Promise<boolean> => {
  const permissions = getPermissionsApi();
  if (!permissions) {
    return true;
  }
  const origins = [buildOriginPattern(url)];
  return permissions.request({ origins });
};

export const ensureHostPermission = async (
  url: string,
  prompt = true
): Promise<boolean> => {
  const allowed = await hasHostPermission(url);
  if (allowed) {
    return true;
  }
  if (!prompt) {
    return false;
  }
  return requestHostPermission(url);
};
