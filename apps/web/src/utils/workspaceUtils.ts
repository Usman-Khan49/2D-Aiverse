const looksLikeUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export const parseWorkspaceInput = (raw: string) => {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const workspaceIndex = parts.findIndex(
      (part) => part.toLowerCase() === "workspaces",
    );

    if (workspaceIndex >= 0 && parts[workspaceIndex + 1]) {
      return { workspaceSlug: decodeURIComponent(parts[workspaceIndex + 1]) };
    }
  } catch {
    // not a URL
  }

  if (looksLikeUuid(value)) {
    return { workspaceId: value };
  }

  return { workspaceIdOrSlug: value };
};
