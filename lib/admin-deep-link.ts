export const ADMIN_REQUEST_QUERY_PARAM =
  "adminRequest";

const ADMIN_REQUEST_ID_PATTERN =
  /^[A-Za-z0-9_-]{1,128}$/;

export function getAdminRequestIdFromSearch(
  search: string,
): string | null {
  const value = new URLSearchParams(search)
    .get(ADMIN_REQUEST_QUERY_PARAM)
    ?.trim();

  if (
    !value ||
    !ADMIN_REQUEST_ID_PATTERN.test(value)
  ) {
    return null;
  }

  return value;
}
