import { apiRequest } from "./queryClient";

export async function loginUser(username: string, password: string) {
  const response = await apiRequest("POST", "/api/auth/login", { username, password });
  return response.json();
}

export async function registerUser(formData: FormData) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Registration failed");
  }
  
  return response.json();
}

export function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authenticatedRequest(method: string, url: string, data?: any) {
  return apiRequest(method, url, data);
}
