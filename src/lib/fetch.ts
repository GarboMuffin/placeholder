export const fetchWithErrorHandling = async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    // Try to parse an extract error message from the response
    let error = 'unknown';
    try {
      const json = await response.json();
      if (json && typeof json.message === 'string') {
        error = json.message;
      }
    } catch (e) {
      // ignore
    }
    throw new Error(`HTTP status ${response.status} fetching ${response.url}: ${error}`);
  }
  return response;
};
