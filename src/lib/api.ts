const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiClient = {
  async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as T;
  }
};
